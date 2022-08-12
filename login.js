require('pretty-error').start();

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
	transports: ['websocket'],
	allowUpgrades: false
});

const request = require('request');
const chalk = require('chalk');

const config = require('./_config.json');

const { port } = config.loginserver;

const clients = [];

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
	res.status(403).end();
});

io.on('connection', (socket) => {
	require('./src/handlers/login/login-handler')(io, socket, clients);

	console.log(chalk.yellow('[Login Server]'), `Connect | IP: ${socket.handshake.address}`);

	// Ping World Server and Send Server Version
	// WRONG
	/*
	- Client should send the correct md5 hash
	- The server checks the md5 hash the client sends and sends a callback if it's valid or invalid
	- config.md5_hash
	*/
	socket.on('handshakeWS', (clientVersion, callback) => {
		// request(`http://127.0.0.1:${config.worldserver.port}`, (err) => {
		request('https://projectmmo-test.herokuapp.com:7575/', (err) => {
			if (!err) {
				callback({
					worldServer: 'ONLINE',
					serverVersion: config.version
				});
			} else {
				callback('OFFLINE');
			}
		});
	});
});

http.listen(port, () => {
	// Connect to DB
	require('./db');

	console.log(chalk.yellow('[Login Server] Starting Login Server... Port:', port));
});
