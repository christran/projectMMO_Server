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

			if (world[mapID]) {
				await Promise.all(data.items.map(async (item) => {
					// take into account amount of items to create
					for (let i = 0; i < item.amount; i += 1) {
						// eslint-disable-next-line no-await-in-loop
						await Item.createItem({
							itemID: item.id,
							lootable: true
						}).then((itemFromDB) => {
							itemsToSpawn.push({
								_id: itemFromDB._id,
								itemID: itemFromDB.itemID,
								location: {
									x: data.x,
									y: data.y,
									z: data.z // Height
								},
								randomX: data.randomXY ? Math.random() * (1000 - (-1000)) + (-1000) : 0,
								randomY: data.randomXY ? Math.random() * (1000 - (-1000)) + (-1000) : 0,
								zHeight: data.zHeight,
								createdAt: itemFromDB.createdAt
							});

							world[mapID].itemsOnTheGround.push({
								_id: itemFromDB._id,
								itemID: itemFromDB.itemID,
								// Caculate actual landing location
								location: {
									x: 0,
									y: 0,
									z: 100
								},
								createdAt: new Date(itemFromDB.createdAt).getTime().toString(),
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
		dropItem: (_id, character, amount) => {
		// Get item from database
			Item.findItembyID(_id).then((item) => {
				item.characterID = null;
				item.lootable = true;
				item.save();

				// no logic for dropping stackable items like 3 potions
				io.to(character.mapID).emit('spawnEntity', {
					type: 'item',
					data: [{
						_id: item._id,
						itemID: item.itemID,
						location: {
							x: character.location.x,
							y: character.location.y,
							z: character.location.z
						},
						createdAt: Date.getTime().toString(),
						randomX: 0,
						randomY: 0,
						zHeight: 3000
					}],
					amount
				});

				world[character.mapID].itemsOnTheGround.push({
					_id: item._id,
					itemID: item.itemID,
					location: {
						x: character.location.x,
						y: character.location.y,
						z: character.location.z
					},
					createdAt: Date.getTime().toString(),
				});
			}).catch((err) => {
				console.log(err);
			});
		}
	};

	return ItemFactory;
};
