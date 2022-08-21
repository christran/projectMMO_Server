import chalk from 'chalk';

import NPC from '../models/NPC.js';

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
	const NPCFactory = {
		spawn: async (mapID, data) => {
			const npcsToSpawn = [];

			if (world[mapID]) {
				await Promise.all(data.npcs.map(async (npc) => {
					const newNPC = new NPC({
						npcID: npc.npcID,
						location: {
							x: npc.location.x,
							y: npc.location.y,
							z: npc.location.z
						},
						rotation: npc.rotation
					});

					npcsToSpawn.push(newNPC);

					world[mapID].npcs.push(newNPC);
				}));

				io.emit('spawnEntity', {
					type: 'npc',
					data: npcsToSpawn
				});
			} else {
				console.log(chalk.red(`[NPC Factory] Trying to spawn a NPC in Map ID: ${data.mapID} that doesn't exist`));
			}
		}
	};

	return NPCFactory;
};
