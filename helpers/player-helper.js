module.exports = {
	getPlayerDataByName: function (name) {
		let playerObj = clients.find(searchFor => searchFor.name.toLowerCase() === name.toLowerCase());
		if (playerObj != undefined) {
			return playerObj;
		} else {
			return null;
		}
	},

	getPlayerDataBySocket: function (socket) {
		let playerObj = clients.find(searchFor => searchFor.socket === socket);
	
		if (playerObj != undefined) {
			return playerObj;
		} else {
			return null;
		}
	},
		
	saveCharacter: function (socket) {
		Character.getCharacter(socket.name, (err, character) => {
			// Save Stats
	
	
			// Save Translation/Rotation
			character.position.translation.x = socket.position.translation.x;
			character.position.translation.y = socket.position.translation.y;
			character.position.translation.z = socket.position.translation.z;
	
			character.position.rotation.x = socket.position.rotation.x;
			character.position.rotation.y = socket.position.rotation.y;
			character.position.rotation.z = socket.position.rotation.z;
	
			// Save mapID
			character.mapID = socket.mapID;
			character.save();
		});
	}
}
