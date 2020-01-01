require('pretty-error').start();

const express = require('express');

const app = express();
const bodyParser = require('body-parser');
const http = require('http').Server(app);
const io = require('socket.io')(http);
const bcrypt = require('bcrypt');
global.db = require('./db');

const moment = require('moment');
const chalk = require('chalk');

const config = require('./_config.json');

const { port } = config.loginserver;

const clients = [];

const Account = require('./src/models/Account');

function login(req, res) {
	Account.getAccount(req.body.username, (err, account) => {
		// Find Username
		if (account && !err) {
			bcrypt.compare(req.body.password, account.password, (err, bcryptRes) => {
				if (bcryptRes && !err) {
					if (account.ban.banType > 0) {
						// Account is banned
						const response = {
							result: 'Banned',
							banType: account.ban.banType,
							reason: account.ban.banReason,
						};

						console.log(`${chalk.yellow('[Login Server] ') + req.body.username} tried to log in but is banned. | IP: ${req.connection.remoteAddress}`);
						res.send(response);
					} else if (account.isOnline === true) {
						// Account is already online
						const response = {
							result: 'Online',
							reason: 'This account is already logged in.',
						};

						console.log(`${chalk.yellow('[Login Server] ') + req.body.username} tried to log in but is banned. | IP: ${req.connection.remoteAddress}`);
						res.send(response);
					} else {
						const response = {
							result: 'Handshaked',
							accountID: account._id,
							lastLogin: moment(account.lastLoginDate, 'YYYY-MM-DD HH:mm:ss').fromNow(),
						};

						res.send(response);

						account.isOnline = true;
						account.lastLoginDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
						account.ip = req.connection.remoteAddress;
						account.save();
						console.log(`${chalk.yellow('[Login Server] ') + req.body.username} has logged in. | IP: ${req.connection.remoteAddress}`);
					}
				} else {
					const response = {
						result: 'InvalidPW',
						reason: 'Incorrect Password',
					};
					res.send(response);
				}
			});
		} else {
			const response = {
				result: 'Invalid',
				reason: 'Username not found',
			};

			res.statusCode = 401;
			res.send(response);
			console.log(`${chalk.yellow('[Login Server] Failed Login Attempt | ')}Username: ${req.body.username.replace(/\r?\n|\r/g, '')} | IP: ${req.connection.remoteAddress}`);
		}

		if (err) {
			console.log(err);
		}
	});
}

function register(req, res) {
	bcrypt.genSalt(10, (err, salt) => {
		bcrypt.hash(req.body.password, salt, (err, hash) => {
			const newAccount = new Account({
				username: req.body.username,
				password: hash,
				ip: req.connection.remoteAddress,
			});

			newAccount.save((err, account) => {
				if (!err) {
					const response = {
						result: 'Account Created',
					};

					res.send(response);
					console.log(chalk.yellow(`[Login Server] New Account | Username: ${account.username}`));
				} else if (err.name === 'ValidationError') {
					const response = {
						result: 'Username Taken',
					};

					res.send(response);
				} else {
					console.log(err);
					res.redirect(req.get('referer'));
				}
			});
		});
	});
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/LoginServer/login', (req, res) => {
	login(req, res);
});

app.post('/LoginServer/register', (req, res) => {
	register(req, res);
});

app.post('/LoginServer/', (req, res) => {
	res.status(403).end();
});

app.get('/LoginServer/', (req, res) => {
	res.status(403).end();
});

io.on('connection', (socket) => {
	require('./src/handlers/login/login-handler')(io, socket, clients);

	console.log(chalk.yellow('[Login Server]'), `Connect | IP: ${socket.handshake.address}`);

	// Send the server's current version
	socket.on('serverVersion', (clientVersion, callback) => {
		callback(config.version);
	});
});

http.listen(port, () => {
	console.log(chalk.yellow('[Login Server] Starting Login Server... Port:', port));
});
