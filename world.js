require('pretty-error').start();

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
	transports: ['websocket'],
	allowUpgrades: false
});

const _ = require('lodash');
const chalk = require('chalk');

const Map = require('./src/world/Map')(io);

const TICK_RATE = 20; // 0.1sec or 100ms
let tick = 0;

const config = require('./_config.json');

const { port, serverMessage } = config.worldserver;

const clients = [];
let worldSnapshot = [];

global.loadedMaps = [];

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Server Web Client
app.get('/', (req, res) => {
	res.status(403).end();
});

// Load Maps into Memory
Map.loadMaps().then((maps) => {
	global.loadedMaps = maps;

	console.log(chalk.yellow('[Map] Loaded Maps'));
});

io.on('connection', (socket) => {
	// Require all Handlers
	require('./src/handlers/world/player-handler')(io, socket, clients, tick);

	socket.on('player_Movement', (data) => {
		const snapshot = {
			name: socket.character.name,
			location: data.location,
			rotation: data.rotation,
			action: parseInt(data.action, 10),
			velocity: data.velocity,
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

		worldSnapshot = addOrReplaceBy(worldSnapshot, { name: socket.character.name }, () => snapshot);

		// Simulate on the Server Side
		socket.character.location = data.location;
		socket.character.rotation = data.rotation;
		socket.character.velocity = data.velocity;
	});

	io.emit('updateServerMessage', serverMessage);

	// Player Disconnection
	socket.on('disconnect', (reason) => {
		// Save Character Data to Database on disconnection
		if (socket.character) {
			// Tell all clients in the map to remove the player that disconnected.
			socket.to(socket.character.mapID).emit('removePlayerFromMap', {
				playerName: socket.character.name
			});

			_.remove(worldSnapshot, (character) => character.name === socket.character.name);

			const socketIndex = clients.findIndex((item) => item.socketID === socket.id);
			clients.splice(socketIndex, 1);

			console.log(`[World Server] User: ${socket.character.name} logged off`);
		} else {
			console.log(`[World Server] IP: ${socket.handshake.address} disconnected | Reason: ${socket.dcReason} | ${reason}`);
		}
	});
});

// Game Logic
function update() {
	// Send update only to maps with players in them (SocketIO Rooms)
	// Sent to (GameState_MMO)
	if (Map.getActiveMaps().length > 0) {
		Map.getActiveMaps().forEach((mapID) => {
			io.to(mapID).emit('newSnapshot', {
				timestamp: Date.now().toString(),
				worldSnapshot
			});
		});
	} else {
		// No players in any maps so don't emit anything
		// console.log('No active maps');
	}

	// console.log(worldSnapshot);
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
