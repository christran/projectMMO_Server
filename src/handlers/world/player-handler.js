const _ = require('lodash');
const moment = require('moment');

const Discord = require('../../helpers/discord');

const Account = require('../../models/Account');
const Character = require('../../models/Character');
// const susLog = require('../../models/susLogger.js');

module.exports = (io, socket, clients, tick) => {
	const Player = require('../../helpers/player-helper')(io, clients);
	const Map = require('../../world/Map')(io);

	socket.on('player_Movement', (transform) => {
	// Don't apply old inputs after using portal
	// If a player is still moving when using a portal it carries over to the next map
	// Currently broken because of the new server movement code
		// Check if player fell off the map
		if (transform.location.z < -5000) {
			// Get nearest portal on server side and set charPos to it
			socket.emit('player_ZLimit');
		}

		// This is not server authoritative
		socket.character.transform.location = transform.location;
		socket.character.transform.rotation = transform.rotation;
		socket.character.transform.velocity = transform.velocity;

		/*
		// bootleg anticheat
		const compareX = transform.location.x - socket.character.transform.location.x;
		const compareY = transform.location.y - socket.character.transform.location.y;

		if (compareX >= 90 || compareX <= -90 || compareY >= 90 || compareY <= -90) {
			// Check if used teleport or flashjump skill
			socket.emit('dc', 'Stop speed hacking');

			susLog.newEntry({
				accountID: socket.character.accountID,
				characterName: socket.character.name,
				reason: 'speed hacking'
			});
			console.log(`${socket.character.name} is speed hacking - X: ${compareX} Y: ${compareY}`);
		} else {
			socket.character.transform.location = transform.location;
			socket.character.transform.rotation = transform.rotation;
		}
		*/
	});

	socket.on('player_Action', (data) => {
		switch (data.action) {
		case 'Idle':
			socket.character.action = 1;
			// console.log(`${socket.character.name} is idle`);
			break;
		case 'Walking':
			socket.character.action = 2;
			console.log(`${socket.character.name} is walking`);
			break;
		case 'Running':
			socket.character.action = 3;
			console.log(`${socket.character.name} is running`);
			break;
		case 'Jump':
			socket.character.action = 4;
			console.log(`${socket.character.name} jumped`);
			break;
		case 'Crouch':
			socket.character.action = 5;
			console.log(`${socket.character.name} crouched`);
			break;
		case 'Attack':
			socket.character.action = 6;
			console.log(`${socket.character.name} attacked`);
			break;
		default:
			break;
		}
	});

	// When a plyer enters a map (GameInstance_MMO) will emit this event
	// Shouldn't need this because of how the client is also getting sent world snapshots that contain the same information in world.js update loop
	socket.on('getAllPlayersInMap', (data, callback) => {
		// Send client any other players in the map including themselves
		if (Map.getAllPlayersInMap(socket.character.mapID)) {
			const playersInMap = [];
			const players = Map.getAllPlayersInMap(socket.character.mapID);

			_.forOwn(players, (value, name) => {
				playersInMap.push({
					playerName: name,
					transform: players[name].transform
				});
			});

			callback(playersInMap);

			socket.character.usingPortal = false;
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

				// io.of('/').connected[socket.id].character = character;
				io.sockets.sockets.get(socket.id).character = character;

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
					transform: character.transform
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
					// Tell all players in the map to remove the player that disconnected.
					socket.to(socket.character.mapID).emit('removePlayerFromMap', {
						playerName: socket.character.name,
					});

					socket.leave(socket.character.mapID);

					// Tell client to change map
					socket.emit('changePlayerMap', currentPortal.toMapID);

					const newPosition = targetPortal.portals[currentPortal.toPortalName].transform;

					if (newPosition) {
						socket.join(currentPortal.toMapID);

						socket.character.transform = newPosition;
						socket.character.mapID = currentPortal.toMapID;

						// Tell all players currently in the map to add the player that joined
						socket.to(socket.character.mapID).emit('addPlayerToMap', {
							name: socket.character.name,
							transform: socket.character.transform
						});

						Character.saveCharacter(socket);

						console.log(`[World Server] ${socket.character.name} moved to Map: ${targetPortal.mapInfo.mapName}`);
					}
				} else {
					console.log(`[World Server] Player: ${socket.character.name} doesn't have a mapID`);
				}
			} else if (currentPortal.portalType === 2) { // Teleport Portals (Portals in the same map that just change location)
				const targetPortal = currentMap.getPortalByName(data.portalName);

				const newPosition = currentMap.getPortalByName(targetPortal.toPortalName).transform;

				if (newPosition) {
					const response = {
						transform: newPosition,
						portal: true,
					};

					socket.character.transform = newPosition;
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
			socket.to(socket.character.mapID).emit('removePlayerFromMap', {
				playerName: socket.character.name
			});

			const socketIndex = clients.findIndex((item) => item.socketID === socket.id);
			clients.splice(socketIndex, 1);

			console.log(`[World Server] User: ${socket.character.name} logged off`);
		} else {
			console.log(`[World Server] IP: ${socket.handshake.address} disconnected | Reason: ${socket.dcReason} | ${reason}`);
		}
	});
};
