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

const _ = require('lodash');
const Item = require('./src/models/Item');
const Map = require('./src/world/Map')(io);

const TICK_RATE = 20; // 0.1sec or 100ms
// eslint-disable-next-line no-unused-vars
let tick = 0;

const config = require('./_config.json');
// const _ = require('lodash');

const { serverMessage } = config.worldserver;
const port = process.env.PORT || 7575;

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
	Map.getActiveMaps().forEach((mapID) => {
		// if the mapID doesn't exist in the worldSnapshotByMapID create it
		if (!worldSnapshotByMapID[mapID]) {
			worldSnapshotByMapID[mapID] = { characterStates: [], itemsOnTheGround: [] };
		} else {
			io.to(parseInt(mapID, 10)).emit('newSnapshot', {
				timestamp: Date.now().toString(),
				worldSnapshot: worldSnapshotByMapID[parseInt(parseInt(mapID, 10), 10)].characterStates
			});

			// Remove worldSnapshot after processing states
			worldSnapshotByMapID[parseInt(mapID, 10)].characterStates = [];

			// Client receives newSnapshot of each character in the map
			// worldSnapshotByMapID[mapID].forEach((characterSnapshot) => {
			// 	io.to(parseInt(mapID, 10)).emit('newSnapshot', characterSnapshot);

			// 	// Remove a characterSnapshot from worldSnapshotByMapID by character name after sending to clients
			// 	_.remove(worldSnapshotByMapID[mapID], (character) => character.name === characterSnapshot.name);

			// 	// console.log(characterSnapshot);
			// });

			const now = Date.now();
			const secondsToKeepItemOnTheGround = 60;

			// Delete items from itemsOnTheGround that are older than 60 seconds
			_.remove(worldSnapshotByMapID[mapID].itemsOnTheGround, (item) => {
				return now - item.createdAt > secondsToKeepItemOnTheGround * 1000;
			}).forEach((item) => {
				Item.deleteByID(item._id);
				io.emit('removeItem', item);

			// console.log(chalk.yellow(`[Item Factory] Removed ID: ${item._id} | Item ID: ${item.itemID}`));
			});
		}
	});
};

const cleanup = () => {
	// Remove inactive maps after 60 seconds
};

// Run cleanup every 10 seconds to remove inactive maps from worldSnapshotByMapID
setInterval(cleanup, 60000);

// Item Spawning Test
setInterval(() => {
	// Round the numbers to 2 decimal places
	const mapID = '1';

	if (worldSnapshotByMapID[mapID]) {
		Item.createItem({
			// random int between 10 and 11
			itemID: Math.floor(Math.random() * (11 - 10 + 1)) + 10,
		}).then((item) => {
			io.to(1).emit('spawnItem', {
				_id: item._id,
				itemID: item.itemID,
				location: {
					x: 100,
					y: 70,
					z: 100 // Height
				},
				createdAt: new Date(item.createdAt).getTime().toString(),
				randomX: Math.random() * (1000 - (-1000)) + (-1000),
				randomY: Math.random() * (1000 - (-1000)) + (-1000),
				zHeight: 3000
			});

			worldSnapshotByMapID[mapID].itemsOnTheGround.push({
				_id: item._id,
				itemID: item.itemID,
				createdAt: new Date(item.createdAt).getTime().toString(),
			});
		}).catch((err) => {
			console.log(err);
		});
	}
}, 5000);

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
