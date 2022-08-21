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
		if (data.message.charAt(0) === '!') {
			const gmCommand = data.message.substr(1);

			// Teleport to Map Command
			if (gmCommand.startsWith('goto')) {
				const mapID = data.message.slice(6);
				if (mapID && mapID.match(/^[0-9]+$/)) {
					console.log(`Teleported to Map ID: ${mapID}`);
					// Teleport player to map
				} else {
					console.log('Please provide a Map ID');
				}
			} else {
				console.log(`Invalid GM Command: ${gmCommand}`);
			}
		} else {
			switch (data.msgtype) {
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
				console.log(`[Local Chat] ${combinedMsg}`);
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
			socket.character.id = character.accountID;
			socket.character.name = character.name;
			socket.character.mapID = character.mapID;

			socket.emit('chatService', {
				error: false,
			});

			console.log(chalk.magenta(`[Chat Server] ${socket.character.name} connected to the chat server`));
		} else {
			console.log(chalk.magenta(`[Chat Server] IP: ${socket.handshake.address} tried to connect to the chat server with a charater that does not exist.`));

			socket.emit('chatService', {
				error: true,
				reason: 'characterID'
			});
			// socket.disconnect();
		}
	});

	socket.on('disconnect', () => {
		if (socket.character) {
			console.log(chalk.magenta(`[Chat Server] ${socket.character.name} disconnected from the chat server`));
		} else {
			console.log(chalk.magenta(`[Chat Server] IP: ${socket.handshake.address} disconnected from the chat server`));
		}
	});
};
