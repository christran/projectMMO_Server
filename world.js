const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http').Server(app);
global.io = require('socket.io')(http);
global.db = require("./db");

const stuff = require('./utils/stuff');
const path = require('path');
const fs = require('fs');
const jsonfile = require('jsonfile');
const chalk = require('chalk');

const TICK_RATE = 10; // 0.1sec or 100ms
let tick = 0;

const _config = require('./_config.json');
const port = _config.worldserver.port;

global.Maps = {};
global.clients = [];

// Load All Models (Schema)
fs.readdirSync('models').forEach(function(file) {
  require("./models/" + file);
});

// Load Maps.wz into memory
fs.readdirSync('game/maps/').forEach((file) => {
	let mapID = path.basename(file, '.json');
	
	Maps[mapID] = jsonfile.readFileSync('game/maps/' + file);
});

console.log('[Loaded] Maps.wz');

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
	// Require all Handlers/Factorys
	const player_handler = require('./handlers/player-handler')(socket, io, clients, tick);
	const chat_handler = require('./handlers/chat-handler')(socket, io);
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