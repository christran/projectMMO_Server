require('pretty-error').start();

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// const _ = require('lodash');
const chalk = require('chalk');

const config = require('./_config.json');

const { port } = config.chatserver;

const clients = [];

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Server Web Client
app.get('/', (req, res) => {
	res.status(403).end();
});

io.on('connection', (socket) => {
	// Require all Handlers
	require('./src/handlers/world/chat-handler')(io, socket, clients);

	socket.on('hello', (data) => {
		console.log(data);
	});

	console.log('[Chat Server] User: blank connected to chat');
});

http.listen(port, () => {
	// Connect to DB
	require('./db');

	console.log(chalk.greenBright(`[Chat Server] Starting Chat Server... Port: ${port}`));
});
