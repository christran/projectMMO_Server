const _ = require('lodash');
const chalk = require('chalk');

const Item = require('../models/Item');

module.exports = (io, worldSnapshot) => {
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
			if (worldSnapshot[data.mapID]) {
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

					worldSnapshot[data.mapID].itemsOnTheGround.push({
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
				}).catch((err) => {
					console.log(err);
				});
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

				worldSnapshot[character.mapID].itemsOnTheGround.push({
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
		clearItemsOnTheGround: (mapID, secondsToKeepItemOnTheGround) => {
			const now = Date.now();

			_.remove(worldSnapshot[mapID].itemsOnTheGround, (item) => {
				return now - item.createdAt > secondsToKeepItemOnTheGround * 1000;
			}).forEach((item) => {
				Item.deleteByID(item._id);
				io.to(mapID).emit('removeItem', item);

				console.log(chalk.yellow(`[Item Factory] Removed ID: ${item._id} | Item ID: ${item.itemID}`));
			});
		}
	};

	return ItemFactory;
};
