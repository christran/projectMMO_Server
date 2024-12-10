import chalk from 'chalk';

import Item from '../models/Item.js';

/*
// for typescript in the future
type itemSpawnData = {
	items:Array<{
		id: number,
		amount: number
	}>,
	mapID: number,
	x: number,
	y: number,
	z: number,
	randomXY: boolean,
	zHeight: number
};
*/

export default (io, world) => {
	const ItemFactory = {
		spawn: async (mapID, data) => {
			const itemsToSpawn = [];

			// no logic for dropping stackable items like 3 potions
			if (world[mapID]) {
				await Promise.all(data.items.map(async (item) => {
					// take into account amount of items to create
					for (let i = 0; i < item.amount; i += 1) {
						// eslint-disable-next-line no-await-in-loop
						await Item.createItem({
							item_id: item.item_id,
							lootable: true
						}).then((itemFromDB) => {
							itemsToSpawn.push({
								id: itemFromDB.id,
								item_id: itemFromDB.item_id,
								location: {
									x: data.x,
									y: data.y,
									z: data.z // Height
								},
								randomX: data.randomXY ? Math.random() * (1000 - (-1000)) + (-1000) : 0,
								randomY: data.randomXY ? Math.random() * (1000 - (-1000)) + (-1000) : 0,
								zHeight: data.zHeight,
								created_at: itemFromDB.created_at
							});

							world[mapID].itemsOnTheGround.push({
								id: itemFromDB.id,
								item_id: itemFromDB.item_id,
								// Caculate actual landing location
								location: {
									x: 0,
									y: 0,
									z: 25 // z: 25 is ground level
								},
								created_at: new Date(itemFromDB.created_at).getTime().toString(),
							});
						}).catch((err) => {
							console.log(err);
						});
					}
				}));

				io.to(mapID).emit('spawnEntity', {
					type: 'item',
					data: itemsToSpawn
				});
			} else {
				console.log(chalk.red(`[Item Factory] Trying to spawn an item in Map ID: ${mapID} that doesn't exist`));
			}
		},
		dropItem: (id, character, amount) => {
		// Get item from database
			Item.findItembyID(id).then((item) => {
				Item.updateItem(id, {
					character_id: null,
					lootable: true
				});

				// no logic for dropping stackable items like 3 potions
				io.to(character.map_id).emit('spawnEntity', {
					type: 'item',
					data: [{
						id: item.id,
						item_id: item.item_id,
						// should shoot upwards when dropped like maple
						location: {
							x: character.location.x,
							y: character.location.y,
							z: character.location.z
						},
						created_at: Date.getTime().toString(),
						randomX: 0,
						randomY: 0,
						zHeight: 3000
					}],
					amount
				});

				world[character.map_id].itemsOnTheGround.push({
					id: item.id,
					item_id: item.item_id,
					location: {
						x: character.location.x,
						y: character.location.y,
						z: character.location.z
					},
					created_at: Date.getTime().toString(),
				});
			}).catch((err) => {
				console.log(err);
			});
		}
	};

	return ItemFactory;
};
