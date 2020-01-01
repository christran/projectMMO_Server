const bcrypt = require('bcrypt');
const moment = require('moment');
const chalk = require('chalk');

const db = require('../../../db');
const Account = require('../../../src/models/Account');
const Character = require('../../../src/models/Character');

module.exports = (io, socket, clients) => {
	socket.on('login', async (data, callback) => {
		const account = await Account.getAccount(data.username).catch((err) => console.log(`[Login Server] Login | Error: ${err}`));

		if (account) {
			bcrypt.compare(data.password, account.password, (err, bcryptRes) => {
				if (bcryptRes && !err) {
					if (account.ban.banType > 0) {
						// Account is banned
						const response = {
							result: 'Banned',
							banType: account.ban.banType,
							reason: account.ban.banReason
						};

						console.log(chalk.yellow('[Login Server]'), `${socket.id} tried to log in but is banned. | IP: ${socket.handshake.address}`);
						callback(response);
					} else if (account.isOnline === true) {
						// } else if (account.isOnline == true || _.find(clients, {username: account.username})) {
						// Account is already online
						const response = {
							result: 'Online',
							reason: 'This account is already logged in.'
						};

						console.log(chalk.yellow('[Login Server]'), `${socket.id} tried to login into an account that is already online. | IP: ${socket.handshake.address}`);
						callback(response);
					} else {
						const response = {
							result: 'Handshaked',
							accountID: account._id,
							lastLogin: moment(account.lastLoginDate, 'YYYY-MM-DD HH:mm:ss').fromNow() // Remove this later, only send necessary data
						};

						clients.push({
							username: account.username,
							socketID: socket.id,
							ip: socket.handshake.address
						});

						socket.username = account.username;

						// account.isOnline = true;
						account.lastLoginDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
						account.ip = socket.handshake.address;
						account.save();

						callback(response);
						console.log(chalk.yellow('[Login Server]'), `${account.username} has logged in. | IP: ${socket.handshake.address}`);
					}
				} else {
					const response = {
						result: 'InvalidPW',
						reason: 'Incorrect Password'
					};
					callback(response);
				}
			});
		} else {
			const response = {
				result: 'Invalid',
				reason: 'Username not found'
			};

			callback(response);
			console.log(chalk.yellow('[Login Server]'), `Failed Login Attempt | Username: ${data.username} | IP: ${socket.handshake.address}`);
		}
	});

	socket.on('createCharacter', async (data, callback) => {
		const newChar = new Character({
			accountID: data.accountID,
			_id: new db.mongoose.Types.ObjectId().toHexString(),
			name: data.name,
			female: false,
			skin: 1,
			hair: 1,
			eyes: 1,

			mapID: 1,
			position: {
				location: { x: 0, y: 0, z: 0 },
				rotation: { roll: 0, pitch: 0, yaw: 0 }
			},

			stats: {
				level: 1,
				job: 100,
				str: 5,
				dex: 5,
				int: 5,
				luk: 5,
				hp: 50,
				mhp: 50,
				mp: 100,
				mmp: 100,
			},

			inventory: {
				mesos: 0,
				maxSlots: [96, 96, 96, 96, 96]
			}
		});

		try {
			const saveChar = await newChar.save();

			const response = {
				result: 'Character Created'
			};

			callback(response);
			console.log(chalk.yellow('[Login Server]'), `New Character | Name: ${saveChar.name}`);
		} catch (err) {
			if (err.name === 'ValidationError') {
				// Name taken
				const response = {
					result: 'Username Taken',
					reason: 'Name is already taken'
				};

				callback(response);
			} else {
				console.log(`[Login Server] createCharacter | Error: ${err}`);
			}
		}
	});

	socket.on('deleteCharacter', async (data, callback) => {
		const deleteChar = await Character.deleteOne({ _id: data._id }).catch((err) => {
			callback('ERROR');
			console.log(`[Login Server] deleteCharacter | Error: ${err}`);
		});

		if (deleteChar.deletedCount === 1) {
			callback('OK');
		} else {
			callback('ERROR');
		}
	});

	socket.on('getCharacters', async (data, callback) => {
		const characters = await Account.getCharacters(data.accountID).catch((err) => console.log(`[Login Server] getCharacters | Error: ${err}`));

		callback(characters);
	});

	socket.on('selectCharacter', async (data) => {
		const character = await Character.getCharacterByID(data._id).catch((err) => console.log(`[Login Server] selectCharacter | Error: ${err}`));

		if (character) {
			socket.handoffToWorldServer = true;
			socket.emit('handoffToWorldServer', character);
		} else {
			console.log(`[Login Server] IP: ${socket.handshake.address} tried to select a character not tied to their account.`);
		}
	});

	socket.on('disconnect', () => {
		// Check if user was logged in and set isOnline to false.
		if (!socket.handoffToWorldServer && socket.username) {
			Account.getAccount(socket.username)
				.then((account) => {
					account.isOnline = false;
					account.save();
				})
				.catch((err) => {
					console.log(`[Login Server] ${err}`);
				});

			console.log(chalk.yellow('[Login Server]'), `Disconnect | User: ${socket.username} | Total Connected: ${clients.length}`);
		} else {
			console.log(chalk.yellow('[Login Server]'), `Disconnect | IP: ${socket.handshake.address} | Total Connected: ${clients.length}`);
		}

		const socketIndex = clients.findIndex((item) => item.socketID === socket.id);
		clients.splice(socketIndex, 1);
	});
};
