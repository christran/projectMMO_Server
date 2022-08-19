import PrettyError from 'pretty-error';
import express from 'express';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import _ from 'lodash';
import chalk from 'chalk';
import * as fs from 'fs';

import db from './db.js';
import MapFactory from './src/world/MapFactory.js';
import ItemFactory from './src/world/ItemFactory.js';

import playerHandler from './src/handlers/world/player-handler.js';

// eslint-disable-next-line no-unused-vars
const PE = new PrettyError();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
	transports: ['websocket'],
	allowUpgrades: false
});

const TICK_RATE = 10; // 0.1sec or 100ms
// eslint-disable-next-line no-unused-vars
let tick = 0;

const config = JSON.parse(fs.readFileSync('./_config.json'));
const port = process.env.PORT || config.worldserver.port;

const clients = [];
const world = {};

const Map = MapFactory(io, world);
const Item = ItemFactory(io, world);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Server Web Client
app.get('/', (req, res) => {
	res.status(403).end();
});

app.get('/status', (req, res) => {
	res.json(
		{
			status: 'ONLINE',
			totalClients: clients.length,
			totalMaps: Object.keys(world).length
		}
	);
});

io.on('connection', (socket) => {
	// eslint-disable-next-line no-unused-vars
	jwt.verify(socket.handshake.auth.token, 'projectMMOisAwesome', (err, decoded) => {
		if (err) {
			// console.log(err);
			console.log(chalk.red(`[World Server] Invalid Token | IP: ${socket.handshake.address}`));
			socket.emit('worldService', {
				error: true,
				reason: 'token'
			});
			socket.disconnect();
		} else {
			// Require all handlers
			playerHandler(io, socket, clients, world);

			socket.on('helloworld', (data) => {
				console.log(data);
			});

			// io.emit('updateServerMessage', serverMessage);
		}
	});
});

// Game Logic
const update = () => {
	// Send update only to maps with players in them (SocketIO Rooms)
	// Sent to (GameState_MMO)
	Map.getActiveMaps().forEach((mapID) => {
		if (world[mapID]) {
			io.to(parseInt(mapID, 10)).emit('snapshot', {
				timestamp: Date.now().toString(),
				mapSnapshot: world[parseInt(parseInt(mapID, 10), 10)].characterStates
			});

			// Remove worldSnapshot after processing states
			world[parseInt(mapID, 10)].characterStates = [];

			// Map.clearItemsOnTheGround(mapID, 30);
		}
	});

	// Run cleanup every minute to remove inactive maps from the world
	Map.removeInactiveMaps(1);
};

// Run Item Cleanup every 30 seconds
// Remove items that have been on the ground for more than 30 seconds
setInterval(() => {
	Map.getActiveMaps().forEach((mapID) => {
		Map.clearItemsOnTheGround(mapID, 60);
	});
}, 30000);

// Item Spawning Test
const spawnAItem = () => {
	const mapID = 1;

	if (world[mapID]) {
		Item.spawnItem({
			itemID: _.random(10, 14),
			mapID,
			x: 0,
			y: 0,
			z: 100,
			randomXY: true,
			zHeight: 3000
		});
	}

	setTimeout(spawnAItem, _.random(1, 10) * 1000);
};

spawnAItem();

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

httpServer.listen(port, () => {
	// Connect to DB
	db.connect();

	// Start the Game LOop
	gameLoop();

	console.log(chalk.greenBright(`[World Server] Starting World Server... Port: ${port}`));
});
