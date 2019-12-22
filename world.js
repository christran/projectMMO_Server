const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
global.db = require("./db");

const stuff = require('./utils/stuff');
const path = require('path');
const fs = require('fs');
const jsonfile = require('jsonfile');
const chalk = require('chalk');

const tickrate = 10;
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
	const playerHandler = require('./handlers/player-handler')(socket, io, clients);
	const chatHandler = require('./handlers/chat-handler')(socket, io);
});

	// Send Client information about other clients in the same map
	// Tick = 10hz
	setInterval(update, 1000 / tickrate);
	
	function update () {
		let activeMaps = Object.keys(io.sockets.adapter.rooms).filter(Number);
		
		// Send update to only maps with players in them (SocketIO Rooms)
		activeMaps.forEach((mapId) => {
			for (let socketId in io.sockets.adapter.rooms[mapId].sockets) {
				if (io.sockets.adapter.rooms[mapId]) {
					io.to(mapId).emit('update', {
						[io.sockets.connected[socketId].name]: {
							position: io.sockets.connected[socketId].position
						}
					});	
				}
			}
		});
	}

//Start the Server
http.listen(port, function () {
	console.log(chalk.greenBright('[World Server] Starting World Server... Port:', port));
});