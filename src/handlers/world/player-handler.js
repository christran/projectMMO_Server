const jsonfile = require('jsonfile');
const _ = require('lodash');
const moment = require('moment');

const Discord = require('../../helpers/discord');

const Account = require('../../models/Account');
const Character = require('../../models/Character');
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

		worldSnapshotByMapID[socket.character.mapID] = addOrReplaceBy(worldSnapshotByMapID[socket.character.mapID], { name: socket.character.name }, () => snapshot);

		// Simulate on the Server Side
		socket.character.location = data.location;
		socket.character.rotation = data.rotation;
		socket.character.velocity = data.velocity;
	});

	// Client sends data to server to update character appearance/clothing
	socket.on('player_UpdateApperance', (appearanceData) => {
		// const skinsDataTable = './game/character_skins.json';
		// const hairDataTable = './game/character_hair.json';
		// const eyesDataTable = './game/character_eyes.json';
		const topsDataTable = './game/character/tops.json';
		const bottomsDataTable = './game/character/bottoms.json';
		const shoesDataTable = './game/character/shoes.json';
		const weaponsDataTable = './game/character/weapons.json';

		switch (appearanceData.type) {
		case 'top':
			jsonfile.readFile(topsDataTable)
				.then((fileData) => {
					const topsKeyID = _.keyBy(fileData, 'Name');

					// Update Character Top on Server
					socket.character.top = appearanceData.id;

					// Update Character Top in Database
					Character.saveCharacter(socket);

					// Tell other clients to update this character top
					socket.to(socket.character.mapID).emit('updateAppearance', {
						name: socket.character.name,
						type: 'top',
						id: appearanceData.id,

					});

					console.log(`[Update] ${socket.character.name} changed Top: ${topsKeyID[appearanceData.id].item_name}`);
				})
				.catch((err) => console.log(err));
			break;
		case 'bottom':
			jsonfile.readFile(bottomsDataTable)
				.then((fileData) => {
					const bottomsKeyByID = _.keyBy(fileData, 'Name');

					// add update stuff

					console.log(`[Update] ${socket.character.name} changed Bottom: ${bottomsKeyByID[appearanceData.id].bottom_name}`);
				})
				.catch((err) => console.log(err));
			break;
		case 'shoe':
			jsonfile.readFile(shoesDataTable)
				.then((fileData) => {
					const shoesKeyByID = _.keyBy(fileData, 'Name');

					// add update stuff

					console.log(`[Update] ${socket.character.name} changed Shoes: ${shoesKeyByID[appearanceData.id].item_name}`);
				})
				.catch((err) => console.log(err));
			break;
		case 'weapon_left':
			jsonfile.readFile(shoesDataTable)
				.then((fileData) => {
					const shoesKeyByID = _.keyBy(fileData, 'Name');

					// add update stuff

					console.log(`[Update] ${socket.character.name} changed Shoes: ${shoesKeyByID[appearanceData.id].item_name}`);
				})
				.catch((err) => console.log(err));
			break;
		case 'weapon_right':
			jsonfile.readFile(weaponsDataTable)
				.then((fileData) => {
					const weaponsKeyByID = _.keyBy(fileData, 'Name');

					// add update stuff

					console.log(`[Update] ${socket.character.name} changed Shoes: ${weaponsKeyByID[appearanceData.id].weapon_name}`);
				})
				.catch((err) => console.log(err));
			break;
		default:
			break;
		}
	});

	// When a player enters a map (GameState_MMO) will emit this event
	// Shouldn't need this because of how the client is also getting sent world snapshots that contain the same information in world.js update loop
	socket.on('requestMapState', (data, callback) => {
		// Send client any other players in the map including themselves
		// Portal logic runs before this? casuing the character to spawn at the wrong location
		if (Map.getAllPlayersInMap(socket.character.mapID)) {
			const playersInMap = [];
			const players = Map.getAllPlayersInMap(socket.character.mapID);

			_.forOwn(players, (value, name) => {
				playersInMap.push({
					characterInfo: players[name]
				});
			});

			callback(playersInMap);
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
					socketID: socket.id
				});

				// Add player to map and spawn them in the map
				socket.join(character.mapID);

				// Send client the current tick of the server
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

						_.remove(worldSnapshotByMapID[socket.character.mapID], (character) => character.name === socket.character.name);

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

			// _.remove(worldSnapshot, (character) => character.name === socket.character.name);
			_.remove(worldSnapshotByMapID[socket.character.mapID], (character) => character.name === socket.character.name);

			const socketIndex = clients.findIndex((item) => item.socketID === socket.id);
			clients.splice(socketIndex, 1);

			console.log(`[World Server] User: ${socket.character.name} logged off`);
		} else {
			console.log(`[World Server] IP: ${socket.handshake.address} disconnected | Reason: ${socket.dcReason} | ${reason}`);
		}
	});
};
