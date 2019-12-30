const _ = require('lodash');

module.exports = (io, clients) => ({
	getSocketByName: (name) => {
		const player = _.find(clients, (client) => client.name.toLowerCase() === name.toLowerCase());

		if (player) {
			return io.of('/').connected[player.socketID];
		}
		return null;
	},

	getSocketID: (socketID) => {
		const player = _.find(clients, { socketID });

		if (player) {
			return player;
		}
		return null;
	},
});
