import _ from 'lodash';

export default (io, world) => ({
	checkIfAlreadySpawned: async (_id) => {
		return new Promise((resolve, reject) => {
			if (Object.keys(world).length === 0) {
				resolve();
			} else {
				Object.keys(world).forEach((mapID) => {
					if (_.findIndex(world[mapID].characters, { _id }) > -1) {
						reject();
					}
					resolve();
				});
			}
		});
	},

	// getSocketByCharID: (_id) => {
	// 	const character = _.find(clients, (client) => client._id === _id);

	// 	if (character) {
	// 		return io.of('/').connected[character.socketID];
	// 	}
	// 	return null;
	// },
});
