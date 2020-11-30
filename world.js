require('pretty-error').start();

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const _ = require('lodash');
const chalk = require('chalk');

const Map = require('../projectMMO_Server/src/world/Map')(io);

const TICK_RATE = 10; // 0.1sec or 100ms
let tick = 0;
let delta = 0;

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
	require('./src/handlers/world/player-handler')(io, socket, clients, delta, tick);

	io.emit('updateServerMessage', serverMessage);
});


// Send Client information about other clients in the same map
function hrtimeMs() {
	const time = process.hrtime();

	return time[0] * 1000 + time[1] / 1000000;
}

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
				if (players[name].action > 0) {
					const player = {
						[name]: {
							position: players[name].position,
							action: players[name].action,
							velocity: players[name].position.velocity,
							tick
						}
					};

					playerArray.push(player);

					players[name].action = 0;
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
let previous = hrtimeMs();
const tickLengthMs = 1000 / TICK_RATE;

function gameLoop() {
	setTimeout(gameLoop, tickLengthMs);
	const now = hrtimeMs();

	delta = (now - previous) / 1000;

	// console.log(delta, tick);

	// Game Logic
	update();


	previous = now;
	tick += 1;
}

http.listen(port, () => {
	// Connect to DB
	require('./db');

	// Start the Game LOop
	gameLoop();

	console.log(chalk.greenBright(`[World Server] Starting World Server... Port: ${port}`));
});
