import jsonfile from 'jsonfile';
import chalk from 'chalk';
import _ from 'lodash';

import Item from '../models/Item.js';

class Map {
	/**
     * @param {number} _id - Map ID
	 * @param {Object} map - Map Data from JSON file
     */
	constructor(_id, map) {
		this.mapID = _id;

		/** @type {{mapName: String, town: Number, returnMapID:}} */
		this.mapInfo = map.mapInfo;

		this.characters = [];
		this.characterStates = [];
		this.itemsOnTheGround = [];

		this.npcs = []; // should be an array of npc objects
		this.mobs = [];

		this.portals = map.portals; // should be an array of portal objects

		this.inactivity = 0;
	}
}

export default (io, world) => {
	const MapFactory = {
		// eslint-disable-next-line consistent-return
		loadMap: async (mapID) => {
			try {
				const myMap = await jsonfile.readFile(`game/maps/${mapID}.json`);

				world[mapID] = new Map(mapID, myMap);
				console.log(chalk.green('Loaded Map ID:', mapID));
				return world[mapID];
			} catch (err) {
				console.log(err);
			}
		},

		getMap: async (mapID) => {
			if (!world[mapID]) {
				try {
					const myMap = await jsonfile.readFile(`game/maps/${mapID}.json`);
					world[mapID] = new Map(mapID, myMap);

					console.log(chalk.green('Loaded Map ID:', mapID));
					return world[mapID];
				} catch (err) {
					console.log(err);
				}
			}

			return world[mapID];
		},

		getPortalByID(portalID, mapID) {
			return _.find(world[mapID].portals, { _id: portalID });
		},

		getPortalByName(portalName, mapID) {
			return world[mapID].portals[portalName];
		},

		getActiveMaps: () => {
			const arr = Array.from(io.sockets.adapter.rooms);
			const filtered = arr.filter((room) => !room[1].has(room[0]));

			const res = filtered.map((i) => i[0]);
			return res;
		},

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

		clearItemsOnTheGround: (mapID, secondsToKeepItemOnTheGround) => {
			const itemsToRemove = [];

			if (world[mapID]) {
				const now = Date.now();

				_.remove(world[mapID].itemsOnTheGround, (item) => {
					return now - item.createdAt > secondsToKeepItemOnTheGround * 1000;
				}).forEach((item) => {
					Item.deleteByID(item._id);
					itemsToRemove.push(item);
				});

				io.emit('removeEntity', {
					type: 'item',
					data: itemsToRemove
				});

				console.log(chalk.green(`[Map Factory] Removed ${itemsToRemove.length} item(s) from Map ID: ${mapID}`));
			}
		},

		removeInactiveMaps: (maxInactiveTimeinMinutes) => {
			Object.keys(world).forEach((mapID) => {
				if (world[mapID].characters.length === 0) {
					if (world[mapID].inactivity === 0) {
						world[mapID].inactivity = Date.now();
						console.log(chalk.green(`[Map Factory] Map ID: ${mapID} has been marked for deletion.`));
					} else if (Date.now() - world[mapID].inactivity > maxInactiveTimeinMinutes * 60 * 1000) {
						delete world[mapID];
						console.log(chalk.green(`[Map Factory] Map ID: ${mapID} has been removed due to inactivity.`));
					}
				} else if (world[mapID].characters.length > 0 && world[mapID].inactivity !== 0) {
					world[mapID].inactivity = 0;
					console.log(chalk.green(`[Map Factory] Map ID: ${mapID} removed from pending deletion.`));
				}
			});
		}
	};
	return MapFactory;
};
