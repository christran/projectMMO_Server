import PrettyError from 'pretty-error';
import express from 'express';
import bodyParser from 'body-parser';
import http from 'http';
import https from 'https';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import request from 'request';
import chalk from 'chalk';
import * as fs from 'fs';

import { connect } from './db.js';
import loginHandler from './src/handlers/login/login-handler.js';

const config = JSON.parse(fs.readFileSync('./_config.json'));

// eslint-disable-next-line no-unused-vars
const PE = new PrettyError();
const app = express();
const server = config.dev ? http.createServer(app) : https.createServer({
	// npm-3
	key: fs.readFileSync('/root/opt/nginx-pm/letsencrypt/live/npm-3/privkey.pem'),
	cert: fs.readFileSync('/root/opt/nginx-pm/letsencrypt/live/npm-3/cert.pem'),
	ca: fs.readFileSync('/root/opt/nginx-pm/letsencrypt/live/npm-3/chain.pem')
}, app);

const io = new Server(server, {
	transports: ['websocket'],
	allowUpgrades: false
});

const port = process.env.PORT || config.loginserver.port;

const clients = [];

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
	res.redirect('https://projectmmo.dev');
});

// const worldServerIP = config.dev ? 'http://192.168.1.97:7575' : 'https://world.projectmmo.dev';
const worldServerIP = config.dev ? 'http://64.181.238.97:7575' : 'http://64.181.238.97:7575'; // TODO: remove this and update ssl and stuff
// sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 7575 -j ACCEPT

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
				// request(`http://192.168.1.97:${config.worldserver.port}/status`, (err, res, body) => {
				try {
					request(`${worldServerIP}/status`, (err, res, body) => {
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
				} catch (err) {
					callback('OFFLINE');

					console.log(chalk.yellow('[Login Server]'), 'World Server is offline');
				}
			});
		}
	});
});

server.listen(port, () => {
	connect();

	console.log(chalk.yellow('[Login Server] Starting Login Server... Port:', port));
});
