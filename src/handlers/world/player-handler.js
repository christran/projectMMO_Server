// const jsonfile = require('jsonfile');
const _ = require('lodash');
const moment = require('moment');
const chalk = require('chalk');
const jsonfile = require('jsonfile');

const Discord = require('../../helpers/discord');

const Account = require('../../models/Account');
const Character = require('../../models/Character');
const Item = require('../../models/Item');

const itemsDataTable = './game/items.json';
// const susLog = require('../../models/susLogger.js');

module.exports = (io, socket, clients, worldSnapshotByMapID) => {
	const Player = require('../../helpers/player-helper')(io, clients);
	const Map = require('../../world/Map')(io);

	socket.on('characterState', (data) => {
		if (data.location.z < -5000) {
			// Get nearest portal on server side and set charPos to it
			// does the server even need to do this? just let the client handle it unless they can abuse it somehow?
			socket.emit('character_ZLimit');
		}

		// calculate character's new location given last location, velocity, and time passed since last update
		// const location = {
		// 	x: data.location.x + data.velocity.x * 0.05,
		// 	y: data.location.y + data.velocity.y * 0.05,
		// 	z: data.location.z + data.velocity.z * 0.05,
		// };

		// const location = {
		// 	x: socket.character.x += data.velocity.x * 0.05,
		// 	y: socket.character.y += data.velocity.y * 0.05,
		// 	z: socket.character.z += data.velocity.z * 0.05,
		// };

		const snapshot = {
			name: socket.character.name,
			location: data.location,
			rotation: data.rotation,
			action: parseInt(data.action, 10),
			velocity: data.velocity,
			timestamp: Date.now().toString()
		};

		function addOrReplaceBy(arr = [], predicate, getItem) {
			const index = _.findIndex(arr, predicate);
			return index === -1
				? [...arr, getItem()]
				: [
					...arr.slice(0, index),
					getItem(arr[index]),
					...arr.slice(index + 1)];
		}
		// add or replace snapshot in worldSnapshotByMapID array of snapshots for the map
		worldSnapshotByMapID[socket.character.mapID].characterStates = addOrReplaceBy(worldSnapshotByMapID[socket.character.mapID].characterStates, (character) => character.name === socket.character.name, () => snapshot);

		// Simulate on the Server Side
		socket.character.location = data.location;
		socket.character.rotation = data.rotation;
		socket.character.velocity = data.velocity;
		socket.character.action = parseInt(data.action, 10);

		// console.log(data); // Check if client is sending indepedent of framerate
	});

	// Client sends data to server to update character appearance/clothing
	socket.on('player_UpdateApperance', (appearanceData) => {
		socket.character.appearance = appearanceData;

		socket.to(socket.character.mapID).emit('updateAppearance', {
			name: socket.character.name,
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

	socket.on('player_LootItem', (data, callback) => {
		const itemsInMapID = worldSnapshotByMapID[socket.character.mapID].itemsOnTheGround;

		const findItemInMapID = _.find(itemsInMapID, { _id: data._id });

		if (findItemInMapID) {
			// Update item's owner with socket.characterID in the Items database
			Item.findItemByID(data._id).then((itemInDB) => {
				itemInDB.characterID = socket.character.id;
				itemInDB.lootable = false;

				itemInDB.save().then(() => {
				// Remove Item from worldSnapshotByID.itemsOnTheGround
					_.remove(itemsInMapID, { _id: data._id });

					// Emit to all clients in mapID that an item has been looted and to remove it
					io.to(socket.character.mapID).emit('removeItem', { _id: data._id });

					/// Tell Client that the item has been looted
					callback(true);

					jsonfile.readFile(itemsDataTable)
						.then((fileData) => {
							const itemsKeyByID = _.keyBy(fileData, 'Name');

							console.log(chalk.yellow(`[Item Factory] ${socket.character.name} looted: ${itemsKeyByID[itemInDB.itemID].item_name}`));
						}).catch((err) => console.log(err));
				});
			}).catch((err) => {
				// Remove Item from Client's map
				// Tell client that item doesn't exist and they're hacking
				io.to(socket.id).emit('removeItem', { _id: data._id });

				console.log(err);
				console.log(chalk.red('[Item Factory] Item does not exist in the database.'));
			});
		} else {
			io.to(socket.id).emit('removeItem', { _id: data._id });
			console.log(chalk.yellow(`[Item Factory] ID: ${socket.character.id} | Name : ${socket.character.name} | tried to loot an item that doesn't exist in the world.`));
		}
	});

	// When a player enters a map (GameState_MMO) will emit this event
	// Shouldn't need this because of how the client is also getting sent world snapshots that contain the same information in world.js update loop
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

			// Check if worldSnapshot for mapID exists
			if (worldSnapshotByMapID[socket.character.mapID]) {
				const mapState = {
					charactersInMap,
					itemsOnTheGround: worldSnapshotByMapID[socket.character.mapID].itemsOnTheGround
				};
				callback(mapState);
			}
		} else {
			// No other players in the map, don't do anything
			// console.log('No other players in map to know about');
		}
	});

	// Spawn Player after they select a character
	socket.on('spawnRequest', async (data) => {
		// Check if player is trying to spawn a character that is already spawned ingame
		if (_.findIndex(clients, { name: data.name }) >= 0) {
			// Pawn is already spawned/possessed
			socket.dcReason = `[Player Handler] spawnPlayer | Trying to spawn a character (${data.name}) that is already spawned.`;
			socket.emit('dc', 'Stop hacking');
		} else {
			const character = await Character.getCharacterByID(data._id).catch((err) => console.log(`[Player Handler] spawnPlayer | Error: ${err}`));
			const account = await Account.getAccountByID(character.accountID).catch((err) => console.log(`[Login Server] Login | Error: ${err}`));

			if (character) {
				// const charWeakMap = new WeakMap();
				// charWeakMap.set(socket, character);
				// const clientCharacter = charWeakMap.get(socket);
				// console.log(clientCharacter.mapID);

				// io.of('/').connected[socket.id].character = character;
				io.sockets.sockets.get(socket.id).character = character;

				clients.push({
					name: character.name,
					socketID: socket.id,
				});

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

				// Discord Login Message
				Discord.LoginNotify(character);

				account.lastLoginDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
				account.save();

				console.log(`[World Server] User: ${character.name} | Map ID: ${character.mapID} | Total Online: ${io.engine.clientsCount}`);
			} else {
				socket.dcReason = `[Player Handler] spawnPlayer | Trying to spawn a invaild Character ID (${data._id})`;
				socket.emit('dc', 'Stop hacking');
			}
		}
	});

	socket.on('player_UsePortal', async (data) => {
		const currentMap = await Map.getMap(socket.character.mapID).catch((err) => console.log(`[Player Handler] player_UsePortal | ${err}`));

		if (currentMap) {
			const currentPortal = currentMap.getPortalByName(data.portalName);
			// Check if portal exists in the current map
			if (!currentPortal) {
				console.log(`[World Server] ${socket.character.name} tried using Portal: ${data.portalName} from Map ID: ${socket.character.mapID}`);
				// socket.emit('dc', 'Stop hacking');
			} else if (currentPortal.portalType === 1) { // Regular Portal (Map to Map)
				const targetPortal = await Map.getMap(currentPortal.toMapID).catch((err) => console.log(`[Player Handler] player_UsePortal | ${err}`));

				if (socket.character.mapID) {
					const newPosition = targetPortal.portals[currentPortal.toPortalName];

					if (newPosition) {
						// Tell all players in the map to remove the player that disconnected.
						// Expect for this socket client
						socket.to(socket.character.mapID).emit('removeCharacter', {
							name: socket.character.name,
						});

						// Join new map then leave old map
						socket.leave(socket.character.mapID);
						socket.join(currentPortal.toMapID);

						socket.character.mapID = currentPortal.toMapID;
						socket.character.location = newPosition.location;
						socket.character.rotation = newPosition.rotation;

						// Tell client to change map
						socket.emit('changeMap', currentPortal.toMapID);

						// Tell all players currently in the new map to add the player that joined
						socket.to(socket.character.mapID).emit('addCharacter', {
							characterInfo: socket.character
						});

						Character.saveCharacter(socket);

						console.log(`[World Server] ${socket.character.name} moved to Map: ${targetPortal.mapInfo.mapName}`);
					}
				} else {
					console.log(`[World Server] Player: ${socket.character.name} doesn't have a mapID`);
				}
			} else if (currentPortal.portalType === 2) { // Teleport Portals (Portals in the same map that just change location)
				const targetPortal = currentMap.getPortalByName(data.portalName);

				const newPosition = currentMap.getPortalByName(targetPortal.toPortalName);

				if (newPosition) {
					const response = {
						location: newPosition.location,
						rotation: newPosition.rotation,
						portal: true,
					};

					socket.character.location = newPosition.location;
					socket.character.rotation = newPosition.rotation;
					socket.character.action = 2;
					socket.emit('teleportCharacter', response);

					console.log(`[World Server] ${socket.character.name} used portal: ${data.portalName} in Map: ${currentMap.mapInfo.mapName}`);
				}
			}
		}
	});

	// Disconnect a player with given name (GM Command - !dc {playername})
	socket.on('player_DC', (data) => {
		if (Player.getSocketByName(data.name)) {
			const player = Player.getSocketByName(data.name);

			io.to(`${player.id}`).emit('dc', 'D/Ced by a GM');

			// Tell all clients in the map to remove the player that disconnected.
			socket.to(player.mapID).emit('removeCharacter', {
				name: data.name
			});

			console.log(`[World Server] ${player.character.name} was dced by a GM`);
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
				name: socket.character.name
			});

			const socketIndex = clients.findIndex((item) => item.socketID === socket.id);
			clients.splice(socketIndex, 1);

			console.log(`[World Server] User: ${socket.character.name} logged off`);
		} else {
			console.log(`[World Server] IP: ${socket.handshake.address} disconnected | Reason: ${socket.dcReason} | ${reason}`);
		}
	});
};
