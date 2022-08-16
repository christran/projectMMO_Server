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

const TICK_RATE = 10; // 0.1sec or 100ms
// eslint-disable-next-line no-unused-vars
let tick = 0;

const config = require('./_config.json');
// const _ = require('lodash');

const { serverMessage } = config.worldserver;
const port = process.env.PORT || 7575;

const clients = [];
const worldSnapshot = {};

const Map = require('./src/world/MapFactory')(io);
const ItemFactory = require('./src/world/ItemFactory')(io, worldSnapshot);

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
	require('./src/handlers/world/player-handler')(io, socket, clients, worldSnapshot);

	io.emit('updateServerMessage', serverMessage);
});

// Game Logic
const update = () => {
	// Send update only to maps with players in them (SocketIO Rooms)
	// Sent to (GameState_MMO)
	Map.getActiveMaps().forEach((mapID) => {
		// if the mapID doesn't exist in the worldSnapshotByMapID create it
		if (!worldSnapshot[mapID]) {
			worldSnapshot[mapID] = { characterStates: [], itemsOnTheGround: [] };

			io.to(parseInt(mapID, 10)).emit('newSnapshot', {
				timestamp: Date.now().toString(),
				worldSnapshot: worldSnapshot[parseInt(parseInt(mapID, 10), 10)].characterStates
			});

			// Remove worldSnapshot after processing states
			worldSnapshot[parseInt(mapID, 10)].characterStates = [];
		} else {
			io.to(parseInt(mapID, 10)).emit('newSnapshot', {
				timestamp: Date.now().toString(),
				worldSnapshot: worldSnapshot[parseInt(parseInt(mapID, 10), 10)].characterStates
			});

			// Remove worldSnapshot after processing states
			worldSnapshot[parseInt(mapID, 10)].characterStates = [];

			// Client receives newSnapshot of each character in the map
			// worldSnapshotByMapID[mapID].forEach((characterSnapshot) => {
			// 	io.to(parseInt(mapID, 10)).emit('newSnapshot', characterSnapshot);

			// 	// Remove a characterSnapshot from worldSnapshotByMapID by character name after sending to clients
			// 	_.remove(worldSnapshotByMapID[mapID], (character) => character.name === characterSnapshot.name);

			// 	// console.log(characterSnapshot);
			// });
		}

		ItemFactory.clearItemsOnTheGround(mapID, 60);
	});

	// console.log(worldSnapshotByMapID);
};

const cleanup = () => {
	// Remove inactive maps after 60 seconds
};

// Run cleanup every 10 seconds to remove inactive maps from worldSnapshotByMapID
setInterval(cleanup, 60000);

// Item Spawning Test
setInterval(() => {
	ItemFactory.spawnItem({
		itemID: _.random(10, 13),
		mapID: 1,
		x: 0,
		y: 0,
		z: 100,
		randomXY: true,
		zHeight: 3000
	});
}, 30000);

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
