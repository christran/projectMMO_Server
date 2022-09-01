import _ from 'lodash';
import moment from 'moment';
import jsonfile from 'jsonfile';
import chalk from 'chalk';
import * as fs from 'fs';

import Account from '../../models/Account.js';
import Character from '../../models/Character.js';
import Item from '../../models/Item.js';

import Discord from '../../helpers/discord.js';
import susLog from '../../models/susLogger.js';

import PlayerHelper from '../../helpers/player-helper.js';
import MapFactory from '../../world/MapFactory.js';
import ItemFactory from '../../world/ItemFactory.js';

const itemsDataTable = './game/items.json';

const config = JSON.parse(fs.readFileSync('./_config.json'));
const { serverMessage, billboardURL } = config.worldserver;

export default (io, socket, world, clients) => {
	const Player = PlayerHelper(io, world);
	const Map = MapFactory(io, world);
	// const Item = ItemFactory(io, socket, clients, world); // conflicting variable name

	socket.on('characterState', (data) => {
		// if (data.location.z < -5000) {
		// 	// Get nearest portal on server side and set charPos to it
		// 	// does the server even need to do this? just let the client handle it unless they can abuse it somehow?
		// 	socket.emit('character_ZLimit');
		// }

		const snapshot = {
			_id: socket.character._id,
			name: socket.character.name,
			location: data.location,
			rotation: data.rotation,
			action: parseInt(data.action, 10),
			velocity: data.velocity,
			timestamp: Date.now().toString()
		};

		// eslint-disable-next-line default-param-last
		function addOrReplaceBy(arr = [], predicate, getItem) {
			const index = _.findIndex(arr, predicate);
			return index === -1
				? [...arr, getItem()]
				: [
					...arr.slice(0, index),
					getItem(arr[index]),
					...arr.slice(index + 1)];
		}
		// add or replace snapshot in world array of snapshots for the map
		if (world[socket.character.mapID]) {
			world[socket.character.mapID].characterStates = addOrReplaceBy(world[socket.character.mapID].characterStates, (character) => character._id === socket.character._id, () => snapshot);
		} else {
			console.log(chalk.yellow(`[Player Handler] Map ID: ${socket.character.mapID} was not found in world`));
		}

		// Simulate on the Server Side
		socket.character.location = data.location;
		socket.character.rotation = data.rotation;
		socket.character.velocity = data.velocity;
		socket.character.action = parseInt(data.action, 10);

		// console.log(data); // Check if client is sending independent of framerate
	});

	// Client sends data to server to update character appearance/clothing
	socket.on('player_UpdateApperance', (appearanceData) => {
		socket.character.appearance = appearanceData;

		socket.to(socket.character.mapID).emit('updateAppearance', {
			_id: socket.character._id,
			appearance: appearanceData
		});

		// _.forOwn(appearanceData, (id, type) => {
		// 	if (id !== 0) {
		// 		if (type === 'top' || type === 'bottom' || type === 'shoes') {
		// 			jsonfile.readFile(`./game/character/${type}s.json`)
		// 				.then((fileData) => {
		// 					const keyByID = _.keyBy(fileData, 'Name');

		// 					socket.character.appearance.top = id;

		// 					socket.to(socket.character.mapID).emit('updateAppearance', {
		// 						name: socket.character.name,
		// 						type: 'top',
		// 						id

		// 					});

		// 					console.log(`[Update] ${socket.character.name} changed ${type}: ${keyByID[id].item_name}`);
		// 				});

		// 			// switch (type) {
		// 			// case 'top':
		// 			// 	jsonfile.readFile(topsDataTable)
		// 			// 		.then((fileData) => {
		// 			// 			const topsKeyID = _.keyBy(fileData, 'Name');

		// 			// 			// Update Character Top on Server
		// 			// 			socket.character.appearance.top = id;

		// 			// 			// Tell other clients to update this character top
		// 			// 			socket.to(socket.character.mapID).emit('updateAppearance', {
		// 			// 				name: socket.character.name,
		// 			// 				type: 'top',
		// 			// 				id

		// 			// 			});

		// 			// 			console.log(`[Update] ${socket.character.name} changed Top: ${topsKeyID[id].item_name}`);
		// 			// 		})
		// 			// 		.catch((err) => console.log(err));
		// 			// 	break;
		// 			// case 'bottom':
		// 			// 	jsonfile.readFile(bottomsDataTable)
		// 			// 		.then((fileData) => {
		// 			// 			const bottomsKeyByID = _.keyBy(fileData, 'Name');

		// 			// 			// add update stuff

		// 			// 			console.log(`[Update] ${socket.character.name} changed Bottom: ${bottomsKeyByID[id].item_name}`);
		// 			// 		})
		// 			// 		.catch((err) => console.log(err));
		// 			// 	break;
		// 			// case 'shoes':
		// 			// 	jsonfile.readFile(shoesDataTable)
		// 			// 		.then((fileData) => {
		// 			// 			const shoesKeyByID = _.keyBy(fileData, 'Name');

		// 			// 			// add update stuff

		// 			// 			console.log(`[Update] ${socket.character.name} changed Shoes: ${shoesKeyByID[id].item_name}`);
		// 			// 		})
		// 			// 		.catch((err) => console.log(err));
		// 			// 	break;
		// 			// case 'weapon_L':
		// 			// 	jsonfile.readFile(shoesDataTable)
		// 			// 		.then((fileData) => {
		// 			// 			const shoesKeyByID = _.keyBy(fileData, 'Name');

		// 			// 			// add update stuff

		// 			// 			console.log(`[Update] ${socket.character.name} changed Shoes: ${shoesKeyByID[id].weapon_name}`);
		// 			// 		})
		// 			// 		.catch((err) => console.log(err));
		// 			// 	break;
		// 			// case 'weapon_R':
		// 			// 	jsonfile.readFile(weaponsDataTable)
		// 			// 		.then((fileData) => {
		// 			// 			const weaponsKeyByID = _.keyBy(fileData, 'Name');

		// 			// 			// Update Character Top on Server
		// 			// 			socket.character.appearance.weapon_R = id;

		// 			// 			// Tell other clients to update this character top
		// 			// 			socket.to(socket.character.mapID).emit('updateAppearance', {
		// 			// 				name: socket.character.name,
		// 			// 				type: 'weapon_R',
		// 			// 				id,

		// 			// 			});

		// 			// 			console.log(`[Update] ${socket.character.name} changed Weapon_R: ${weaponsKeyByID[id].weapon_name}`);
		// 			// 		})
		// 			// 		.catch((err) => console.log(err));
		// 			// 	break;
		// 			// default:
		// 			// 	break;
		// 			// }
		// 		} else if (type === 'weapon_L' || type === 'weapon_R') {
		// 			if (type === 'weapon_L') {
		// 				jsonfile.readFile(weaponsDataTable)
		// 					.then((fileData) => {
		// 						const weaponsKeyByID = _.keyBy(fileData, 'Name');

		// 						// Update Character Top on Server
		// 						socket.character.appearance.weapon_L = id;

		// 						// Tell other clients to update this character top
		// 						socket.to(socket.character.mapID).emit('updateAppearance', {
		// 							name: socket.character.name,
		// 							type: 'weapon_L',
		// 							id,

		// 						});

		// 						console.log(`[Update] ${socket.character.name} changed weapon_L: ${weaponsKeyByID[id].weapon_name}`);
		// 					})
		// 					.catch((err) => console.log(err));
		// 			} else if (type === 'weapon_R') {
		// 				jsonfile.readFile(weaponsDataTable)
		// 					.then((fileData) => {
		// 						const weaponsKeyByID = _.keyBy(fileData, 'Name');

		// 						// Update Character Top on Server
		// 						socket.character.appearance.weapon_R = id;

		// 						// Tell other clients to update this character top
		// 						socket.to(socket.character.mapID).emit('updateAppearance', {
		// 							name: socket.character.name,
		// 							type: 'weapon_R',
		// 							id,

		// 						});

		// 						console.log(`[Update] ${socket.character.name} changed Weapon_R: ${weaponsKeyByID[id].weapon_name}`);
		// 					})
		// 					.catch((err) => console.log(err));
		// 			}
		// 		}
		// 	} else {
		// 		// console.log('[Update] Character Appearance: Shirtless/Bottomeless etc...');
		// 	}
		// });

		// Update Character Appearance in Database
		Character.saveCharacter(socket);
	});

	socket.on('player_PickUp', (data, callback) => {
		const itemsInMapID = world[socket.character.mapID].itemsOnTheGround;
		const findItemInMapID = _.find(itemsInMapID, { _id: data._id });

		if (findItemInMapID) {
			// Update item's owner with socket.characterID in the Items database
			Item.findItemByID(data._id).then((itemInDB) => {
				if (itemInDB.lootable === true) {
					itemInDB.characterID = socket.character.id;
					itemInDB.lootable = false;

					itemInDB.save().then(() => {
						// Emit to all other clients in mapID that an item has been looted and to remove it
						socket.to(socket.character.mapID).emit('removeEntity', {
							type: 'item',
							data: [{ _id: data._id }]
						});

						// Remove Item from worldSnapshotByID.itemsOnTheGround
						_.remove(itemsInMapID, { _id: data._id });

						/// Tell Client that the item has been looted
						callback(true);

						jsonfile.readFile(itemsDataTable)
							.then((fileData) => {
								const itemsKeyByID = _.keyBy(fileData, 'Name');

								if (itemsKeyByID[itemInDB.itemID]) {
									console.log(chalk.yellow(`[Item Factory] ${socket.character.name} picked up: ${itemsKeyByID[itemInDB.itemID].item_name}`));
								} else {
									console.log(chalk.yellow(`[Item Factory] ${socket.character.name} picked up Item ID: ${itemInDB.itemID} | No item name was found in the Items Data Table`));
								}
							}).catch((err) => console.log(err));
					});
				}
			}).catch((err) => {
				// Remove Item from Client's map
				// Tell client that item doesn't exist and they're hacking
				io.to(socket.character.mapID).emit('removeEntity', {
					type: 'item',
					data: [{ _id: data._id }]
				});

				susLog.new({
					character: socket.character,
					reason: 'Tried to loot an item that does not exist in the database.',
				});

				console.log(err);
				console.log(chalk.red('[Item Factory] Item does not exist in the database.'));
			});
		} else if (findItemInMapID === undefined) {
			// Tell the client to remove that item because it doesn't exist on the server
			socket.emit('removeEntity', {
				type: 'item',
				data: [{ _id: data._id }]
			});

			console.log(chalk.yellow(`[Item Factory] ID: ${socket.character.id} | Name : ${socket.character.name} | tried to loot an item: ${findItemInMapID}`));
		}
	});

	socket.on('player_DropItem', (data, callback) => {
		Item.findItemByID(data._id).then((itemInDB) => {
			if (itemInDB.characterID === socket.character.id) {
				itemInDB.characterID = null;
				itemInDB.lootable = true;
				itemInDB.save().then(() => {
					ItemFactory.dropItem(itemInDB.itemID, socket.character);
					callback(true);
				});
			} else {
				console.log(chalk.red('[Item Factory] Item does not belong to this character.'));
			}
		}).catch((err) => {
			console.log(err);
			console.log(chalk.red('[Item Factory] Item does not exist in the database.'));
		});
	});

	// When a player enters a map (GameState_MMO) will emit this event
	socket.on('requestMapState', (data, callback) => {
		// Send client any other players in the map including themselves
		// Portal logic runs before this? casuing the character to spawn at the wrong location

		if (Map.getAllPlayersInMap(socket.character.mapID)) {
			const charactersInMap = [];
			const players = Map.getAllPlayersInMap(socket.character.mapID);

			_.forOwn(players, (value, name) => {
				charactersInMap.push({
					characterInfo: players[name]
				});
			});

			const mapState = {
				charactersInMap,
				itemsOnTheGround: world[socket.character.mapID].itemsOnTheGround
			};

			callback(mapState);
		} else {
			// No other players in the map, don't do anything
			// console.log('No other players in map to know about');
		}
	});

	// Spawn Player after they select a character
	socket.on('spawnRequest', async (data) => {
		// Check if a character id already exists in the characters array in the world object
		Player.checkIfAlreadySpawned(data._id).then(async () => {
			const character = await Character.getCharacterByID(data._id).catch((err) => console.log(`[Player Handler] spawnPlayer | Error: ${err}`));
			const account = await Account.getAccountByID(character.accountID).catch((err) => console.log(`[Login Server] Login | Error: ${err}`));

			if (character) {
				// const charWeakMap = new WeakMap();
				// charWeakMap.set(socket, character);
				// const clientCharacter = charWeakMap.get(socket);
				// console.log(clientCharacter.mapID);

				// io.of('/').connected[socket.id].character = character;
				io.sockets.sockets.get(socket.id).character = character;
				socket.character.socketID = socket.id;

				const spawnCharacter = () => {
					// Add player to map and spawn them in the map
					socket.join(character.mapID);
					socket.emit('changeMap', character.mapID);

					// Default velocity
					character.velocity = {
						x: 0,
						y: 0,
						z: 0
					};

					// Send to other players in the map
					socket.to(character.mapID).emit('addCharacter', {
						characterInfo: character,
					});

					socket.emit('worldService', { type: 'server_message', message: serverMessage, update: false });
					socket.emit('worldService', { type: 'billboardURL', billboardURL, update: false });

					clients.push({ socketID: socket.id, characterID: character._id });

					// Discord Login Message
					Discord.LoginNotify(character);

					account.lastLoginDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
					account.save();

					susLog.new({
						socket,
						reason: 'no reason xD',
					});

					console.log(`[World Server] ${character.name}${chalk.green(`#${character.tagline}`)} | Map ID: ${character.mapID} | Total Online: ${io.engine.clientsCount}`);
				};

				if (!world[socket.character.mapID]) {
					// eslint-disable-next-line no-unused-vars
					Map.loadMap(socket.character.mapID).then((map) => {
						world[socket.character.mapID].characters.push(socket.character);

						spawnCharacter();
					});
				} else {
					world[socket.character.mapID].characters.push(socket.character);
					spawnCharacter();
				}
			} else {
				socket.dcReason = `[Player Handler] spawnPlayer | Trying to spawn a invaild Character ID (${data._id})`;
				socket.emit('worldService', {
					type: 'error',
					reason: 'cheating'
				});
			}
		}).catch(() => {
			socket.emit('worldService', {
				type: 'error',
				reason: 'cheating'
			});

			console.log(`[Player Handler] Character ID (${data._id}) already exists in the world`);
		});
	});

	socket.on('player_UsePortal', (data) => {
		Map.getMap(socket.character.mapID).then((currentMap) => {
			Map.getPortalByName(data.portalName, socket.character.mapID).then((currentPortal) => {
				if (currentPortal.portalType === 1) {
					Map.getMap(currentPortal.toMapID).then((targetMap) => {
						Map.getPortalByName(currentPortal.toPortalName, currentPortal.toMapID).then((targetPortal) => {
							socket.to(socket.character.mapID).emit('removeCharacter', {
								_id: socket.character._id,
							});

							socket.leave(socket.character.mapID);
							socket.join(currentPortal.toMapID);

							_.remove(world[socket.character.mapID].characters, { name: socket.character.name });
							world[currentPortal.toMapID].characters.push(socket.character);

							socket.character.mapID = currentPortal.toMapID;
							socket.character.location = targetPortal.location;
							socket.character.rotation = targetPortal.rotation;

							Character.saveCharacter(socket);

							socket.emit('changeMap', currentPortal.toMapID);

							socket.to(socket.character.mapID).emit('addCharacter', {
								characterInfo: socket.character
							});

							console.log(`[World Server] ${socket.character.name} moved to Map: ${targetMap.mapInfo.mapName} | Map ID: ${currentPortal.toMapID}`);
						}).catch((err) => console.log(`[Player Handler] player_UsePortal | Error: ${err}`));
					}).catch((err) => {
						console.log(err);
					});
				} else if (currentPortal.portalType === 2) {
					Map.getPortalByName(currentPortal.toPortalName, socket.character.mapID).then((targetPortal) => {
						const response = {
							location: targetPortal.location,
							rotation: targetPortal.rotation,
							portal: true,
						};

						socket.character.location = targetPortal.location;
						socket.character.rotation = targetPortal.rotation;
						socket.character.action = 2;

						Character.saveCharacter(socket);

						socket.emit('teleportCharacter', response);

						console.log(`[World Server] ${socket.character.name} used portal: ${data.portalName} in Map: ${currentMap.mapInfo.mapName}`);
					}).catch((err) => {
						console.log(err);
					});
				}
			}).catch((err) => {
				console.log(err);
			});
		}).catch((err) => {
			console.log(err);
		});
	});

	// Disconnect a player with given name (GM Command - !dc {playername})
	socket.on('player_DC', (data) => {
		if (Player.getSocketByCharID(data._id)) {
			const targetCharacter = Player.getSocketByCharID(data._id).character;

			io.to(`${targetCharacter._id}`).emit('dc', 'D/Ced by a GM');

			// Tell all clients in the map to remove the player that disconnected.
			socket.to(targetCharacter.mapID).emit('removeCharacter', {
				_id: targetCharacter._id
			});

			console.log(`[World Server] ${targetCharacter.name} was dced by a GM`);
		} else {
			console.log(`[World Server] Can't find player: ${data.name}`);
		}
	});

	// eslint-disable-next-line no-unused-vars
	socket.on('disconnecting', (reason) => {
		// Save Character Data to Database on disconnection
		if (socket.character) {
			Character.saveCharacter(socket);

			// isOnline = false
			Account.getAccountByID(socket.character.accountID, (err, account) => {
				account.isOnline = false;
				account.save();
			});
		}
	});

	// Player Disconnection
	socket.on('disconnect', (reason) => {
		// Save Character Data to Database on disconnection
		if (socket.character) {
			// Tell all clients in the map to remove the player that disconnected.
			socket.to(socket.character.mapID).emit('removeCharacter', {
				_id: socket.character._id
			});

			_.remove(world[socket.character.mapID].characters, { name: socket.character.name });

			// Remove from clients list
			_.remove(clients, { characterID: socket.character._id });

			console.log(`[World Server] ${socket.character.name}${chalk.green(`#${socket.character.tagline}`)} logged off`);
		} else {
			console.log(`[World Server] IP: ${socket.handshake.address} disconnected | Reason: ${socket.dcReason} | ${reason}`);
		}
	});
};
