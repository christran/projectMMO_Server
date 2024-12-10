import PrettyError from 'pretty-error';
import express from 'express';
import bodyParser from 'body-parser';
import http from 'http';
import https from 'https';

import { Server } from 'socket.io';

// eslint-disable-next-line no-unused-vars
import { createAdapter } from '@socket.io/redis-adapter';
import { Emitter } from '@socket.io/redis-emitter';
import { createClient } from 'redis';

import jwt from 'jsonwebtoken';

import _ from 'lodash';
import chalk from 'chalk';
import * as fs from 'fs';
import pm2IO from '@pm2/io';

import { connect } from './db.js';
import MapFactory from './src/world/MapFactory.js';
import ItemFactory from './src/world/ItemFactory.js';
import MobFactory from './src/world/MobFactory.js';
import NPCFactory from './src/world/NPCFactory.js';

import playerHandler from './src/handlers/world/player-handler.js';
import chatHandler from './src/handlers/world/chat-handler.js';

const config = JSON.parse(fs.readFileSync('./_config.json'));

// eslint-disable-next-line no-unused-vars
const PE = new PrettyError();
const app = express();

const server = config.dev ? http.createServer(app) : https.createServer({
	// npm-4
	key: fs.readFileSync('/root/opt/nginx-pm/letsencrypt/live/npm-4/privkey.pem'),
	cert: fs.readFileSync('/root/opt/nginx-pm/letsencrypt/live/npm-4/cert.pem'),
	ca: fs.readFileSync('/root/opt/nginx-pm/letsencrypt/live/npm-4/chain.pem')
}, app);

const io = new Server(server, {
	transports: ['websocket'],
	allowUpgrades: false
});

const pubClient = createClient({ url: 'redis://192.168.1.97:6379' });
// eslint-disable-next-line no-unused-vars
const subClient = pubClient.duplicate();

// eslint-disable-next-line no-unused-vars
const emitter = new Emitter(pubClient);

// const TICK_RATE = 20; // 0.1sec or 100ms

const port = process.env.PORT || config.worldserver.port;

const world = {};
const clients = [];
const serverStartTime = Date.now();

const Map = MapFactory(io, world);
const Item = ItemFactory(io, world);
const Mob = MobFactory(io, world);
const NPC = NPCFactory(io, world);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Server Web Client
app.get('/', (req, res) => {
	res.redirect('https://projectmmo.dev');
});

app.get('/status', (req, res) => {
	res.json(
		{
			status: 'ONLINE',
			ip: server.address().address,
			port: server.address().port,
			totalClients: io.engine.clientsCount,
			totalMaps: Object.keys(world).length,
			uptime: Math.floor((Date.now() - serverStartTime) / 1000),
		}
	);
});

const totalClients = pm2IO.metric({
	name: 'Clients'
});

const activeMaps = pm2IO.metric({
	name: 'Active Maps'
});

setInterval((() => {
	totalClients.set(io.engine.clientsCount);
	activeMaps.set(Object.keys(world).length);
}), 1000);

// Mob Spawning Test
// eslint-disable-next-line no-unused-vars
const mobSpawnTest = () => {
	const map_id = 1;

	if (world[map_id]) {
		Mob.spawn(map_id, {
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
	const map_id = 1;

	if (world[map_id]) {
		NPC.spawn(map_id, {
			npcs:
			[
				{
					npcID: 1234,
					location: {
						x: 0,
						y: 100,
						z: 25
					},
					rotation: 90
				}
			]
		});
	}
};

// Item Spawning Test
const itemSpawnTest = () => {
	const map_id = 1;

	if (world[map_id]) {
		Item.spawn(map_id, {
			items: [
				{
					item_id: _.random(10, 16),
					amount: _.random(0, 3)
				},
				{
					item_id: _.random(10, 16),
					amount: _.random(0, 3)
				},
				{
					item_id: _.random(15, 16),
					amount: _.random(0, 3)
				}],
			x: -100,
			y: 250,
			z: 100,
			randomXY: true,
			zHeight: 3000
		});
	}

	setTimeout(itemSpawnTest, _.random(3, 10) * 3000);
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
			playerHandler(io, socket, world, clients);
			chatHandler(io, socket, world, clients);

			setTimeout(() => {
				// npcSpawnTest();
				// mobSpawnTest();
				// io.emit('worldService', { type: 'billboardURL', billboardURL: 'https://reddit.com', update: true });
				io.emit('worldService', { type: 'server_message', message: 'Welcome to the Pre Pre Alpha Test!', update: true });
			}, 1000);
		}
	});
});

// Server Game Loop
const update = () => {
	Object.keys(world).forEach((map_id) => {
		const parsedMapID = parseInt(map_id, 10);
		const currentMap = world[parsedMapID];
		
		if (currentMap.characterStates) {
			// Process physics updates as before
			Object.values(currentMap.characterStates).forEach(character => {
				// Update position based on velocity and deltaTime
				const currentTime = Date.now();
				const deltaTime = (currentTime - character.lastInputTimestamp) / 1000; 

				console.log(currentTime, character.lastInputTimestamp, deltaTime);

				character.location.x += character.velocity.x * deltaTime;
				character.location.y += character.velocity.y * deltaTime;
				character.location.z = 90; // hardcoded for now
				
				// character.location.z += character.velocity.z * deltaTime;

				// // Basic ground collision (assuming ground is at z=0)
				// if (character.location.z <= 0) {
				// 	character.location.z = 0;
				// 	character.velocity.z = 0;
				// } else {
				// 	// Apply gravity
				// 	character.velocity.z -= 980 * deltaTime; // approximate gravity
				// }
			});

			// console.log(world[parsedMapID].characterStates);
			io.to(parsedMapID).emit('snapshot', {
				mapSnapshot: world[parsedMapID].characterStates,
				timestamp: Date.now()
			});

		}
	});

	// Run cleanup every minute
	Map.removeInactiveMaps(1);
};

// Game Loop
const hrtimeMs = () => {
	const time = process.hrtime();
	return time[0] * 1000 + time[1] / 1000000;
};

const tickLengthMs = 1000 / config.worldserver.updateRate;
// eslint-disable-next-line no-unused-vars
let tick = 0;
let previous = hrtimeMs();

const gameLoop = () => {
	setTimeout(gameLoop, tickLengthMs);

	const now = hrtimeMs();
	// eslint-disable-next-line no-unused-vars
	const delta = (now - previous) / 1000;
	// console.log('delta', delta)

	// Update Loop
	update();

	previous = now;
	tick += 1;
};

// Run Item Cleanup every 30 seconds
// Remove items that have been on the ground for more than 60 seconds
// setInterval(() => {
// 	Object.keys(world).forEach((map_id) => {
// 		if (world[map_id].itemsOnTheGround.length > 0) {
// 			Map.clearItemsOnTheGround(map_id, 60);
// 		}
// 	});
// }, 30000);

pubClient.on('error', (err) => {
	console.log(err);
});

server.listen(port, () => {
	// Register World Server to Master Server

	// Connect to DB
	connect();

	// Start the Game LOop
	gameLoop();

	console.log(chalk.greenBright(`[World Server] Starting World Server... Port: ${port}`));
});

// Redis
// Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
// 	io.adapter(createAdapter(pubClient, subClient));
// 	server.listen(port, () => {
// 		// Register World Server to Master Server

// 		// Connect to DB
// 		db.connect();

// 		// Start the Game LOop
// 		gameLoop();

// 		console.log(chalk.greenBright(`[World Server] Starting World Server... Port: ${port}`));
// 	});
// });
