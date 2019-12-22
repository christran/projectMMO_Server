//Player Handler
const Player = require('../helpers/player-helper');

module.exports = function(socket, io, clients) {
    // Client currently only sends movement when the player's velocity > 0
    socket.on('movementUpdate', function (position) {
 		// Check if player fell off the map
		if (position.location.z < -10000) {
			socket.emit('player_ZLimit');
		}

		socket.position = {
			location: {
				x: position.location.x,
				y: position.location.y,
				z: position.location.z
			},
			rotation: {
				roll: position.rotation.roll,
				pitch: position.rotation.pitch,
				yaw: position.rotation.yaw
			} 
		};
	});
	
	// When a plyer enters a map (GameInstance_MMO) will emit this event
	socket.on('getAllPlayersInMap', (data, callback) => {
		// Send client any other players in the map
		if (io.sockets.adapter.rooms[socket.mapID]) {
			let socketsinMap = [];

			for (var socketID in io.sockets.adapter.rooms[socket.mapID].sockets) {
				socketsinMap.push(socketID);
			}

			playersInMap = [];

			socketsinMap.forEach(socketID => {
				playersInMap.push(
					{
						playerName: io.sockets.connected[socketID].name,
						position: io.sockets.connected[socketID].position
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
	socket.on('spawnPlayer', function(playerData) {
		// Get Character MapID and Transform from DB
		Character.getCharacter(playerData.name, (err, character) => {
				clients.push(
					{
						name: playerData.name,
						socket: socket.id,
						mapID: character.mapID
					}
				);
				
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

				// Update socket properties
				socket.name = playerData.name;
				socket.accountID = character.accountID;
				socket.mapID = character.mapID;

				socket.position = {
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
				};

				// Add player to map and spawn them in the map
				socket.join(character.mapID);
				socket.emit('changePlayerMap', response);

				// Send to other players in the map
				socket.to(character.mapID).emit('addPlayerToMap', {
					[socket.name]: {
						position: socket.position
					}
				});

				let message = '[World Server] User: ' + playerData.name + ' | Map ID: ' + character.mapID + ' | Total Online: ' + clients.length;
				console.log(message);
		});
	});

	socket.on('player_UsePortal', (data, callback) => {
		/*
		Portal Data Validation with @hapi/joi
		make sure the user doesn't send something like a  string
		Data = Object
			portalName = String
		*/
		let currentPortal = Maps[socket.mapID].portals[data.portalName];

		// Check if the portal exists in the current player map
		if (currentPortal) {
			let targetPortal = Maps[currentPortal.toMapID];

			if (socket.mapID) {
				// Tell all players in the map to remove the player that disconnected.
				socket.to(socket.mapID).emit('removePlayerFromMap', {
					playerName: socket.name
				});

				// Get current map and leave the socket room
				socket.leave(socket.mapID);
	
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
								[io.sockets.connected[socketID].name]: {
									position: io.sockets.connected[socketID].position
								}
							});
						}
					} else {
						// No other players in the map, don't do anything
						// console.log('No other players in map to know about');
					}

					Player.getPlayerDataBySocket(socket.id).mapID = currentPortal.toMapID;
					socket.join(currentPortal.toMapID);
	
					socket.position = {
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
					socket.mapID = currentPortal.toMapID;
					socket.emit('changePlayerMap', response);
					
					Player.saveCharacter(socket);

					// Send to other players in the map
					socket.to(socket.mapID).emit('addPlayerToMap', {
						[socket.name]: {
							position: socket.position
						}
					});

					console.log('[World Server] ' + socket.name + ' moved to Map: ' + targetPortal.mapInfo.mapName);
				}
			} else {
				console.log('[World Server] Player: ' + socket.name + ' doesn\'t have a mapID');
			}
		} else {
			console.log('[World Server] ' + socket.name + ' tried using Portal: ' + data.portalName + ' from Map ID: ' + socket.mapID);
		}
	});

	// Disconnect a player with given name
	socket.on('player_DC', function (data) {
		if (Player.getPlayerDataByName(data.name)) {
			let playerSocketID = Player.getPlayerDataByName(data.name).socket;

			io.sockets.connected[playerSocketID].disconnect();
			console.log('[World Server] ' + data.name + ' was dced by GM');
		} else {
			console.log('[World Server] Can\'t find player: ' + data.name);
		}

	});

	// Log Player Disconnection
	socket.on('disconnect', function () {
		// Save Character Data to Database on Disconnection
		Player.saveCharacter(socket);

		// isOnline = false
		Account.getAccountByID(socket.accountID, (err, account) => {
			account.isOnline = false;
			account.save();
		});

		// Tell all players in the map to remove the player that disconnected.
		socket.to(socket.mapID).emit('removePlayerFromMap', {
			playerName: socket.name
		});

		let message = '[World Server] User: ' + socket.name + ' disconnected | Total Online: ' + clients.length;

		socketIndex = clients.findIndex(item => item.socket === socket.id);
		clients.splice(socketIndex, 1);

		io.emit('chat', message);
		console.log(message);
	});

};