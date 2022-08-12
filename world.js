require('pretty-error').start();

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
	transports: ['websocket'],
	allowUpgrades: false
});

// const _ = require('lodash');
const chalk = require('chalk');

const Map = require('./src/world/Map')(io);

const TICK_RATE = 20; // 0.1sec or 100ms
// eslint-disable-next-line no-unused-vars
let tick = 0;

const config = require('./_config.json');

const { port, serverMessage } = config.worldserver;

const clients = [];
const worldSnapshotByMapID = {};

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
	require('./src/handlers/world/player-handler')(io, socket, clients, worldSnapshotByMapID);

	io.emit('updateServerMessage', serverMessage);
});

// Game Logic
const update = () => {
	// Send update only to maps with players in them (SocketIO Rooms)
	// Sent to (GameState_MMO)

	// Returns strings
	const activeMaps = Object.keys(worldSnapshotByMapID);

	if (activeMaps.length > 0) {
		activeMaps.forEach((mapID) => {
			io.to(parseInt(mapID, 10)).emit('newSnapshot', {
				timestamp: Date.now().toString(),
				worldSnapshot: worldSnapshotByMapID[parseInt(parseInt(mapID, 10), 10)]
			});
		});
	}

	console.log(worldSnapshotByMapID);
};

const cleanup = () => {
	// Remove inactive mapID from worldSnapshotByMapID if the length is equal to 0
	Object.keys(worldSnapshotByMapID).forEach((mapID) => {
		if (worldSnapshotByMapID[mapID].length === 0) {
			delete worldSnapshotByMapID[mapID];
		}
	});
};

// Run cleanup every 10 seconds to remove inactive maps from worldSnapshotByMapID
setInterval(cleanup, 10000);

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

		// Update Loop
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
