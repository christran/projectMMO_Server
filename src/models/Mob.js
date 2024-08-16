class Mob {
	constructor(mob) {
		this._id = mob._id; // generate unique id that isnt in the mobs list for that mapID
		this.mobID = mob.mobID;
		this.location = {
			x: mob.location.x,
			y: mob.location.y,
			z: mob.location.z
		};
		this.rotation = mob.rotation;
		this.stats = {
			hp: mob.stats.hp,
			maxHp: mob.stats.maxHP,
		};
		this.createdAt = new Date().getTime().toString();
	}
}

export default Mob;
