import PrettyError from 'pretty-error';
import express from 'express';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { createAdapter } from '@socket.io/redis-adapter';
import { Emitter } from '@socket.io/redis-emitter';
import { createClient } from 'redis';

import jwt from 'jsonwebtoken';

import _ from 'lodash';
import chalk from 'chalk';
import * as fs from 'fs';

import db from './db.js';
import MapFactory from './src/world/MapFactory.js';
import ItemFactory from './src/world/ItemFactory.js';
import MobFactory from './src/world/MobFactory.js';
import NPCFactory from './src/world/NPCFactory.js';

import playerHandler from './src/handlers/world/player-handler.js';

// eslint-disable-next-line no-unused-vars
const PE = new PrettyError();
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
	transports: ['websocket'],
	allowUpgrades: false
});

const pubClient = createClient({ url: 'redis://192.168.86.14:6379' });
const subClient = pubClient.duplicate();

const emitter = new Emitter(pubClient);

const TICK_RATE = 10; // 0.1sec or 100ms
// eslint-disable-next-line no-unused-vars
let tick = 0;

const config = JSON.parse(fs.readFileSync('./_config.json'));
const port = process.env.PORT || config.worldserver.port;

const world = {};
const serverStartTime = Date.now();

const Map = MapFactory(io, world);
const Item = ItemFactory(io, world);
const Mob = MobFactory(io, world);
const NPC = NPCFactory(io, world);

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
			ip: httpServer.address().address,
			port: httpServer.address().port,
			totalClients: io.engine.clientsCount,
			totalMaps: Object.keys(world).length,
			uptime: Math.floor((Date.now() - serverStartTime) / 1000),
		}
	);
});

// Mob Spawning Test
// eslint-disable-next-line no-unused-vars
const mobSpawnTest = () => {
	const mapID = 1;

	if (world[mapID]) {
		Mob.spawn(mapID, {
			mobs:
			[
				{
					mobID: 100100,
					location: {
						x: 0,
						y: 0,
						z: 0
					},
					rotation: 0,
					amount: 1
				}
			]
		});
	}

	// setInterval(mobSpawnTest, 30 * 1000);
};

const npcSpawnTest = () => {
	const mapID = 1;

	if (world[mapID]) {
		NPC.spawn(mapID, {
			npcs:
			[
				{
					npcID: 1234,
					location: {
						x: 0,
						y: 100,
						z: 0
					},
					rotation: 90
				}
			]
		});
	}
};

// Item Spawning Test
const itemSpawnTest = () => {
	const mapID = 1;

	if (world[mapID]) {
		Item.spawn(mapID, {
			items: [
				{
					id: _.random(10, 14),
					amount: 1
				},
				{
					id: _.random(10, 14),
					amount: 2
				}],
			x: -100,
			y: 250,
			z: 100,
			randomXY: true,
			zHeight: 3000
		});
	}

	setTimeout(itemSpawnTest, _.random(3, 10) * 1000);
};

itemSpawnTest();

io.on('connection', (socket) => {
	// eslint-disable-next-line no-unused-vars
	jwt.verify(socket.handshake.query.token, 'projectMMOisAwesome', (err, decoded) => {
		if (err) {
			// console.log(err);
			console.log(chalk.red(`[World Server] Invalid Token | IP: ${socket.handshake.address}`));
			socket.emit('worldService', {
				type: 'error',
				reason: 'token'
			});
			socket.disconnect();
		} else {
			// Require all handlers
			playerHandler(io, socket, world);

			socket.on('ping', () => {
				socket.emit('pong');
			});

			setTimeout(() => {
				npcSpawnTest();
				// mobSpawnTest();
				// io.emit('worldService', { type: 'billboardURL', billboardURL: 'https://reddit.com', update: true });
				// io.emit('worldService', { type: 'server_message', message: 'the quick brown fox jumped of the lazy dog', update: true });
			}, 1000);
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
		}

		// console.log(world[mapID].mobs.length);
	});

	// Run cleanup every minute to remove inactive maps from the world
	Map.removeInactiveMaps(1);
};

// Run Item Cleanup every 30 seconds
// Remove items that have been on the ground for more than 60 seconds
setInterval(() => {
	Object.keys(world).forEach((mapID) => {
		if (world[mapID].itemsOnTheGround.length > 0) {
			Map.clearItemsOnTheGround(mapID, 60);
		}
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

pubClient.on('error', (err) => {
	console.log(err);
});

httpServer.listen(port, () => {
	// Register World Server to Master Server

	// Connect to DB
	db.connect();

	// Start the Game LOop
	gameLoop();

	console.log(chalk.greenBright(`[World Server] Starting World Server... Port: ${port}`));
});

// Redis
// Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
// 	io.adapter(createAdapter(pubClient, subClient));
// 	httpServer.listen(port, () => {
// 		// Register World Server to Master Server

// 		// Connect to DB
// 		db.connect();

// 		// Start the Game LOop
// 		gameLoop();

// 		console.log(chalk.greenBright(`[World Server] Starting World Server... Port: ${port}`));
// 	});
// });
