const _ = require('lodash');

const Account = require('../../../src/models/Account');
const Character = require('../../../src/models/Character');

module.exports = (io, socket, clients, delta, tick) => {
	const Player = require('../../helpers/player-helper')(io, clients);
	const Map = require('../../world/Map')(io);

	socket.on('player_Movement', (data) => {
		if (socket.character.usingPortal) {
			// Don't apply old inputs after using portal
			console.log('[Portal] Ignore player\'s old movement data');
		} else if (data.movementSnapshot) {
			const snapshotArray = data.movementSnapshot;

			snapshotArray.forEach((snapshot) => {
				// Check if player's velocity is > than the max walk speed + any speed enhancing skills
				if (Math.round(snapshot.velocity) > 4089) {
					console.log(`[Anticheat] ${socket.character.name} | Speed Hacking | Current Velocity: ${Math.round(snapshot.velocity)}`);
					// socket.disconnect();
					// socket.emit('dc', 'Stop hacking');
				}

				if (snapshot.deltaTime > delta) {
					console.log(`[Anticheat] ${socket.character.name} | Speed Hacking | Client Delta Time: ${snapshot.deltaTime} > ${delta}`);
					// socket.emit('dc', 'Stop hacking');
				}

				// Check if player fell off the map
				if (snapshot.location.z < -10000) {
					// Get nearest portal on server side and set charPos to it
					socket.emit('player_ZLimit');
				}

				// Set to the same as what the client has UE4 (BP_Character)
				const rotationSpeed = 1000.0;
				const charPos = socket.character.position;

				switch (snapshot.direction) {
				case 'Left':
					charPos.location.y = snapshot.location.y - snapshot.velocity * snapshot.deltaTime;
					charPos.rotation.yaw = _.clamp(snapshot.rotation.yaw - rotationSpeed * snapshot.deltaTime, -90, 90);
					charPos.location.z = snapshot.location.z;
					socket.character.action = 1;
					break;
				case 'Right':
					charPos.location.y = snapshot.location.y + snapshot.velocity * snapshot.deltaTime;
					charPos.rotation.yaw = _.clamp(snapshot.rotation.yaw + rotationSpeed * snapshot.deltaTime, -90, 90);
					charPos.location.z = snapshot.location.z;
					socket.character.action = 1;
					break;
				case 'Up':
					charPos.location.x = snapshot.location.x + snapshot.velocity * snapshot.deltaTime;
					charPos.rotation.yaw = _.clamp(snapshot.rotation.yaw + rotationSpeed * snapshot.deltaTime, -180, 180);
					charPos.location.z = snapshot.location.z;
					socket.character.action = 1;
					break;
				case 'Down':
					charPos.location.x = snapshot.location.x - snapshot.velocity * snapshot.deltaTime;
					charPos.rotation.yaw = _.clamp(snapshot.rotation.yaw - rotationSpeed * snapshot.deltaTime, -180, 180);
					charPos.location.z = snapshot.location.z;
					socket.character.action = 1;
					break;
				default:
					break;
				}
			});
		}
	});

	// When a plyer enters a map (GameInstance_MMO) will emit this event
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
		if (_.findIndex(clients, { name: data.name }) >= 0) {
			// Pawn is already spawned/possessed
			socket.dcReason = `[Player Handler] spawnPlayer | Trying to spawn a character (${data.name}) that is already spawned.`;
			socket.emit('dc', 'Stop hacking');
		} else {
			const character = await Character.getCharacterByID(data._id).catch((err) => console.log(`[Player Handler] spawnPlayer | Error: ${err}`));

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
				socket.emit('changePlayerMap', character);

				// Send to other players in the map
				socket.to(character.mapID).emit('addPlayerToMap', {
					[character.name]: {
						position: character.position
					}
				});

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
						const response = {
							mapID: currentPortal.toMapID,
							position: newPosition,
						};

						socket.join(currentPortal.toMapID);

						socket.character.position = newPosition;
						socket.character.mapID = currentPortal.toMapID;
						socket.emit('changePlayerMap', response);

						Character.saveCharacter(socket);

						// Send to other players in the map
						socket.to(socket.character.mapID).emit('addPlayerToMap', {
							[socket.character.name]: {
								position: socket.character.position
							}
						});

						console.log(`[World Server] ${socket.character.name} moved to Map: ${targetPortal.mapInfo.mapName}`);
					}
				} else {
					console.log(`[World Server] Player: ${socket.character.name} doesn't have a mapID`);
				}
			} else if (currentPortal.portalType === 2) { // Teleport Portals (Portals in the same map that just change location)
				const targetPortal = currentMap.getPortalByName(data.portalName);

				// socket.character.usingPortal = true;

				const newPosition = currentMap.getPortalByName(targetPortal.toPortalName).position;

				if (newPosition) {
					const response = {
						position: newPosition,
						portal: true,
					};

					socket.character.position = newPosition;
					socket.character.action = 2;
					socket.emit('teleportPlayer', response);

					Character.saveCharacter(socket);

					console.log(`[World Server] ${socket.character.name} used portal: ${data.portalName} in Map: ${currentMap.mapInfo.mapName}`);
				}
			}
		}
	});

	// Disconnect a player with given name
	socket.on('player_DC', (data) => {
		if (Player.getSocketByName(data.name)) {
			const player = Player.getSocketByName(data.name);

			io.to(`${player.id}`).emit('dc', 'D/Ced by a GM');
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

			// Tell all players in the map to remove the player that disconnected.
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
