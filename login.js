import PrettyError from 'pretty-error';
import express from 'express';
import bodyParser from 'body-parser';
// import { createServer } from 'http';
import { createServer } from 'https';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import request from 'request';
import chalk from 'chalk';
import * as fs from 'fs';

import db from './db.js';
import loginHandler from './src/handlers/login/login-handler.js';

const options = {
	key: fs.readFileSync('loginCert/privkey1.pem'),
	cert: fs.readFileSync('loginCert/cert1.pem'),
	ca: fs.readFileSync('loginCert/chain1.pem')
};

// eslint-disable-next-line no-unused-vars
const PE = new PrettyError();
const app = express();
const httpsServer = createServer(options, app);
const io = new Server(httpsServer, {
	transports: ['websocket'],
	allowUpgrades: true
});

const config = JSON.parse(fs.readFileSync('./_config.json'));
const port = process.env.PORT || config.loginserver.port;

const clients = [];

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
	res.status(403).end();
});

io.on('connection', (socket) => {
	// eslint-disable-next-line no-unused-vars
	jwt.verify(socket.handshake.query.token, 'projectMMOisAwesome', (err, decoded) => {
		if (err) {
			// console.log(err);
			console.log(chalk.red(`[Login Server] Invalid Token | IP: ${socket.handshake.address}`));
			socket.emit('loginService', {
				type: 'error',
				reason: 'token'
			});
			socket.disconnect();
		} else {
			loginHandler(io, socket, clients);

			console.log(chalk.yellow('[Login Server]'), `Connect | IP: ${socket.handshake.address}`);

			// Ping World Server and Send Server Version
			// WRONG
			/*
			- Client should send the correct md5 hash
			- The server checks the md5 hash the client sends and sends a callback if it's valid or invalid
			- config.md5_hash
			*/
			socket.on('handshakeWS', (clientVersion, callback) => {
				// request(`http://127.0.0.1:${config.worldserver.port}/status`, (err, res, body) => {
				request('http://5.161.155.210:7575/status', (err, res, body) => {
					const data = JSON.parse(body);
					if (data.status === 'ONLINE') {
						callback({
							worldServer: 'ONLINE',
							serverVersion: config.version
						});
					} else {
						callback('OFFLINE');
					}
				});
			});
		}
	});
});

httpsServer.listen(port, () => {
	db.connect();

	console.log(chalk.yellow('[Login Server] Starting Login Server... Port:', port));
});
