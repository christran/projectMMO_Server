const _ = require('lodash');

module.exports = function (io, clients) {
	return {
		getSocketByName: function(name) {
			let player = _.find(clients, (client) => client.name.toLowerCase() === name.toLowerCase());

			if (player) {
				return io.of("/").connected[player.socketID];
			} else {
				return null;
			}
		},

		getSocketID: function(socketID) {		
			let player = _.find(clients, { 'socketID': socketID });

			if (player) {
				return player;
			} else {
				return null;
			}
		},
	};
};
