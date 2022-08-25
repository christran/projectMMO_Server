import chalk from 'chalk';

// eslint-disable-next-line no-unused-vars
import Account from '../../models/Account.js';
import Character from '../../models/Character.js';

// eslint-disable-next-line no-unused-vars
export default (io, socket, clients) => {
	// add chat messages to database
	socket.on('chat', (data) => {
		const { character } = socket;

		const combinedMsg = `${character.name}: ${data.message}`;

		// GM Commands
		// on the client side if the character is not GM then don't send the message and just clear it client side
		// check if account is GM
		if (data.message.charAt(0) === '!') {
			// remove the ! from the message
			const msg = data.message.slice(1);
			const command = msg.split(' ')[0];
			const args = msg.split(' ').slice(1);

			// Teleport to Map Command
			switch (command) {
			case 'map':
				if (args[0] && args[0].match(/^[0-9]+$/)) {
					console.log(`[GM Command] ${socket.character.name} teleported to Map ID: ${args[0]}`);
					// Teleport player to map
				} else {
					console.log(`[GM Command] ${socket.character.name}  No Map ID Provided`);
				}
				break;
			case 'spawn':
				console.log(`[GM Command] Spawning Mob ID: ${args[0]} | Amount: ${args[1]} | Map ID: ${socket.character.mapID}`);
				break;
			case 'item':
				console.log(`[GM Command] Spawning Item ID: ${args[0]} | Amount: ${args[1]} | Map ID: ${socket.character.mapID}`);
				break;
			case 'dc':
				console.log(`[GM Command] Disconnecting Character: ${args[0]}`);
				break;
			default:
				console.log(`[GM Command] ${socket.character.name}  Invalid Command: !${command} ${args}`);
				break;
			}
		} else {
			switch (data.type) {
			case 'all':
				socket.broadcast.emit('newMessage', {
					type: 'all',
					name: character.name,
					message: data.message
				});
				console.log(`[All Chat] ${combinedMsg}`);
				break;
			case 'local':
				socket.to(socket.character.mapID).emit('newMessage', {
					type: 'local',
					name: character.name,
					message: data.message
				});
				console.log(`[Local Chat | MapID: ${character.mapID}] ${combinedMsg}`);
				break;
			default:
				break;
			}
		}
	});

	// Authenticate User to Chat Server
	socket.on('helloworld', async () => {
		const character = await Character.getCharacterByID(socket.handshake.query.characterID).catch((err) => console.log(`[Chat Server] helloworld | Error: ${err}`));

		// Get buddy list

		if (character) {
			socket.character = {};
			socket.character.id = character._id;
			socket.character.name = character.name;
			socket.character.mapID = character.mapID;

			socket.join(parseInt(character.mapID, 10));

			socket.emit('chatService', {
				type: 'connected'
			});

			console.log(chalk.magenta(`[Chat Server] ${socket.character.name} connected to the chat server`));
		} else {
			console.log(chalk.magenta(`[Chat Server] IP: ${socket.handshake.address} tried to connect to the chat server with a charater that does not exist.`));

			socket.emit('chatService', {
				type: 'error',
				reason: 'characterID'
			});
			// socket.disconnect();
		}
	});

	socket.on('setMapID', (mapID) => {
		const newMapID = parseInt(mapID, 10);

		if (!socket.character) {
			socket.character = {};
			socket.leave(socket.character.mapID);
			socket.join(newMapID);
			socket.character.mapID = newMapID;
		}

		socket.leave(socket.character.mapID);
		socket.join(newMapID);
		socket.character.mapID = newMapID;
		console.log(`[Chat Server] ${socket.character.name} moved to Map ID: ${mapID}`);
	});

	socket.on('disconnect', () => {
		if (socket.character) {
			console.log(chalk.magenta(`[Chat Server] ${socket.character.name} disconnected from the chat server`));
		} else {
			console.log(chalk.magenta(`[Chat Server] IP: ${socket.handshake.address} disconnected from the chat server`));
		}
	});
};
