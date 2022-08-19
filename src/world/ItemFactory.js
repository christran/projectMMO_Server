import chalk from 'chalk';

import Item from '../models/Item.js';

export default (io, world) => {
	const ItemFactory = {
		/**
		 * Spawns an item into a map
		 * @param data.itemID - Item ID
		 * @param data.mapID - Map ID
		 * @param data.x - X
		 * @param data.y - Y
		 * @param data.z - Z
		 * @param {boolean} data.randomXY - Spawns item at random X and Y and spins it
		 * @param {number} data.zHeight - How high it should shoot up
		 *
		 */
		spawnItem: (data) => {
			if (world[data.mapID]) {
				Item.createItem({
					itemID: data.itemID
				}).then((item) => {
					io.to(data.mapID).emit('spawnItem', {
						_id: item._id,
						itemID: item.itemID,
						location: {
							x: data.x,
							y: data.y,
							z: data.z // Height
						},
						createdAt: new Date(item.createdAt).getTime().toString(),
						randomX: data.randomXY ? Math.random() * (1000 - (-1000)) + (-1000) : 0,
						randomY: data.randomXY ? Math.random() * (1000 - (-1000)) + (-1000) : 0,
						zHeight: data.zHeight
					});

					if (world[data.mapID]) {
						world[data.mapID].itemsOnTheGround.push({
							_id: item._id,
							itemID: item.itemID,
							// Caculate actual landing location
							location: {
								x: 0,
								y: 0,
								z: 100
							},
							createdAt: new Date(item.createdAt).getTime().toString(),
						});
					}
					console.log(chalk.yellow(`[Item Factory] Created ID: ${item._id} | Item ID: ${item.itemID} | Map ID: ${data.mapID}`));
				}).catch((err) => {
					console.log(err);
				});
			} else {
				console.log(chalk.red(`[Item Factory] Trying to spawn an item in Map ID: ${data.mapID} doesn't exist`));
			}
		},
		/**
		 * Drops a character's item on the ground at the their current location
		 * @param {number} _id ID from Item Database
		 * @param {object} character socket.character
		 */
		dropItem: (_id, character) => {
		// Get item from database
			Item.findItembyID(_id).then((item) => {
				item.characterID = null;
				item.lootable = true;
				item.save();

				io.to(character.mapID).emit('spawnItem', {
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
		},
	};

	return ItemFactory;
};
