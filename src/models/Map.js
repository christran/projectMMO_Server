class Map {
	constructor(_id, map) {
		this.mapID = _id;

		/** @type {{mapName: String, town: Number, returnMapID:}} */
		this.mapInfo = map.mapInfo;

		this.characters = [];
		this.characterStates = [];
		this.itemsOnTheGround = [];

		this.npcs = []; // predefined npcs combined with runtime spawned npcs
		this.mobs = []; // predefined mobs combined with runtime spawned mobs
		this.portals = []; // predefined portals combined with runtime spawned portals

		this.inactivity = 0;
	}
}

export default Map;
