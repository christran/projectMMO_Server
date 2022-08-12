// eslint-disable-next-line no-unused-vars
module.exports = (io, socket, clients) => {
	socket.on('chat', (data) => {
		const combinedMsg = `${socket.name}: ${data.message}`;

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
					msg: combinedMsg
				});
				console.log(`[All Chat] ${combinedMsg}`);
				break;
			case 'local':
				socket.to('1').emit('newMessage', {
					type: 'local',
					msg: combinedMsg
				});
				console.log(`[Local Chat] ${combinedMsg}`);
				break;
			default:
				break;
			}
		}
	});

	// Authenticate User to Chat Server
	socket.on('helloworld', (data) => {
		socket.name = data.name;

		console.log(`[Chat Server] ${data.name} connected to the chat server`);
	});

	socket.on('disconnect', () => {
		console.log(`[Chat Server] ${socket.name} disconnected from the chat server`);
	});
};
