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
import AbilityFactory from '../../world/AbilityFactory.js';

const itemsDataTable = './game/items.json';
// const abilitiesDataTable = './game/abilities.json';

const config = JSON.parse(fs.readFileSync('./_config.json'));
const { serverMessage, billboardURL } = config.worldserver;

export default (io, socket, world, clients) => {
	const Player = PlayerHelper(io, world);
	const Map = MapFactory(io, world);
	const Ability = AbilityFactory(io, world, socket);
	// const Item = ItemFactory(io, socket, clients, world); // conflicting variable name

	socket.on('saveUserSettings', async (data) => {
		const account = await Account.getAccountByID(socket.character.account_id).catch((err) => console.log(`[Login Server] Login | Error: ${err}`));

		switch (data.setting) {
		case 'inventoryPos':
			await Account.updateAccount(account.id, {
				inventory_pos_x: data.inventoryPos.x,
				inventory_pos_y: data.inventoryPos.y
			});
			break;
		case 'chatPos':
			await Account.updateAccount(account.id, {
				chat_pos_x: data.chatPos.x,
				chat_pos_y: data.chatPos.y
			});
			break;
		default:
			break;
		}
	});

	socket.on('characterState', (data) => {
		if (!data.isAFK) {
			const snapshot = {
				id: socket.character.id,
				name: socket.character.name,
				location: data.location,
				rotation: data.rotation,
				action: parseInt(data.action, 10),
				velocity: data.velocity
				// timestamp: Date.now().toString()
			};

			if (world[socket.character.map_id]) {
				const characterIndex = world[socket.character.map_id].characterStates.findIndex((character) => character.id === socket.character.id);

				// if characterID exists in world, update it instead of pushing a new one
				// bad workaround for now
				if (characterIndex !== -1) {
					world[socket.character.map_id].characterStates[characterIndex] = snapshot;
				} else {
					world[socket.character.map_id].characterStates.push(snapshot);
				}
			} else {
				console.log(chalk.yellow(`[Player Handler] Map ID: ${socket.character.map_id} was not found in world`));
			}

			// Simulate on the Server Side?
			socket.character.location = data.location;
			socket.character.rotation = data.rotation;
			socket.character.velocity = data.velocity;
			socket.character.action = parseInt(data.action, 10);
		} else if (data.isAFK) {
			if (world[socket.character.map_id]) {
				const characterIndex = world[socket.character.map_id].characterStates.findIndex((character) => character.id === socket.character.id);

				// if characterID exists in world remove it
				if (characterIndex !== -1) {
					world[socket.character.map_id].characterStates.splice(characterIndex, 1);
				}
			} else {
				console.log(chalk.yellow(`[Player Handler] Map ID: ${socket.character.map_id} was not found in world`));
			}
		}
	});

	// Client sends data to server to update character appearance/clothing
	socket.on('player_UpdateApperance', (appearanceData) => {
		socket.character.appearance = appearanceData;

		socket.to(socket.character.map_id).emit('updateAppearance', {
			id: socket.character.id,
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
		Character.updateCharacter(socket.character.id, {
			gender: appearanceData.gender,
			skin: appearanceData.skin,
			hair: appearanceData.hair,
			eyes: appearanceData.eyes,
			top: appearanceData.top,
			bottom: appearanceData.bottom,
			shoes: appearanceData.shoes,
			weapon_l: appearanceData.weapon_l,
			weapon_r: appearanceData.weapon_r
		});
	});

	socket.on('player_UseAbility', (ability, callback) => {
		if (ability.id) {
			Ability.useAbility(ability)
				.then((data) => {
					callback({ id: 0, stats: socket.character.stats });
					console.log(chalk.yellow(`[Ability Factory] ${socket.character.name} used Ability: ${data.ability} | MP: ${data.mp} | MP Cost ${data.mp_cost}`));
				})
				.catch((error) => {
					if (error.id === 1) {
						// Not Enough Mana
						callback({ id: 1, stats: socket.character.stats });
						console.log(chalk.yellow(`[Ability Factory] ${error.message}`));
					} else if (error.id === 2) {
						// Ability doesn't exist
						console.log(chalk.yellow(`[Ability Factory] ${error.message}`));
					}
				});
		}
	});

	socket.on('player_PickUp', (data) => {
		const itemsInMapID = world[socket.character.map_id].itemsOnTheGround;
		const findItemInMapID = _.find(itemsInMapID, { _id: data._id });

		if (findItemInMapID) {
			// Update item's owner with socket.characterID in the Items database
			Item.findItemByID(data._id).then((itemInDB) => {
				if (itemInDB.lootable === true) {
					itemInDB.characterID = socket.character.id;
					itemInDB.lootable = false;

					itemInDB.save().then(() => {
						// Emit to all other clients in mapID that an item has been looted and to remove it
						socket.to(socket.character.map_id).emit('removeEntity', {
							type: 'item',
							data: [{ _id: data._id }]
						});

						// Remove Item from worldSnapshotByID.itemsOnTheGround
						_.remove(itemsInMapID, { _id: data._id });

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
				io.to(socket.character.map_id).emit('removeEntity', {
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

		if (Map.getAllPlayersInMap(socket.character.map_id)) {
			const charactersInMap = [];
			const players = Map.getAllPlayersInMap(socket.character.map_id);

			_.forOwn(players, (value, name) => {
				// Check if it's the UE Server or Not
				if (name !== 'undefined') {
					charactersInMap.push({
						characterInfo: players[name]
					});
				}
			});

			const mapState = {
				charactersInMap,
				itemsOnTheGround: world[socket.character.map_id].itemsOnTheGround
			};

			callback(mapState);
		} else {
			// No other players in the map, don't do anything
			console.log('No other players in map to know about');
		}
	});

	// Spawn Player after they select a character
	socket.on('spawnRequest', async (data) => {
		// Check if a character id already exists in the characters array in the world object
		Player.checkIfAlreadySpawned(data.id).then(async () => {
			const character = await Character.getCharacterByID(data.id).catch((err) => console.log(`[Player Handler] spawnPlayer | Error: ${err}`));
			const account = await Account.getAccountByID(character.account_id).catch((err) => console.log(`[Login Server] Login | Error: ${err}`));

			if (character && account) {
				// const charWeakMap = new WeakMap();
				// charWeakMap.set(socket, character);
				// const clientCharacter = charWeakMap.get(socket);
				// console.log(clientCharacter.mapID);

				// io.of('/').connected[socket.id].character = character;
				io.sockets.sockets.get(socket.id).character = character;
				socket.character.socketID = socket.id;

				const spawnCharacter = async () => {
					// Add player to map and spawn them in the map
					socket.join(character.map_id);
					socket.emit('changeMap', character.map_id);

					// Default velocity
					character.velocity = {
						x: 0,
						y: 0,
						z: 0
					};

					// Send to other players in the map
					socket.to(character.map_id).emit('addCharacter', {
						characterInfo: character,
					});

					socket.emit('worldService', { type: 'updateRate', updateRate: config.worldserver.updateRate });
					socket.emit('worldService', { type: 'server_message', message: serverMessage, update: false });
					socket.emit('worldService', { type: 'billboardURL', billboardURL, update: false });

					clients.push({ socketID: socket.id, characterID: character.id });

					// Discord Login Message
					Discord.LoginNotify(character);

					await Account.updateAccount(account.id, {
						last_login_date: new Date(),
					});

					// susLog.new({
					// 	socket,
					// 	reason: 'no reason xD',
					// });

					console.log(`[World Server] ${character.name}${chalk.green(`#${character.tagline}`)} | Map ID: ${character.map_id} | Total Online: ${io.engine.clientsCount}`);
				};

				if (!world[socket.character.map_id]) {
					// eslint-disable-next-line no-unused-vars
					Map.loadMap(socket.character.map_id).then((map) => {
						world[socket.character.map_id].characters.push(socket.character);

						spawnCharacter();
					});
				} else {
					world[socket.character.map_id].characters.push(socket.character);
					spawnCharacter();
				}
			} else {
				socket.dcReason = `[Player Handler] spawnPlayer | Trying to spawn a invaild Character ID (${data.id})`;
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

			console.log(`[Player Handler] Character ID (${data.id}) already exists in the world`);
		});
	});

	socket.on('player_UsePortal', (data) => {
		Map.getMap(socket.character.map_id).then((currentMap) => {
			Map.getPortalByName(data.portalName, socket.character.map_id).then((currentPortal) => {
				if (currentPortal.portalType === 1) {
					Map.getMap(currentPortal.toMapID).then((targetMap) => {
						Map.getPortalByName(currentPortal.toPortalName, currentPortal.toMapID).then((targetPortal) => {
							socket.to(socket.character.map_id).emit('removeCharacter', {
								id: socket.character.id,
							});

							socket.leave(socket.character.map_id);
							socket.join(currentPortal.toMapID);

							_.remove(world[socket.character.map_id].characters, { name: socket.character.name });
							world[currentPortal.toMapID].characters.push(socket.character);

							socket.character.map_id = currentPortal.toMapID;
							socket.character.location = targetPortal.location;
							socket.character.rotation = targetPortal.rotation;

							Character.updateCharacter(socket.character.id, {
								location_x: socket.character.location.x,
								location_y: socket.character.location.y,
								location_z: socket.character.location.z,
								rotation: socket.character.rotation,
								map_id: socket.character.map_id
							});

							socket.emit('changeMap', currentPortal.toMapID);

							socket.to(socket.character.map_id).emit('addCharacter', {
								characterInfo: socket.character
							});

							console.log(`[World Server] ${socket.character.name} moved to Map: ${targetMap.mapInfo.mapName} | Map ID: ${currentPortal.toMapID}`);
						}).catch((err) => console.log(`[Player Handler] player_UsePortal | Error: ${err}`));
					}).catch((err) => {
						console.log(err);
					});
				} else if (currentPortal.portalType === 2) {
					Map.getPortalByName(currentPortal.toPortalName, socket.character.map_id).then((targetPortal) => {
						const response = {
							location: targetPortal.location,
							rotation: targetPortal.rotation,
							portal: true,
						};

						socket.character.location = targetPortal.location;
						socket.character.rotation = targetPortal.rotation;
						socket.character.action = 2;

						Character.updateCharacter(socket.character.id, {
							location_x: socket.character.location.x,
							location_y: socket.character.location.y,
							location_z: socket.character.location.z,
							rotation: socket.character.rotation,
							// map_id: socket.character.map_id
						});

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
		if (Player.getSocketByCharID(data.id)) {
			const targetCharacter = Player.getSocketByCharID(data.id).character;

			io.to(`${targetCharacter.id}`).emit('dc', 'D/Ced by a GM');

			// Tell all clients in the map to remove the player that disconnected.
			socket.to(targetCharacter.map_id).emit('removeCharacter', {
				_id: targetCharacter.id
			});

			console.log(`[World Server] ${targetCharacter.name} was dced by a GM`);
		} else {
			console.log(`[World Server] Can't find player: ${data.name}`);
		}
	});

	// eslint-disable-next-line no-unused-vars
	socket.on('disconnecting', async (reason) => {
		// Save Character Data to Database on disconnection
		if (socket.character) {
			await Character.updateCharacter(socket.character.id, {
				location_x: socket.character.location.x,
				location_y: socket.character.location.y,
				location_z: socket.character.location.z,
				rotation: socket.character.rotation,
				map_id: socket.character.map_id
			});

			await Account.updateAccount(socket.character.account_id, {
				is_online: false
			});
		}
	});

	// Player Disconnection
	socket.on('disconnect', (reason) => {
		// Save Character Data to Database on disconnection
		if (socket.character) {
			// Tell all clients in the map to remove the player that disconnected.
			socket.to(socket.character.map_id).emit('removeCharacter', {
				id: socket.character.id
			});

			_.remove(world[socket.character.map_id].characters, { name: socket.character.name });

			// bad workaround for now
			_.remove(world[socket.character.map_id].characterStates, { id: socket.character.id });

			// Remove from clients list
			_.remove(clients, { characterID: socket.character.id });

			console.log(`[World Server] ${socket.character.name}${chalk.green(`#${socket.character.tagline}`)} logged off`);
		} else {
			console.log(`[World Server] IP: ${socket.handshake.address} disconnected | Reason: ${socket.dcReason} | ${reason}`);
		}
	});
};
