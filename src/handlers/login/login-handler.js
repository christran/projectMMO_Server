import bcrypt from 'bcrypt';
import moment from 'moment';
import chalk from 'chalk';

import db from '../../../db.js';

import Account from '../../models/Account.js';
import Character from '../../models/Character.js';

export default (io, socket, clients) => {
	socket.on('login', async (data, callback) => {
		const account = await Account.getAccount(data.username).catch((err) => console.log(`[Login Server] Login | Error: ${err}`));

		if (account) {
			bcrypt.compare(data.password, account.password, (err, bcryptRes) => {
				if (bcryptRes && !err) {
					if (account.ban.banType > 0) {
						// Account is banned
						const response = {
							result: 'banned',
							banType: account.ban.banType,
							reason: account.ban.banReason
						};

						console.log(chalk.yellow('[Login Server]'), `${socket.id} tried to log in but is banned. | IP: ${socket.handshake.address}`);
						callback(response);
					} else if (account.isOnline === true) {
						// } else if (account.isOnline == true || _.find(clients, {username: account.username})) {
						// Account is already online
						const response = {
							result: 'alreadyOnline',
							reason: 'This account is already logged in.'
						};

						console.log(chalk.yellow('[Login Server]'), `${socket.id} tried to login into an account that is already online. | IP: ${socket.handshake.address}`);
						callback(response);
					} else {
						const response = {
							result: 'success',
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
						// account.lastLoginDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
						account.ip = socket.handshake.address;
						account.save();

						callback(response);
						console.log(chalk.yellow('[Login Server]'), `${account.username} has logged in. | IP: ${socket.handshake.address}`);
					}
				} else {
					const response = {
						result: 'invalidPW',
						reason: 'Incorrect Password'
					};
					callback(response);
				}
			});
		} else {
			const response = {
				result: 'invalidUser',
				reason: 'Account does not exist'
			};

			callback(response);
			console.log(chalk.yellow('[Login Server]'), `Failed Login Attempt | Username: ${data.username} | IP: ${socket.handshake.address}`);
		}
	});

	socket.on('createCharacter', async (data, callback) => {
		const tagline = await Character.generateTagline(data.name);

		if (tagline) {
			const newChar = new Character({
				accountID: data.accountID,
				_id: new db.mongoose.Types.ObjectId().toHexString(),
				name: data.name,
				tagline,
				gender: 0,
				skin: 1,
				hair: 1,
				eyes: 1,
				top: 1,
				bottom: 1,
				shoes: 1,
				mapID: 1,
				location: { x: 0, y: 0, z: 0 }, // z: 25 is the ground level
				rotation: 90,

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
					result: 'success'
				};

				callback(response);
				console.log(chalk.yellow('[Login Server]'), `New Character | Name: ${saveChar.name}`);
			} catch (err) {
				console.log(err);
				// players can have the same charcater name with a unique tagline
				if (err.name === 'ValidationError') {
					// Name taken
					const response = {
						result: 'nameTaken',
						reason: 'charcater name is already taken'
					};

					callback(response);
				} else {
					console.log(`[Login Server] createCharacter | Error: ${err}`);
				}
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
		const socketIndex = clients.findIndex((item) => item.socketID === socket.id);

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

			clients.splice(socketIndex, 1);

			console.log(chalk.yellow('[Login Server]'), `Disconnect | User: ${socket.username} | Total Connected: ${clients.length}`);
		} else if (socket.handoffToWorldServer) {
			clients.splice(socketIndex, 1);

			console.log(chalk.yellow('[Login Server]'), `Handoff to World Server | User: ${socket.username}`);
		} else {
			clients.splice(socketIndex, 1);

			console.log(chalk.yellow('[Login Server]'), `Disconnect | IP: ${socket.handshake.address} | Total Connected: ${clients.length}`);
		}
	});
};
