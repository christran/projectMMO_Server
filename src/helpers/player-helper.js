const _ = require('lodash');

module.exports = function () {
	return {
		getSocketByName: function(name) {
			let player = _.find(clients, () => {
				return name.toLowerCase() === name.toLowerCase();
			});

			if (player) {
				return io.sockets.connected[player.socketID];
			} else {
				return null;
			}
		},

		getSocketID: function(socketID) {		
			let playerObj = _.find(clients, { 'socketID': socketID });

			if (playerObj != undefined) {
				return playerObj;
			} else {
				return null;
			}
		},
	};
};
