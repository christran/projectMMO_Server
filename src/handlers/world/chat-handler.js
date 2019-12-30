module.exports = function(socket, io) {
    socket.on('chat', function(data) {
		let combinedMsg = data.playerName+ ': ' + data.message;

		// GM Commands
		if (data.message.charAt(0) == '!') {
			let gmCommand = data.message.substr(1);

			// Teleport to Map Command
			if (gmCommand.startsWith('goto')) {
				let mapID = data.message.slice(6);
				if (mapID && mapID.match(/^[0-9]+$/)) {
					console.log('Teleported to Map ID: ' + mapID);
					// Teleport player to map
				} else {
					console.log('Please provide a Map ID');
				}
			} else {
				console.log('Invalid GM Command: ' + gmCommand);
			}
		} else {
			io.emit('chat', combinedMsg);
			console.log('[All Chat] ' + combinedMsg);
		}

	});
}