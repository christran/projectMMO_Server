module.exports = (io, socket, clients) => {
	socket.on('chat', (data) => {
		const combinedMsg = `${data.playerName}: ${data.message}`;

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
			io.emit('chat', combinedMsg);
			console.log(`[All Chat] ${combinedMsg}`);
		}
	});


	socket.on('disconnect', () => {
		console.log(`[Chat Server] User: blank | Total Online: ${clients.length}`);
	});
};
