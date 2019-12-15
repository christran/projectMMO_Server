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
    socket.on('movementUpdate', function (vector) {
		console.log('[Current Location] Player: ' + vector['user'] + ' X: ' + vector['x'] + ' Y: ' + vector['y'] + ' Z: ' + vector['z'] + ' Index 0: ' + vector.testArray[0]);
	});

	// Add Player to Map
	socket.on('addPlayer2Map', function(playerData) {
		clients.push(
			{
				name: playerData.name,
				socket: socket.id,
				mapID: playerData.mapID
			}
		);
		
		socket.join(playerData.mapID);
		socket.mapID = playerData.mapID;
		let message = '[World Server] User: ' + playerData.name + ' | Map ID: ' + playerData.mapID + ' | Total Online: ' + clients.length;
		console.log(message);
	});

	socket.on('player_ChangeMap', (data) => {		
		if (getPlayerDataByName(data.name)) {
			getPlayerDataByName(data.name).mapID = data.mapID;
			// Update Character Map ID in MongoDB
			// Send callback back to client with data such as all the players in the new map

			console.log('[World Server] ' + data.name + ' moved to ' + data.mapID);
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
		let message = '[World Server] User: ' + getPlayerDataBySocket(socket.id).name + ' disconnected | Total Online: ' + clients.length;

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