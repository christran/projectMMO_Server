const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
global.db = require("./db");

const fs = require('fs');
const chalk = require('chalk');

const TICK_RATE = 10; // 0.1sec or 100ms
let tick = 0;

const _config = require('./_config.json');
const port = _config.worldserver.port;

clients = [];

// Load All Models (Schema)
fs.readdirSync('./src/models').forEach(function(file) {
  require("./src/models/" + file);
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//Server Web Client
app.get('/', function (req, res) {
	// res.sendFile(__dirname + '/index.html');
	res.status(403).end();
});

app.get('/serverStatus', function (req, res) {
	let response =  {
		'result': 'Online'
		};
	
	res.send(response);
});

io.on('connection', function (socket) {
	// Require all Handlers
	require('./src/handlers/world/player-handler')(io, socket, clients, tick);
	require('./src/handlers/world/chat-handler')(socket);
});


	// Send Client information about other clients in the same map
	function hrtimeMs () {
		let time = process.hrtime();
	
		return time[0] * 1000 + time[1] / 1000000;
	}
	
	//let tick = 0;
	let previous = hrtimeMs();
	let tickLengthMs = 1000 / TICK_RATE;
	
	function gameLoop () {
		setTimeout(gameLoop, tickLengthMs);
		let now = hrtimeMs();
		let delta = (now - previous) / 1000;
		
		// console.log(delta, tick);

		// Game Logic
		update(delta, tick);
		previous = now;
		tick++;
	}

	// Game Logic
	function update (delta, tick) {
		let activeMaps = Object.keys(io.sockets.adapter.rooms).filter(Number);

		// Send update to only maps with players in them (SocketIO Rooms)
		// Sent to (GameState_MMO)
		if (activeMaps.length > 0) {
			activeMaps.forEach((mapId) => {
				for (let socketId in io.sockets.adapter.rooms[mapId].sockets) {
					if (io.sockets.adapter.rooms[mapId]) {
						io.to(mapId).emit('update', {
							[io.sockets.connected[socketId].character.name]: {
								position: io.sockets.connected[socketId].character.position,
								tick: tick
							}
						});	
					}
				}
			});
		} else {
			// No players in any maps so don't emit anything
			// console.log('No active maps');
		}

		// io.emit('setCurrentTick', tick);
	}

	gameLoop();

//Start the Server
http.listen(port, function () {
	console.log(chalk.greenBright(`[World Server] Starting World Server... Port: ${port}`));
});