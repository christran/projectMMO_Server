import _ from 'lodash';

export default (io, clients) => ({
	/**
	 * Gets a character's socket object given their name.
	 * @param {string} name The character's name
	 * @return {Object} Returns an socket object.
	 */
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
