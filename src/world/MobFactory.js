import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';

import Mob from '../models/Mob.js';

/*
// for typescript in the future
type mobSpawnData = {
	mobs:Array<{
		id: number,
		x: number,
		y: number,
		z: number
	}>,
	mapID: number,
};
*/

export default (io, world) => {
	const MobFactory = {
		generateUniqueMobID: (mapID) => {
			// create a new random _id
			const newID = uuidv4();

			// check if the generated _id already exists in the mapID
			const existingMobIDs = world[mapID].mobs.map((mob) => mob._id);
			const isDuplicate = existingMobIDs.includes(newID);

			// if it is a duplicate, recursively call the function again to generate a new _id
			if (isDuplicate) {
				return MobFactory.generateUniqueMobID();
			}

			// if it is not a duplicate, return the new _id
			return newID;
		},

		spawn: async (mapID, data) => {
			const mobsToSpawn = [];

			if (world[mapID]) {
				await Promise.all(data.mobs.map(async (mob) => {
					// take into account amount of mobs to to spawn
					for (let i = 0; i < mob.amount; i += 1) {
						const newMob = new Mob({
							_id: MobFactory.generateUniqueMobID(mapID),
							mobID: mob.mobID,
							location: {
								x: mob.location.x,
								y: mob.location.y,
								z: mob.location.z
							},
							rotation: mob.rotation,
							stats: {
								hp: 100, // get from mob data table
								maxHP: 100, // get from mob data table
							}
						});
						mobsToSpawn.push(newMob);

						world[mapID].mobs.push(newMob);
					}
				}));

				io.emit('spawnEntity', {
					type: 'mob',
					data: mobsToSpawn
				});
			} else {
				console.log(chalk.red(`[Mob Factory] Trying to spawn a mob in Map ID: ${data.mapID} that doesn't exist`));
			}
		},

		move: async (_id, mapID, location) => {
			console.log(_id, mapID, location);
		}
	};

	return MobFactory;
};
