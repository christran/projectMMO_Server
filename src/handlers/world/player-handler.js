const _ = require('lodash');

const Account = require('../../../src/models/Account');
const Character = require('../../../src/models/Character');

module.exports = (io, socket, clients, delta, tick) => {
	const Player = require('../../helpers/player-helper')(io, clients);
	const Map = require('../../world/Map')(io);

	socket.on('player_Movement', (data) => {
		if (data.movementSnapshot) {
			const snapshotArray = data.movementSnapshot;

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
				const rotationSpeed = 1000.0;

				// Check if player fell off the map
				if (snapshot.location.z < -10000) {
					socket.emit('player_ZLimit');
				} else {
					const charPos = socket.character.position;

					switch (snapshot.direction) {
					case 'Left':
						charPos.location.y = snapshot.location.y - snapshot.velocity * snapshot.deltaTime;
						charPos.rotation.yaw = _.clamp(snapshot.rotation.yaw - rotationSpeed * snapshot.deltaTime, -90, 90);
						charPos.location.z = snapshot.location.z;
						break;
					case 'Right':
						charPos.location.y = snapshot.location.y + snapshot.velocity * snapshot.deltaTime;
						charPos.rotation.yaw = _.clamp(snapshot.rotation.yaw + rotationSpeed * snapshot.deltaTime, -90, 90);
						charPos.location.z = snapshot.location.z;
						break;
					case 'Up':
						charPos.location.x = snapshot.location.x + snapshot.velocity * snapshot.deltaTime;
						charPos.rotation.yaw = _.clamp(snapshot.rotation.yaw + rotationSpeed * snapshot.deltaTime, -180, 180);
						charPos.location.z = snapshot.location.z;
						break;
					case 'Down':
						charPos.location.x = snapshot.location.x - snapshot.velocity * snapshot.deltaTime;
						charPos.rotation.yaw = _.clamp(snapshot.rotation.yaw - rotationSpeed * snapshot.deltaTime, -180, 180);
						charPos.location.z = snapshot.location.z;
						break;
					default:
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
		if (Map.getAllPlayersInMap(socket.character.mapID)) {
			const playersInMap = [];

			const players = Map.getAllPlayersInMap(socket.character.mapID);

			_.forOwn(players, (value, key) => {
				playersInMap.push({
					playerName: players[key].name,
					position: players[key].position
				});
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

					const response = {
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
			socket.emit('dc', 'Stop hacking');// console.log(`[Player Handler] spawnPlayer | Trying to spawn a character (${data.name}) that is already spawned.`);
		}
	});

	socket.on('player_UsePortal', async (data) => {
		const currentMap = await Map.getMap(socket.character.mapID).catch((err) => console.log(`[Player Handler] player_UsePortal | ${err}`));

		if (currentMap) {
			const currentPortal = currentMap.getPortalByName(data.portalName);

			const targetPortal = await Map.getMap(currentPortal.toMapID).catch((err) => console.log(`[Player Handler] player_UsePortal | ${err}`));

			if (socket.character.mapID) {
				// Tell all players in the map to remove the player that disconnected.
				socket.to(socket.character.mapID).emit('removePlayerFromMap', {
					playerName: socket.character.name,
				});

				// Get current map and leave the socket room
				socket.leave(socket.character.mapID);

				// Update Character Map ID in MongoDB
				// Send callback back to client with data such as all the players in the new map

				const newPosition = targetPortal.portals[currentPortal.toPortalName].position;

				if (newPosition) {
					const response = {
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
				console.log(`[World Server] Player: ${socket.character.name} doesn't have a mapID`);
			}
		}
	});

	// Disconnect a player with given name
	socket.on('player_DC', (data) => {
		if (Player.getSocketByName(data.name)) {
			const player = Player.getSocketByName(data.name);

			io.to(`${player.id}`).emit('dc', 'D/Ced by a GM');
			console.log(`[World Server] ${player.character.name} was dced by a GM`);
		} else {
			console.log(`[World Server] Can't find player: ${data.name}`);
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

			const socketIndex = clients.findIndex((item) => item.socket === socket.id);
			clients.splice(socketIndex, 1);

			console.log(`[World Server] User: ${socket.character.name} logged off`);
		} else {
			console.log(`[World Server] IP: ${socket.handshake.address} disconnected | Reason: ${socket.dcReason}`);
		}
	});
};
