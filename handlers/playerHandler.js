//Player Handler
//require('../helpers/player-helper');
fs = require('fs');

function getPlayerDataByName (name) {
	let playerObj = clients.find(searchFor => searchFor.name.toLowerCase() === name.toLowerCase());
	if (playerObj != undefined) {
		return playerObj;
	} else {
		return null;
	}
}

function getPlayerDataBySocket (socket) {
	let playerObj = clients.find(searchFor => searchFor.socket === socket);

	if (playerObj != undefined) {
		return playerObj;
	} else {
		return null;
	}
}

function saveCharacter (socket) {
	Character.getCharacter(socket.name, (err, character) => {
		// Save Stats


		// Save Translation/Rotation
		character.position.translation.x = socket.position.translation.x;
		character.position.translation.y = socket.position.translation.y;
		character.position.translation.z = socket.position.translation.z;

		character.position.rotation.x = socket.position.rotation.x;
		character.position.rotation.y = socket.position.rotation.y;
		character.position.rotation.z = socket.position.rotation.z;

		// Save mapID
		character.mapID = socket.mapID;
		character.save();
	});
}

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

				socket.name = playerData.name,
				socket.mapID = character.mapID;

				socket.join(character.mapID);
				socket.emit('changePlayerMap', response);

				let message = '[World Server] User: ' + playerData.name + ' | Map ID: ' + character.mapID + ' | Total Online: ' + clients.length;
				console.log(message);
		});
	});

	socket.on('player_UsePortal', (data, callback) => {		
		/*
		Data = Object
			portalName = String
			toMapId = Int
			toPortalName = String
		*/

		// Check if the Portal_Data sent from client matches what the Portal_Data stored on the server

		if (getPlayerDataBySocket(socket.id)) {
			// Get current map and leave the socket room
			socket.leave(getPlayerDataBySocket(socket.id).mapID);
			
			// Update Character Map ID in MongoDB
			// Send callback back to client with data such as all the players in the new map

			// Portal Data of the portal the player used
			portalData = JSON.parse(fs.readFileSync('game/maps/' + socket.mapID + '.json'))

			// Portal Data of the portal we want to go to
			toPortalData = JSON.parse(fs.readFileSync('game/maps/' + portalData.portals[data.portalName].toMapID + '.json'))

			let newTranslation = toPortalData.portals[portalData.portals[data.portalName].toPortalName].position.translation
			
			if (newTranslation) {
				let response = {
					mapID: portalData.portals[data.portalName].toMapID,
					// Get Portal Data (SpawnLocation) given toMapId/toPortalName

					position: {
						translation: { 
							x: newTranslation.x, 
							y: newTranslation.y, 
							z: newTranslation.z 
						},
						rotation: { 
							w: 0, 
							x: 0, 
							y: 0, 
							z: 0 
						},
					}
				}

				getPlayerDataBySocket(socket.id).mapID = portalData.portals[data.portalName].toMapID;
				socket.join(portalData.portals[data.portalName].toMapID);

				socket.mapID = portalData.portals[data.portalName].toMapID;
				socket.emit('changePlayerMap', response);
				console.log('[World Server] ' + getPlayerDataBySocket(socket.id).name + ' moved to Map: ' + toPortalData.mapInfo.mapName);
			}
		}
	});

	// Disconnect a player with given name
	socket.on('player_DC', function (data) {
		if (getPlayerDataByName(data.name)) {
			let playerSocketID = getPlayerDataByName(data.name).socket

			io.sockets.connected[playerSocketID].disconnect();
			console.log('[World Server] ' + data.name + ' was dced by GM');
		} else {
			console.log('[World Server] Can\'t find player: ' + data.name);
		}

	});

	// Log Player Disconnection
	socket.on('disconnect', function () {
		// Save Player Data to Database on Log Out
		saveCharacter(socket);
/* 		Character.getCharacter(socket.name, (err, character) => {

			// Save Translation
			character.position.translation.x = socket.position.translation.x;
			character.position.translation.y = socket.position.translation.y;
			character.position.translation.z = socket.position.translation.z;

			// Save Rotation
			character.position.rotation.x = socket.position.rotation.x;
			character.position.rotation.y = socket.position.rotation.y;
			character.position.rotation.z = socket.position.rotation.z;

			// Save mapID
			character.mapID = socket.mapID;
			character.save();
		}); */

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