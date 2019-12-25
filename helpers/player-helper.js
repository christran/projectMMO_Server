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
		Character.getCharacter(socket.character.name, (err, character) => {
			character = socket.character;
			character.save();
		});
	}
};
