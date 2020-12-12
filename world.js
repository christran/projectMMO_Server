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

// Game Logic
function update() {
	const activeMaps = Object.keys(io.sockets.adapter.rooms).filter(Number);

	// Send update to only maps with players in them (SocketIO Rooms)
	// Sent to (GameState_MMO)
	if (activeMaps.length > 0) {
		activeMaps.forEach((mapID) => {
			const playerArray = [];
			const players = Map.getAllPlayersInMap(mapID);

			_.forOwn(players, (value, name) => {
				// Don't send data if character is idle
				// Build/Send Snapshot to Clients
				const player = {
					[name]: {
						transform: players[name].transform,
						action: players[name].action,
						tick
					}
				};
				playerArray.push(player);
			});

			io.to(mapID).emit('update', playerArray);
		});
	} else {
		// No players in any maps so don't emit anything
		// console.log('No active maps');
	}
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
		// eslint-disable-next-line no-unused-vars
		const delta = (now - previousTick) / 1000;
		previousTick = now;

		// Run Update
		update();

		// eslint-disable-next-line no-undef
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
