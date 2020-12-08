const _ = require('lodash');
const moment = require('moment');

const Discord = require('../../helpers/discord');

const Account = require('../../models/Account');
const Character = require('../../models/Character');

module.exports = (io, socket, clients, delta, tick) => {
	const Player = require('../../helpers/player-helper')(io, clients);
	const Map = require('../../world/Map')(io);
	const snapshotArray = [];

	socket.on('player_Movement', (data) => {
		if (socket.character.usingPortal) {
			// Don't apply old inputs after using portal
			// If a player is still moving when using a portal it carries over to the next map
			// Currently broken because of the new server movement code
			console.log('[Portal] Ignore player\'s old movement data');
		} else if (data.movementSnapshot) {
			const { movementSnapshot } = data;

			movementSnapshot.forEach((snapshot) => {
				// Check if player's velocity is > than the max walk speed + any speed enhancing skills
				if (Math.round(snapshot.velocity) > 4089) {
					console.log(`[Anticheat] ${socket.character.name} | Speed Hacking | Current Velocity: ${Math.round(snapshot.velocity)}`);
					// socket.disconnect();
					// socket.emit('dc', 'Stop hacking');
				}

				// Check if player fell off the map
				// if (socket.character.position.location.z < -10000) {
				// 	// Get nearest portal on server side and set charPos to it
				// 	socket.emit('player_ZLimit');
				// }

				// Set to the same as what the client has UE4 (BP_Character)
				// const rotationSpeed = 1000.0;

				snapshotArray.push(snapshot);
				socket.character.snapshot = snapshotArray;
			});
		}
	});

	// const movementArray = [];

	// socket.on('player_Movement', (data) => {
	// 	movementArray.push(data);

	// 	console.log(movementArray.length);
	// });

	socket.on('player_Action', (data) => {
		switch (data.action) {
		case 'Jump':
			socket.character.action = 2;
			console.log(`${socket.character.name} jumped`);
			break;
		case 'Crouch':
			socket.character.action = 3;
			console.log(`${socket.character.name} crouched`);
			break;
		case 'Attack':
			socket.character.action = 4;
			console.log(`${socket.character.name} attacked`);
			break;
		default:
			break;
		}
	});

	// When a plyer enters a map (GameInstance_MMO) will emit this event
	// Shouldn't need this because of how the client is also getting send world snapshots that contain the same information
	socket.on('getAllPlayersInMap', (data, callback) => {
		socket.character.usingPortal = false;

		// Send client any other players in the map
		if (Map.getAllPlayersInMap(socket.character.mapID)) {
			const playersInMap = [];

			const players = Map.getAllPlayersInMap(socket.character.mapID);

			_.forOwn(players, (value, name) => {
				playersInMap.push({
					playerName: name,
					position: players[name].position
				});
			});

			callback(playersInMap);
		} else {
			// No other players in the map, don't do anything
			// console.log('No other players in map to know about');
		}
	});

	// Spawn Player after they select a character
	socket.on('spawnPlayer', async (data) => {
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

				socket.character = character;

				clients.push({
					name: character.name,
					socketID: socket.id
				});

				// Add player to map and spawn them in the map
				socket.join(character.mapID);

				// Send client the current tick of the server
				socket.emit('setCurrentTick', tick);
				socket.emit('changePlayerMap', character.mapID);

				// Send to other players in the map
				socket.to(character.mapID).emit('addPlayerToMap', {
					name: character.name,
					position: character.position
				});

				// Discord Login Message
				Discord.LoginNotify(character);

				account.lastLoginDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
				account.save();

				console.log(`[World Server] User: ${character.name} | Map ID: ${character.mapID} | Total Online: ${clients.length}`);
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
					socket.character.usingPortal = true;

					// Tell all players in the map to remove the player that disconnected.
					socket.to(socket.character.mapID).emit('removePlayerFromMap', {
						playerName: socket.character.name,
					});

					socket.leave(socket.character.mapID);

					const newPosition = targetPortal.portals[currentPortal.toPortalName].position;

					if (newPosition) {
						socket.join(currentPortal.toMapID);

						socket.character.position = newPosition;
						socket.character.mapID = currentPortal.toMapID;
						socket.emit('changePlayerMap', currentPortal.toMapID);

						Character.saveCharacter(socket);

						socket.to(socket.character.mapID).emit('addPlayerToMap', {
							name: socket.character.name,
							position: socket.character.position
						});

						console.log(`[World Server] ${socket.character.name} moved to Map: ${targetPortal.mapInfo.mapName}`);
					}
				} else {
					console.log(`[World Server] Player: ${socket.character.name} doesn't have a mapID`);
				}
			} else if (currentPortal.portalType === 2) { // Teleport Portals (Portals in the same map that just change location)
				const targetPortal = currentMap.getPortalByName(data.portalName);

				const newPosition = currentMap.getPortalByName(targetPortal.toPortalName).position;

				if (newPosition) {
					const response = {
						position: newPosition,
						portal: true,
					};

					socket.character.position = newPosition;
					socket.character.action = 2;
					socket.emit('teleportPlayer', response);

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
			socket.to(player.mapID).emit('removePlayerFromMap', {
				playerName: data.name
			});

			console.log(`[World Server] ${player.character.name} was dced by a GM`);
		} else {
			console.log(`[World Server] Can't find player: ${data.name}`);
		}
	});

	// Player Disconnection
	socket.on('disconnect', () => {
		// Save Character Data to Database on disconnection
		if (socket.character) {
			Character.saveCharacter(socket);

			// isOnline = false
			Account.getAccountByID(socket.character.accountID, (err, account) => {
				account.isOnline = false;
				account.save();
			});

			// Tell all clients in the map to remove the player that disconnected.
			socket.to(socket.character.mapID).emit('removePlayerFromMap', {
				playerName: socket.character.name
			});

			const socketIndex = clients.findIndex((item) => item.socketID === socket.id);
			clients.splice(socketIndex, 1);

			console.log(`[World Server] User: ${socket.character.name} logged off`);
		} else {
			console.log(`[World Server] IP: ${socket.handshake.address} disconnected | Reason: ${socket.dcReason}`);
		}
	});
};
