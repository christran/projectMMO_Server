//Player Handler
const Player = require('../helpers/player-helper');
const sizeof = require('object-sizeof');
const _ = require('lodash');

let totalRecv = 0;

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = function(socket, io, clients, tick) {
    socket.on('player_Movement', function (position) {
 		// Check if player fell off the map
		if (position.location.z < -10000) {
			socket.emit('player_ZLimit');
		}

		switch(position.direction) {
			case 'Left':
				socket.character.position.location.y = position.location.y - position.velocity * position.deltaTime;
				socket.character.position.rotation.yaw = _.clamp(position.rotation.yaw - 1000.0 * position.deltaTime, -90, 90);
				socket.character.position.location.z = position.location.z;
				break;
			case 'Right':
				socket.character.position.location.y = position.location.y + position.velocity * position.deltaTime;
				socket.character.position.rotation.yaw = _.clamp(position.rotation.yaw + 1000.0 * position.deltaTime, -90, 90);
				socket.character.position.location.z = position.location.z;
				break;
			case 'Up':
				socket.character.position.location.x = position.location.x + position.velocity * position.deltaTime;
				socket.character.position.rotation.yaw = _.clamp(position.rotation.yaw + 1000.0 * position.deltaTime, -180, 180);
				socket.character.position.location.z = position.location.z;
				break;
			case 'Down':
				socket.character.position.location.x = position.location.x - position.velocity * position.deltaTime;
				socket.character.position.rotation.yaw = _.clamp(position.rotation.yaw - 1000.0 * position.deltaTime, -180, 180);
				socket.character.position.location.z = position.location.z;
				break;

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
	socket.on('spawnPlayer', function(playerData) {
		// Get Character MapID and Transform from DB
		Character.getCharacter(playerData.name, (err, character) => {
				socket.character = character;
				clients.push(
					{
						name: character.name,
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

				console.log(`[World Server] User: ${playerData.name} | Map ID: ${character.mapID} | Total Online: ${clients.length}`);
		});
	});

	socket.on('player_UsePortal', (data, callback) => {
		/*
		Portal Data Validation with @hapi/joi
		make sure the user doesn't send something like a  string
		Data = Object
			portalName = String
		*/
		let currentPortal = Maps[socket.character.mapID].portals[data.portalName];
		
		// Check if the portal exists in the current player map
		if (currentPortal) {
			let targetPortal = Maps[currentPortal.toMapID];

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

					Player.getPlayerDataBySocket(socket.id).mapID = currentPortal.toMapID;
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
					
					Player.saveCharacter(socket);

					// Send to other players in the map
					socket.to(socket.character.mapID).emit('addPlayerToMap', {
						[socket.character.name]: {
							position: socket.character.position
						}
					});

					console.log(`[World Server] ${socket.character.name} moved to Map: ${targetPortal.mapInfo.mapName}`);
				}
			} else {
				console.log(`[World Server] Player: ${socket.character.name} doesn\'t have a mapID`);
			}
		} else {
			console.log(`[World Server] ${socket.character.name} tried using Portal: ${data.portalName} from Map ID: ${socket.character.mapID}`);
		}
	});

	// Disconnect a player with given name
	socket.on('player_DC', function (data) {
		if (Player.getPlayerDataByName(data.name)) {
			let playerSocketID = Player.getPlayerDataByName(data.name).socket;

			io.sockets.connected[playerSocketID].disconnect();
			console.log(`[World Server] ${data.name} was dced by GM`);
		} else {
			console.log(`[World Server] Can\'t find player:  + ${data.name}`);
		}

	});

	// Log Player Disconnection
	socket.on('disconnect', function () {
		// Save Character Data to Database on Disconnection
		if (socket.character) {
			Player.saveCharacter(socket);

			// isOnline = false
			Account.getAccountByID(socket.character.accountID, (err, account) => {
				account.isOnline = false;
				account.save();
			});

			// Tell all players in the map to remove the player that disconnected.
			socket.to(socket.character.mapID).emit('removePlayerFromMap', {
				playerName: socket.character.name
			});
		}

		socketIndex = clients.findIndex(item => item.socket === socket.id);
		clients.splice(socketIndex, 1);
		
		console.log(`[World Server] User: ${socket.character.name} disconnected | Total Online: ${clients.length}`);
	});

};