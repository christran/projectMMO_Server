//Player Handler
//require('../helpers/player-helper');

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

module.exports = function(socket, io, clients) {
    // Movement
    socket.on('movementUpdate', function (transform) {
		console.log(socket.name + ' \n ' + JSON.stringify(transform));
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
			
			getPlayerDataBySocket(socket.id).mapID = data.toMapId;
			socket.join(data.toMapId);
			// Update Character Map ID in MongoDB
			// Send callback back to client with data such as all the players in the new map
			let response = {
				mapID: data.toMapId,
				position: {
					translation: { x: 0, y: 1000, z: 0 },
					rotation: { w: 0, x: 0, y: 0, z: 0 },

				}
			}
			socket.emit('changePlayerMap', response);
			console.log('[World Server] ' + getPlayerDataBySocket(socket.id).name + ' moved to ' + data.toMapId);
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
		// Client sends back playerData on Log Out
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