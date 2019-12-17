const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
global.db = require("./db");

const chalk = require('chalk');

const serverConfig = require('./serverConfig.json');
const port = serverConfig.mainServer.port;

let normalizedPath = require("path").join(__dirname, "models");

// Load All Models (Schema)
require("fs").readdirSync(normalizedPath).forEach(function(file) {
  require("./models/" + file);
});

global.clients = [];

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

//Server Web Client
app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

app.get('/serverStatus', function (req, res) {
	let response =  {
		'result': 'Online'
		}
	
	res.send(response)
});

io.on('connection', function (socket) {
	// Require all Handlers/Factorys
	const playerHandler = require('./handlers/player-handler')(socket, io, clients);
	const chatHandler = require('./handlers/chat-handler')(socket, io);

	// Send Client information about other clients in the same map
	setInterval(() => {
		const arrayToObject = (arr, keyField) => Object.assign({}, ...arr.map(item => ({[item[keyField]]: item})));

		let otherClientsInMap = [...clients].filter(searchFor => searchFor.socket != socket.id);

		socket.emit('playersInMap', arrayToObject(otherClientsInMap.filter(searchFor => searchFor.mapID === parseInt(Object.keys(socket.rooms)[0])), 'name'));
	}, 1000);

});

//Start the Server
http.listen(port, function () {
	console.log(chalk.greenBright('[World Server] Listening on port: ' + port));
});
