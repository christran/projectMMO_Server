const jsonfile = require('jsonfile');
const _ = require('lodash');

const Maps = {};

class Map {
	/**
     * @param {number} _id - Map ID
	 * @param {Object} map - Map Data from JSON file
     */
	constructor(_id, map) {
		this.mapID = _id;

		/** @type {{mapName: String, town: Number, returnMapID:}} */
		this.mapInfo = map.mapInfo;

		this.npcs = map.npcs;
		this.mobs = map.mobs;

		this.portals = map.portals;
	}


	/**
     * @param {number} portalID - Portal ID
	 * @return {{id: Number, toMapID: Number, toPortalName: String, position: { location: {x, y, z}, rotation: {x, y, z} } }} - Portal Data
     */
	getPortalByID(portalID) {
		return _.find(this.portals, { id: portalID });
	}

	/**
     * @param {string} portalName - Portal Name
	 * @return {{id: Number, toMapID: Number, toPortalName: String, position: { location: {x, y, z}, rotation: {x, y, z} } }} - Portal Data
     */
	getPortalByName(portalName) {
		return this.portals[portalName];
	}
}

module.exports = (io) => ({
	/**
	 * Gets map information
	 * @async
	 * @param {number} mapID A valid mapID
	 * @returns {Promise<Map>} Returns a promise: Map Object
	 */
	getMap: async (mapID) => {
		// Checks if is already map loaded into memory, if not add it.
		if (Object.prototype.hasOwnProperty.call(Maps, mapID)) {
			return Maps[mapID];
		}

		const mapData = await jsonfile.readFile(`game/maps/${mapID}.json`);

		Maps[mapID] = new Map(mapID, mapData);

		return Maps[mapID];
	},

	/**
	 * Gets all players in a map
	 * @param {number} mapID A valid mapID
	 * @return {Object} Returns the socket.character obj, keyed by character name
	 */
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
