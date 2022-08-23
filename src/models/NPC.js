class NPC {
	constructor(npc) {
		this._id = '1232dsahi231'; // generate unique id that isnt in the npc list for that mapID
		this.npcID = npc.npcID;
		this.location = {
			x: npc.location.x,
			y: npc.location.y,
			z: npc.location.z
		};
		this.rotation = npc.rotation;
		this.createdAt = new Date().getTime().toString();
	}
}

export default NPC;
