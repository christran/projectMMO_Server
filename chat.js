import PrettyError from 'pretty-error';
import express from 'express';
import bodyParser from 'body-parser';
import http from 'http';
import https from 'https';
import { Server } from 'socket.io';
import { io as clientIO } from 'socket.io-client';

import jwt from 'jsonwebtoken';

import chalk from 'chalk';
import * as fs from 'fs';

import { connect } from './db.js';

import Character from './src/models/Character.js';
import chatHandler from './src/handlers/chat/chat-handler.js';

const config = JSON.parse(fs.readFileSync('./_config.json'));

// eslint-disable-next-line no-unused-vars
const PE = new PrettyError();
const app = express();
const server = config.dev ? http.createServer(app) : https.createServer({
	// npm-5
	key: fs.readFileSync('/root/opt/nginx-pm/letsencrypt/live/npm-5/privkey.pem'),
	cert: fs.readFileSync('/root/opt/nginx-pm/letsencrypt/live/npm-5/cert.pem'),
	ca: fs.readFileSync('/root/opt/nginx-pm/letsencrypt/live/npm-5/chain.pem')
}, app);

const io = new Server(server, {
	transports: ['websocket'],
	allowUpgrades: false
});

const port = process.env.PORT || config.chatserver.port;

const clients = [];

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Server Web Client
app.get('/', (req, res) => {
	res.redirect('https://projectmmo.dev');
});

// const worldServerIP = config.dev ? 'http://192.168.1.97:7575' : 'https://world.projectmmo.dev';
const worldServerIP = config.dev ? 'http://64.181.238.97:7575' : 'http://64.181.238.97:7575'; // TODO: remove this and update ssl and stuff

const clientSocket = clientIO(worldServerIP, {
	transports: ['websocket'],
	query: {
		token: jwt.sign({}, 'projectMMOisAwesome')
	}
});

io.on('connection', (socket) => {
	// eslint-disable-next-line no-unused-vars
	jwt.verify(socket.handshake.query.token, 'projectMMOisAwesome', async (err, decoded) => {
		if (err) {
			// console.log(err);
			console.log(chalk.red(`[Chat Server] Invalid Token | IP: ${socket.handshake.address}`));
			socket.emit('chatService', {
				type: 'error',
				reason: 'token'
			});
			socket.disconnect();
		} else {
			// Require all handlers
			chatHandler(io, socket, clients, clientSocket);

			// Authenticate User to Chat Server
			const character = await Character.getCharacterByID(socket.handshake.query.characterID).catch((err) => console.log(`[Chat Server] helloworld | Error: ${err}`));

			if (character) {
				socket.character = character;

				socket.join(parseInt(character.map_id, 10));

				socket.emit('chatService', {
					type: 'connected'
				});

				console.log(chalk.magenta(`[Chat Server] ${character.name} ${chalk.green(`#${character.tagline}`)} connected to the chat server`));
			} else {
				console.log(chalk.magenta(`[Chat Server] IP: ${socket.handshake.address} tried to connect to the chat server with a charater that does not exist.`));

				socket.emit('chatService', {
					type: 'error',
					reason: 'characterID'
				});
				// socket.disconnect();
			}
		}
	});
});

server.listen(port, () => {
	connect();

	console.log(chalk.greenBright(`[Chat Server] Starting Chat Server... Port: ${port}`));

	clientSocket.on('connect', () => {
		console.log(`[Chat Server] Connected to World Server: ${worldServerIP}`);
	});

	clientSocket.on('connect_error', (err) => {
		console.log(`[Chat Server] Error connecting to World Server: ${err.message}`);
	});
});
