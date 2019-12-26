const _ = require('lodash');

module.exports = {
	getSocketByName: function (name) {
		let player = _.find(clients, () => {
			return name.toLowerCase() === name.toLowerCase();
		});

		if (player) {
			return io.sockets.connected[player.socketID];
		} else {
			return null;
		}
	},

	getSocketID: function (socketID) {		
		let playerObj = _.find(clients, { 'socketID': socketID });

		if (playerObj != undefined) {
			return playerObj;
		} else {
			return null;
		}
	},

	// Move this into another file
	getAllPlayersInMap: function (mapID) {
		if ((io.sockets.adapter.rooms[mapID])) {
		let socketsinMap = [];

		for (let socketID in io.sockets.adapter.rooms[mapID].sockets) {
			socketsinMap.push(socketID);
		}

		playersInMap = [];

		socketsinMap.forEach(socketID => {
			playersInMap.push({
					[io.sockets.connected[socketID].character.name]: io.sockets.connected[socketID].character
			}); 
		});

		return playersInMap;
		
		//console.log(_.find(playersInMap, 'Tiger'));

		} else {
			console.log(`Map: ${mapID} is empty`);
		}
	}
};
