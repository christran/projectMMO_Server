module.exports = () => {
    this.getPlayerDataByUsername = function getPlayerDataByUsername (username) {
		let playerObj = clients.find(searchFor => searchFor.username.toLowerCase() === username.toLowerCase());
	
		if (playerObj != undefined) {
			return playerObj;
		} else {
			return null;
		}
	}
	
	this.getPlayerDataBySocket = function getPlayerDataBySocket (socket) {
		let playerObj = clients.find(searchFor => searchFor.socket === socket);
	
		if (playerObj != undefined) {
			return playerObj;
		} else {
			return null;
		}
	}
}