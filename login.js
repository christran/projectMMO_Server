require('pretty-error').start();

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

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
	socket.on('handshakeWS', (clientVersion, callback) => {
		request(`http://127.0.0.1:${config.worldserver.port}`, (err) => {
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
	require('./db');

	console.log(chalk.yellow('[Login Server] Starting Login Server... Port:', port));
});
