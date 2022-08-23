import jsonfile from 'jsonfile';
import chalk from 'chalk';
import _ from 'lodash';

import Map from '../models/Map.js';
import Item from '../models/Item.js';

export default (io, world, pubClient) => {
	const MapFactory = {
		// eslint-disable-next-line consistent-return
		loadMap: async (mapID) => {
			try {
				const myMap = await jsonfile.readFile(`game/maps/${mapID}.json`);

				// world[mapID] = new Map(mapID, myMap);

				// // Add pre-defined entities to the map
				// world[mapID].npcs = world[mapID].npcs.concat(myMap.npcs);
				// world[mapID].mobs = world[mapID].mobs.concat(myMap.mobs);
				// world[mapID].portals = world[mapID].portals.concat(myMap.portals);

				// Redis State
				const redisNewMap = new Map(mapID, myMap);

				// Add pre-defined entities to the map
				redisNewMap.npcs = redisNewMap.npcs.concat(myMap.npcs);
				redisNewMap.mobs = redisNewMap.mobs.concat(myMap.mobs);
				redisNewMap.portals = redisNewMap.portals.concat(myMap.portals);

				// Check if map is already in redis
				await pubClient.json.get(`world:${mapID}`).then((map) => {
					if (!map) {
						pubClient.json.set(`world:${mapID}`, '.', redisNewMap).then(() => {
							console.log(`Loaded ${mapID} to Redis World State`);

							return redisNewMap;
						}).catch((err) => {
							console.log(err);
						});
					} else {
						console.log(`Map ${mapID} already exists in Redis World State`);
					}
				});
				console.log(chalk.green('Loaded Map ID:', mapID));

				return redisNewMap;
				// return world[mapID];
			} catch (err) {
				console.log(err);
			}
		},

		getMap: async (mapID) => {
			// if the map isn't loaded then load it
			await pubClient.json.get(`world:${mapID}`).then((map) => {
				if (!map) {
					const myMap = MapFactory.loadMap(mapID);
					return myMap;
				}
				return map;
			});

			// if (!world[mapID]) {
			// 	const myMap = await MapFactory.loadMap(mapID);
			// 	return myMap;
			// }
			// return world[mapID];
		},

		getPortalByID: async (portalID, mapID) => {
			await pubClient.json.get(`world:${mapID}`).then((map) => {
				return _.find(map.portals, { id: portalID });
			});
			// return _.find(world[mapID].portals, { id: portalID });
		},

		getPortalByName: async (portalName, mapID) => {
			await pubClient.json.get(`world:${mapID}`).then((map) => {
				return _.find(map.portals, { name: portalName });
			});
			// return _.find(world[mapID].portals, { name: portalName });
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

			// Redis
			pubClient.json.get(`world:${mapID}`).then((map) => {
				const now = Date.now();

				_.remove(map.itemsOnTheGround, (item) => {
					return now - item.createdAt > secondsToKeepItemOnTheGround * 1000;
				}).forEach((item) => {
					Item.deleteByID(item.id);
					itemsToRemove.push(item);
				});

				io.emit('removeEntity', {
					type: 'item',
					data: itemsToRemove
				});

				pubClient.json.set(`world:${mapID}`, '.itemsOnTheGround', map.itemsOnTheGround).then(() => {

				});

				console.log(chalk.green(`[Map Factory] Removed ${itemsToRemove.length} item(s) from Map ID: ${mapID}`));
			});
		},

		removeInactiveMaps: (maxInactiveTimeinMinutes) => {
			pubClient.KEYS('*').then((keys) => {
				keys.forEach((key) => {
					pubClient.json.get(key).then((map) => {
						if (map.characters.length === 0) {
							if (map.inactivity === 0) {
								pubClient.json.set(key, '.inactivity', Date.now());
								console.log(chalk.green(`[Map Factory] Map ID: ${key} has been marked for deletion.`));
							} else if (Date.now() - map.inactivity > maxInactiveTimeinMinutes * 60 * 1000) {
								pubClient.DEL(key);
								console.log(chalk.green(`[Map Factory] Map ID: ${key} has been removed due to inactivity.`));
							}
						} else if (map.characters.length > 0 && map.inactivity !== 0) {
							pubClient.json.set(key, '.inactivity', 0);
							console.log(chalk.green(`[Map Factory] Map ID: ${key} has been removed from pending deletion.`));
						}
					});
				});
			});
		}
	};
	return MapFactory;
};
