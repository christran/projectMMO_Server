const fs = require('fs');
const path = require('path');
const jsonfile = require('jsonfile');
// const chalk = require('chalk');
const _ = require('lodash');

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
	loadMaps: async () => {
		const getMaps = fs.readdirSync(path.join(__dirname, '../../game/maps'));
		const allMapsInArray = [];

		// eslint-disable-next-line no-restricted-syntax
		for (const map of getMaps) {
			const mapID = map.replace(/\.[^.]*$/, '');
			// eslint-disable-next-line no-await-in-loop
			const mapData = await jsonfile.readFile(`game/maps/${map}`);

			allMapsInArray.push(new Map(parseInt(mapID, 10), mapData));
		}

		return allMapsInArray;
	},

	/**
	 * Gets map information
	 * @async
	 * @param {number} mapID A valid mapID
	 * @returns {Promise<Map>} Returns a promise: Map Object
	 */
	getMap: async (mapID) => {
		return _.find(global.loadedMaps, { mapID });
	},

	/**
	 * Gets all players in a map
	 * @param {number} mapID A valid mapID
	 * @return {Object} Returns the socket.character obj, keyed by character name
	 */
	getAllPlayersInMap: (mapID) => {
		const playersInMap = [];

		if (io.sockets.adapter.rooms.get(mapID)) {
			const socketsinMap = [];

			io.sockets.adapter.rooms.get(mapID).forEach((socketID) => {
				socketsinMap.push(socketID);
			});

			socketsinMap.forEach((socketID) => {
				playersInMap.push(
					io.sockets.sockets.get(socketID).character
				);
			});
		} else {
			console.log(`Map: ${mapID} is empty`);
		}

		return _.keyBy(playersInMap, 'name');
	},

	getActiveMaps: () => {
		const arr = Array.from(io.sockets.adapter.rooms);
		const filtered = arr.filter((room) => !room[1].has(room[0]));

		const res = filtered.map((i) => i[0]);
		return res;
	}
});
