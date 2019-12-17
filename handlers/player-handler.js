//Player Handler
const Player = require('../helpers/player-helper');
const jsonfile = require('jsonfile');

module.exports = function(socket, io, clients) {
    // Movement
    socket.on('movementUpdate', function (transform) {
		//console.log(socket.name + ' \n ' + JSON.stringify(transform));
		//console.log(transform.translation.x)
		socket.position = {
			translation: {
				x: transform.translation.x,
				y: transform.translation.y,
				z: transform.translation.z
			},
			rotation: {
				x: transform.rotation.x,
				y: transform.rotation.y,
				z: transform.rotation.z
			}
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
						translation: { 
							x: character.position.translation.x, 
							y: character.position.translation.y, 
							z: character.position.translation.z 
						},
						rotation: { 
							x: character.position.rotation.x, 
							y: character.position.rotation.y, 
							z: character.position.rotation.z 
						}
					}
				}

				// Update socket properties
				socket.name = playerData.name,
				socket.mapID = character.mapID;

				socket.position = {
					translation: {
						x: character.position.translation.x,
						y: character.position.translation.y,
						z: character.position.translation.z
					},
					rotation: {
						x: character.position.rotation.x, 
						y: character.position.rotation.y, 
						z: character.position.rotation.z 
					}
				}

				socket.join(character.mapID);
				socket.emit('changePlayerMap', response);

				let message = '[World Server] User: ' + playerData.name + ' | Map ID: ' + character.mapID + ' | Total Online: ' + clients.length;
				console.log(message);
		});
	});

	socket.on('player_UsePortal', (data, callback) => {
		/*
		Portal Data Validation with @hapi/joi
		Data = Object
			portalName = String
		*/
		let currentPortal = Maps[socket.mapID].portals[data.portalName];

		if (currentPortal) {
			let targetPortal = Maps[currentPortal.toMapID];

			if (socket.mapID) {
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
							translation: { 
								x: newPosition.translation.x, 
								y: newPosition.translation.y, 
								z: newPosition.translation.z 
							},
							rotation: { 
								x: newPosition.rotation.x, 
								y: newPosition.rotation.y, 
								z: newPosition.rotation.z 
							},
						}
					}
	
					Player.getPlayerDataBySocket(socket.id).mapID = currentPortal.toMapID;
					socket.join(currentPortal.toMapID);
	
					socket.mapID = currentPortal.toMapID;
					socket.emit('changePlayerMap', response);
					console.log('[World Server] ' + socket.name + ' moved to Map: ' + targetPortal.mapInfo.mapName);
				}
			} else {
				console.log('[World Server] Player: ' + socket.name + ' doesn\'t have a mapID');
			}
		} else {
			console.log('[World Server] ' + socket.name + ' tried using ' + data.portalName + ' from ' + socket.mapID);
		}
	});

	// Disconnect a player with given name
	socket.on('player_DC', function (data) {
		if (Player.getPlayerDataByName(data.name)) {
			let playerSocketID = Player.getPlayerDataByName(data.name).socket

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

		let message = '[World Server] User: ' + socket.name + ' disconnected | Total Online: ' + clients.length;

		socketIndex = clients.findIndex(item => item.socket === socket.id);
		clients.splice(socketIndex, 1);

		io.emit('chat', message);
		console.log(message);
	});
	
    // Get Player Mesos
    socket.on('getPlayerMesos', (user, callback) => {
		let playerMesos = 1000000

		callback(playerMesos);
		console.log('[Server] ' + user + ' has ' + playerMesos + ' mesos');
	});
}