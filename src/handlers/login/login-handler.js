import bcrypt from 'bcrypt';
import moment from 'moment';
import chalk from 'chalk';

import { sql } from '../../../db.js';

import Account from '../../models/Account.js';
import Character from '../../models/Character.js';

export default (io, socket, clients) => {
	socket.on('login', async (data, callback) => {
		const account = await Account.getAccount(data.username).catch((err) => console.log(`[Login Server] Login | Error: ${err}`));

		if (account) {
			const bcryptRes = await bcrypt.compare(data.password, account.password);
			if (bcryptRes) {
				if (account.banType > 0) {
					// Account is banned
					const response = {
						result: 'banned',
						banType: account.banType,
						reason: account.banReason
					};

					console.log(chalk.yellow('[Login Server]'), `${socket.id} tried to log in but is banned. | IP: ${socket.handshake.address}`);
					callback(response);
				} else if (account.is_online === true) {
					// } else if (account.isOnline == true || _.find(clients, {username: account.username})) {
					// Account is already online
					const response = {
						result: 'alreadyOnline',
						reason: 'This account is already logged in.'
					};

					console.log(chalk.yellow('[Login Server]'), `${socket.id} tried to login into an account that is already online. | IP: ${socket.handshake.address}`);
					callback(response);
				} else {
					const lastLoginDate = account.last_login_date
						? moment(account.last_login_date).fromNow()
						: 'First login';

					const response = {
						result: 'success',
						accountID: account.id,
						lastLogin: lastLoginDate, // Remove this later, only send necessary data
						settings: {
							inventoryPos: {
								x: account.inventory_pos_x,
								y: account.inventory_pos_y
							},
							chatPos: {
								x: account.chat_pos_x,
								y: account.chat_pos_y
							}
						},
					};

					clients.push({
						username: account.username,
						socketID: socket.id,
						ip: socket.handshake.address
					});

					socket.username = account.username;

					// account.isOnline = true;
					// account.lastLoginDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');

					await Account.updateAccount(account.id, {
						// is_online: true,
						last_login_date: new Date(),
						ip: socket.handshake.address
					});

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
		try {
			const tagline = await Character.generateTagline(data.name);

			if (!tagline) {
				throw new Error('Failed to generate tagline');
			}

			const newCharData = {
				accountID: data.accountID,
				worldID: 0,
				name: data.name,
				tagline,
				appearance: {
					gender: 1,
					skin: 1,
					hair: 1,
					eyes: 1,
					top: 2,
					bottom: 2,
					shoes: 2,
					weapon_L: 1,
					weapon_R: 1
				},
				map_id: 1,
				location: { x: 0, y: 0, z: 25 },
				rotation: 90,
				stats: {
					level: 1,
					job: 100,
					str: 5,
					dex: 5,
					int: 5,
					luk: 5,
					hp: 50,
					max_hp: 50,
					mp: 100,
					max_mp: 100,
					ap: 0,
					sp: 0,
					exp: 0,
					fame: 0
				},
				mesos: 0,
			};

			const savedCharacter = await Character.create(newCharData);

			if (savedCharacter) {
				callback({ result: 'success' });
				console.log(chalk.yellow('[Login Server]'), `New Character | Name: ${savedCharacter.name}`);
			} else {
			// Handle cases where character creation might fail for other reasons
				console.error('[Login Server] Character creation failed for unknown reason');
				callback({ result: 'error', reason: 'Character creation failed' });
			}
		} catch (err) {
			console.error('[Login Server] createCharacter | Error:', err);
			if (err.code === '23505' && err.detail.includes('name')) {
			// PostgreSQL unique constraint violation (error code 23505) for 'name'
				callback({ result: 'nameTaken', reason: 'Character name is already taken' });
			} else {
				callback({ result: 'error', reason: 'Failed to create character' });
			}
		}
	});

	socket.on('deleteCharacter', async (data, callback) => {
		try {
			const deleted = await Character.delete(data._id); // client side error _id is probably a int in ue5

			if (deleted) {
				callback('OK');
			} else {
				console.error('[Login Server] deleteCharacter | Character not found or not deleted');
				callback('ERROR');
			}
		} catch (err) {
			console.error('[Login Server] deleteCharacter | Error:', err);
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

	socket.on('disconnect', async () => {
		const socketIndex = clients.findIndex((item) => item.socketID === socket.id);
		const account = await Account.getAccount(socket.username).catch((err) => console.log(`[Login Server] Login | Error: ${err}`));

		// Check if user was logged in and set isOnline to false.
		if (!socket.handoffToWorldServer && socket.username) {
			await Account.updateAccount(account.id, {
				is_online: false
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
