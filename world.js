require('pretty-error').start();

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const _ = require('lodash');
const chalk = require('chalk');

const Map = require('./src/world/Map')(io);

const TICK_RATE = 10; // 0.1sec or 100ms
let tick = 0;

const config = require('./_config.json');

const { port, serverMessage } = config.worldserver;

const clients = [];

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Server Web Client
app.get('/', (req, res) => {
	res.status(403).end();
});

io.on('connection', (socket) => {
	// Require all Handlers
	require('./src/handlers/world/player-handler')(io, socket, clients, tick);

	io.emit('updateServerMessage', serverMessage);
});

// Simulate Inputs/Movements on the Server
function sendWorldSnapshot() {
	// clients.forEach((data) => {
	// 	const { character } = io.sockets.connected[data.socketID];

	// 	if (character.snapshot && character.snapshot.length > 0) {
	// 		switch (character.snapshot.direction) {
	// 		case 'Left':
	// 			character.position.location -= 1;
	// 			break;
	// 		case 'Right':
	// 			character.position.location += 1;
	// 			break;
	// 		default:
	// 			break;
	// 		}
	// 	}
	// 	character.snapshot = [];
	// }
	// );

	const activeMaps = Object.keys(io.sockets.adapter.rooms).filter(Number);

	if (activeMaps > 0) {
		activeMaps.forEach((mapID) => {
			const playerArray = [];
			const players = Map.getAllPlayersInMap(mapID);

			_.forOwn(players, (value, name) => {
				// console.log(`${name} @ ${value.position}`);
			});
		});
	}
	// console.log('Sent World Snapshot to All Clients')
}

// Game Logic
function update(delta) {
	const activeMaps = Object.keys(io.sockets.adapter.rooms).filter(Number);

	// Send update to only maps with players in them (SocketIO Rooms)
	// Sent to (GameState_MMO)
	if (activeMaps.length > 0) {
		activeMaps.forEach((mapID) => {
			const playerArray = [];
			const players = Map.getAllPlayersInMap(mapID);

			_.forOwn(players, (value, name) => {
				// Don't send data if character is idle
				if (players[name].snapshot && players[name].snapshot.length > 0) {
					// Simulate Inputs/Movements on the Server
					players[name].snapshot.forEach((data) => {
						switch (data.direction) {
						case 'Left':
							/*
							Formula to Simulate Movement

							PredictedPosition = CurrentPosition + CurrentVelocity * PredictionTime;

							x = x0 + v * t

							x = future position
							x0 = current position
							v = velocity
							t = time (server delta time?)
							*/
							// console.log(`Current Player (Server): ${players[name].position.location}`);
							// console.log(`Player Velocity (Client): ${data.velocity}`);
							// console.log(`Predicted Y: ${(players[name].position.location.y + data.velocity.y) * delta}`);
							// console.log(players[name].position.location.y);

							players[name].position.location.y += data.velocity.y * delta;
							players[name].snapshot.shift();
							break;
						case 'Right':
							players[name].position.location.y += data.velocity.y * delta;
							players[name].snapshot.shift();
							break;
						case 'Up':
							players[name].position.location.x += data.velocity.x * delta;
							players[name].snapshot.shift();
							break;
						case 'Down':
							players[name].position.location.x += data.velocity.x * delta;
							players[name].snapshot.shift();
							break;
						default:
							break;
						}
					});

					// Build/Send Snapshot to Clients
					const player = {
						[name]: {
							position: players[name].position,
							action: players[name].action,
							// velocity: players[name].position.velocity,
							tick
						}
					};
					playerArray.push(player);
				}
			});

			io.to(mapID).emit('update', playerArray);
		});
	} else {
		// No players in any maps so don't emit anything
		// console.log('No active maps');
	}

	// io.emit('setCurrentTick', tick);
}

// Game Loop
const tickLengthMs = 1000 / TICK_RATE;

let previousTick = Date.now();
// eslint-disable-next-line no-unused-vars
let actualTicks = 0;

const gameLoop = () => {
	const now = Date.now();

	actualTicks += 1;
	if (previousTick + tickLengthMs <= now) {
		const delta = (now - previousTick) / 1000;
		previousTick = now;

		// Run Update
		update(delta);

		tick += 1;

		actualTicks = 0;
	}

	if (Date.now() - previousTick < tickLengthMs - 16) {
		setTimeout(gameLoop);
	} else {
		setImmediate(gameLoop);
	}
};

http.listen(port, () => {
	// Connect to DB
	require('./db');

	// Start the Game LOop
	gameLoop();

	console.log(chalk.greenBright(`[World Server] Starting World Server... Port: ${port}`));
});
