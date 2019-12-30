const jsonfile = require('jsonfile');
const _ = require('lodash');

const Maps = {};

class Map {
	constructor(_id, map) {
		this.mapID = _id;
		this.mapName = map.mapInfo.mapName;
		this.town = map.mapInfo.town;
		this.returnMapID = map.mapInfo.returnMapID;

		this.npcs = map.npcs;
		this.mobs = map.mobs;

		this.portals = map.portals;
	}


	// Portals
	getPortalByID(portalID) {
		return _.find(this.portals, { id: portalID });
	}

	getPortalByName(portalName) {
		return this.portals[portalName];
	}
}

module.exports = (io) => ({
	// Checks if is already map loaded into memory, if not add it.
	getMap: async (mapID) => {
		if (Object.prototype.hasOwnProperty.call(Maps, mapID)) {
			return Maps[mapID];
		}

		const mapData = await jsonfile.readFile(`game/maps/${mapID}.json`);

		Maps[mapID] = new Map(mapID, mapData);

		return Maps[mapID];
	},

	getAllPlayersInMap: (mapID) => {
		const playersInMap = [];

		if ((io.sockets.adapter.rooms[mapID])) {
			const socketsinMap = [];

			Object.keys(io.sockets.adapter.rooms[mapID].sockets).forEach((socketID) => {
				socketsinMap.push(socketID);
			});

			socketsinMap.forEach((socketID) => {
				playersInMap.push(
					io.sockets.connected[socketID].character
				);
			});
		} else {
			console.log(`Map: ${mapID} is empty`);
		}
		// console.log(_.find(playersInMap, 'Tiger'));

		return _.keyBy(playersInMap, 'name');
	}
});
