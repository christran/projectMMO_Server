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
			character.position.location.x = socket.position.location.x;
			character.position.location.y = socket.position.location.y;
			character.position.location.z = socket.position.location.z;
	
			character.position.rotation.roll = socket.position.rotation.roll;
			character.position.rotation.pitch = socket.position.rotation.pitch;
			character.position.rotation.yaw = socket.position.rotation.yaw;
	
			// Save mapID
			character.mapID = socket.mapID;
			character.save();
		});
	}
};
