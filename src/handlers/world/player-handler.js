const _ = require('lodash');

module.exports = function(io, socket, clients, delta, tick) {
	const Player = require('../../helpers/player-helper')(io, clients);
	const Map = require('../../world/Map')(io);

    socket.on('player_Movement', (data) => {
		if (data.movementSnapshot) {
			let snapshotArray = data.movementSnapshot;

			snapshotArray.forEach((snapshot) => {
				
				// Check if player's velocity is > than the max walk speed + any speed enhancing skills
				if (Math.round(snapshot.velocity) > 4089) {
					console.log(`[Anticheat] ${socket.character.name} | Speed Hacking | Current Velocity: ${Math.round(snapshot.velocity)}`);
					// socket.disconnect();
					// socket.emit('dc', 'Stop hacking');
				}

				if (snapshot.deltaTime > delta) {
					console.log(`[Anticheat] ${socket.character.name} | Speed Hacking | Client Delta Time: ${snapshot.deltaTime} > ${delta}`);
					// socket.emit('dc', 'Stop hacking');
				}

				// Set to the same as what the client has UE4 (BP_Character)
				let rotationSpeed = 1000.0;

				// Check if player fell off the map
				if (snapshot.location.z < -10000) {
					socket.emit('player_ZLimit');
				} else {
					switch(snapshot.direction) {
						case 'Left':
							socket.character.position.location.y = snapshot.location.y - snapshot.velocity * snapshot.deltaTime;
							socket.character.position.rotation.yaw = _.clamp(snapshot.rotation.yaw - rotationSpeed * snapshot.deltaTime, -90, 90);
							socket.character.position.location.z = snapshot.location.z;
							break;
						case 'Right':
							socket.character.position.location.y = snapshot.location.y + snapshot.velocity * snapshot.deltaTime;
							socket.character.position.rotation.yaw = _.clamp(snapshot.rotation.yaw + rotationSpeed * snapshot.deltaTime, -90, 90);
							socket.character.position.location.z = snapshot.location.z;
							break;
						case 'Up':
							socket.character.position.location.x = snapshot.location.x + snapshot.velocity * snapshot.deltaTime;
							socket.character.position.rotation.yaw = _.clamp(snapshot.rotation.yaw + rotationSpeed * snapshot.deltaTime, -180, 180);
							socket.character.position.location.z = snapshot.location.z;
							break;
						case 'Down':
							socket.character.position.location.x = snapshot.location.x - snapshot.velocity * snapshot.deltaTime;
							socket.character.position.rotation.yaw = _.clamp(snapshot.rotation.yaw - rotationSpeed * snapshot.deltaTime, -180, 180);
							socket.character.position.location.z = snapshot.location.z;
							break;
					}
				}
			});
		}

		// console.log(formatBytes(totalRecv));
	});
	
	// When a plyer enters a map (GameInstance_MMO) will emit this event
	socket.on('getAllPlayersInMap', (data, callback) => {
		// Send client any other players in the map
		if (io.sockets.adapter.rooms[socket.character.mapID]) {
			let socketsinMap = [];

			for (let socketID in io.sockets.adapter.rooms[socket.character.mapID].sockets) {
				socketsinMap.push(socketID);
			}

			playersInMap = [];

			socketsinMap.forEach(socketID => {
				playersInMap.push(
					{
						playerName: io.sockets.connected[socketID].character.name,
						position: io.sockets.connected[socketID].character.position
					}
				); 
			});
			
			callback(playersInMap);
		} else {
			// No other players in the map, don't do anything
			// console.log('No other players in map to know about');
		}
	});

	// Spawn Player after they select a character
	socket.on('spawnPlayer', (data) => {
		if (_.findIndex(clients, { name: data.name })) {
			Character.getCharacter(data.name)
			.then((character) => {
				socket.character = character;

				clients.push({ 
					name: character.name,
					socketID: socket.id
				});
		
				let response = {
					mapID: character.mapID,
					position: {
						location: {
							x: character.position.location.x,
							y: character.position.location.y,
							z: character.position.location.z
						},
						rotation: {
							roll: character.position.rotation.roll,
							pitch: character.position.rotation.pitch,
							yaw: character.position.rotation.yaw
						}
					}
				};

				// Add player to map and spawn them in the map
				socket.join(character.mapID);
				
				// Send client the current tick of the server
				socket.emit('setCurrentTick', tick);
				socket.emit('changePlayerMap', response);

				// Send to other players in the map
				socket.to(character.mapID).emit('addPlayerToMap', {
					[socket.character.name]: {
						position: socket.character.position
					}
				});

				console.log(`[World Server] User: ${character.name} | Map ID: ${character.mapID} | Total Online: ${clients.length}`);	
			})
			.catch((err) => {
				console.log(`[Player Handler] spawnPlayer | Error: ${err}`);
			});
		} else {
			// If pawn is already spawned/possessed
			socket.dcReason = `[Player Handler] spawnPlayer | Trying to spawn a character (${data.name}) that is already spawned.`;
			socket.emit('dc', 'Stop hacking');

			// console.log(`[Player Handler] spawnPlayer | Trying to spawn a character (${data.name}) that is already spawned.`);
		}
	});

	socket.on('player_UsePortal', async (data, callback) => {
		let currentMap = await Map.getMap(socket.character.mapID).catch((err) => console.log(`[Player Handler] player_UsePortal | ${err}`));

		if (currentMap) {
			let currentPortal = currentMap.getPortalByName(data.portalName);
			
			let targetPortal = await Map.getMap(currentPortal.toMapID).catch((err) => console.log(`[Player Handler] player_UsePortal | ${err}`));;

			if (socket.character.mapID) {
				// Tell all players in the map to remove the player that disconnected.
				socket.to(socket.character.mapID).emit('removePlayerFromMap', {
					playerName: socket.character.name
				});

				// Get current map and leave the socket room
				socket.leave(socket.character.mapID);

				// Update Character Map ID in MongoDB
				// Send callback back to client with data such as all the players in the new map

				let newPosition = targetPortal.portals[currentPortal.toPortalName].position;
				
				if (newPosition) {
					let response = {
						mapID: currentPortal.toMapID,
						portal: true,
						// Get Portal Data (SpawnLocation) given toMapId/toPortalName

						position: {
							location: { 
								x: newPosition.location.x, 
								y: newPosition.location.y, 
								z: newPosition.location.z 
							},
							rotation: { 
								roll: newPosition.rotation.roll, 
								pitch: newPosition.rotation.pitch, 
								yaw: newPosition.rotation.yaw 
							}
						}
					};

					// Send client any other players in the map
					if (io.nsps['/'].adapter.rooms[currentPortal.toMapID]) {
						for (let socketID in io.nsps['/'].adapter.rooms[currentPortal.toMapID].sockets) {
							socket.emit('addPlayerToMap', {
								[io.sockets.connected[socketID].character.name]: {
									position: io.sockets.connected[socketID].character.position
								}
							});
						}
					} else {
						// No other players in the map, don't do anything
						// console.log('No other players in map to know about');
					}
					socket.join(currentPortal.toMapID);

					socket.character.position = {
						location: { 
							x: newPosition.location.x, 
							y: newPosition.location.y, 
							z: newPosition.location.z 
						},
						rotation: { 
							roll: newPosition.rotation.roll, 
							pitch: newPosition.rotation.pitch, 
							yaw: newPosition.rotation.yaw 
						}
					};
					socket.character.mapID = currentPortal.toMapID;
					socket.emit('changePlayerMap', response);
					
					Character.saveCharacter(socket);

					// Send to other players in the map
					socket.to(socket.character.mapID).emit('addPlayerToMap', {
						[socket.character.name]: {
							position: socket.character.position
						}
					});

					console.log(`[World Server] ${socket.character.name} moved to Map: ${targetPortal.mapName}`);
				}
			} else {
				console.log(`[World Server] Player: ${socket.character.name} doesn\'t have a mapID`);
			}
		}
	});

	// Disconnect a player with given name
	socket.on('player_DC', (data) => {
		if (Player.getSocketByName(data.name)) {
			let player = Player.getSocketByName(data.name);
			
			io.to(`${player.id}`).emit('dc', 'D/Ced by a GM');
			console.log(`[World Server] ${player.character.name} was dced by a GM`);
		} else {
			console.log(`[World Server] Can\'t find player: ${data.name}`);
		}

	});

	// Player Disconnection
	socket.on('disconnect', () => {
		// Save Character Data to Database on disconnection
		if (socket.character) {
			Character.saveCharacter(socket);

			// isOnline = false
			Account.getAccountByID(socket.character.accountID, (err, account) => {
				account.isOnline = false;
				account.save();
			});

			// Tell all players in the map to remove the player that disconnected.
			socket.to(socket.character.mapID).emit('removePlayerFromMap', {
				playerName: socket.character.name
			});

			socketIndex = clients.findIndex(item => item.socket === socket.id);
			clients.splice(socketIndex, 1);

			console.log(`[World Server] User: ${socket.character.name} logged off`);
		} else {
			console.log(`[World Server] IP: ${socket.handshake.address} disconnected | Reason: ${socket.dcReason}`);
		}
	});

};