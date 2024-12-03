import jsonfile from 'jsonfile';
import chalk from 'chalk';
import _ from 'lodash';

import Map from '../models/Map.js';
import Mob from '../models/Mob.js';
import Item from '../models/Item.js';

import MobFactory from './MobFactory.js';

export default (io, world) => {
	const MapFactory = {
		// eslint-disable-next-line consistent-return
		loadMap: async (mapID) => {
			const Mob2 = MobFactory(io, world); // conflicting variable name

			if (!world[mapID]) {
				await jsonfile.readFile(`game/maps/${mapID}.json`).then((mapData) => {
					world[mapID] = new Map(mapID, mapData);

					// Add pre-defined entities to the map
					world[mapID].npcs = world[mapID].npcs.concat(mapData.npcs);
					// world[mapID].mobs = world[mapID].mobs.concat(mapData.mobs);
					world[mapID].portals = world[mapID].portals.concat(mapData.portals);

					// world[mapID].mobs.concat(mapData.mobs).forEach((mob) => {
					// 	const mobsToSpawn = [];

					// 	for (let i = 0; i < mob.amount; i += 1) {
					// 		const newMob = new Mob({
					// 			_id: Mob2.generateUniqueMobID(mapID),
					// 			mobID: mob.mobID,
					// 			location: {
					// 				x: mob.location.x,
					// 				y: mob.location.y,
					// 				z: mob.location.z
					// 			},
					// 			rotation: mob.rotation,
					// 			stats: {
					// 				hp: 100, // get from mob data table
					// 				maxHP: 100, // get from mob data table
					// 			}
					// 		});
					// 		mobsToSpawn.push(newMob);

					// 		world[mapID].mobs.push(newMob);
					// 	}
					// });

					console.log(`[Map Factory] Loaded Map ID: ${chalk.green(mapID)}`);

					return world[mapID];
				}).catch((err) => {
					throw err;
				});
			}
		},

		getMap: async (mapID) => {
			if (!world[mapID]) {
				await MapFactory.loadMap(mapID).then((map) => {
					return map;
				}).catch((err) => {
					throw err;
				});
			} else {
				// Map is already loaded
				return world[mapID];
			}
		},

		getPortalByID: async (portalID, mapID) => {
			return _.find(world[mapID].portals, { id: portalID });
		},

		getPortalByName: async (portalName, mapID) => {
			return _.find(world[mapID].portals, { name: portalName });
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

			// console.log(_.keyBy(playersInMap, 'id'));
			return _.keyBy(playersInMap, 'id');
		},

		clearItemsOnTheGround: (mapID, secondsToKeepItemOnTheGround) => {
			const itemsToRemove = [];

			if (world[mapID]) {
				const now = Date.now();

				_.remove(world[mapID].itemsOnTheGround, (item) => {
					return now - item.created_at > secondsToKeepItemOnTheGround * 1000;
				}).forEach((item) => {
					Item.deleteByID(item.id);
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
						// remove the items from database before deleting the map
						world[mapID].itemsOnTheGround.forEach((item) => {
							Item.deleteByID(item.id);
						});

						// make sure this is garbage collected
						world[mapID] = {};
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
