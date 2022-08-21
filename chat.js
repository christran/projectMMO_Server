import PrettyError from 'pretty-error';
import express from 'express';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import chalk from 'chalk';
import * as fs from 'fs';

import db from './db.js';

import chatHandler from './src/handlers/chat/chat-handler.js';

// eslint-disable-next-line no-unused-vars
const PE = new PrettyError();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
	transports: ['websocket'],
	allowUpgrades: false
});

const config = JSON.parse(fs.readFileSync('./_config.json'));
const port = process.env.PORT || config.chatserver.port;

const clients = [];

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Server Web Client
app.get('/', (req, res) => {
	res.status(403).end();
});

io.on('connection', (socket) => {
	// eslint-disable-next-line no-unused-vars
	jwt.verify(socket.handshake.query.token, 'projectMMOisAwesome', (err, decoded) => {
		if (err) {
			// console.log(err);
			console.log(chalk.red(`[Chat Server] Invalid Token | IP: ${socket.handshake.address}`));
			socket.emit('chatService', {
				error: true,
				reason: 'token'
			});
			socket.disconnect();
		} else {
			// Require all handlers
			chatHandler(io, socket, clients);
		}
	});
});

httpServer.listen(port, () => {
	db.connect();

	console.log(chalk.greenBright(`[Chat Server] Starting Chat Server... Port: ${port}`));
});
