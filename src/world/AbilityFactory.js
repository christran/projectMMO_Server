import chalk from 'chalk';
import jsonfile from 'jsonfile';
import _ from 'lodash';

const abilitiesDataTable = 'game/abilities.json';

// import Ability from '../models/Ability.js';

/*
// for typescript in the future
type itemSpawnData = {
	items:Array<{
		id: number,
		amount: number
	}>,
	mapID: number,
	x: number,
	y: number,
	z: number,
	randomXY: boolean,
	zHeight: number
};
*/

export default (io, world, socket) => {
	const AbilityFactory = {
		useAbility: async (ability) => {
			jsonfile.readFile(abilitiesDataTable)
			.then((fileData) => {
				const abilitiesKeyByID = _.keyBy(fileData, 'Name');
				
				if (abilitiesKeyByID[ability.id]) {
					// Check Mana
					// Should we update the database mana now or on log out.
					// Server has it stored in memory already
					if (socket.character.stats.mp >= abilitiesKeyByID[ability.id].mana_cost) {
						socket.character.stats.mp = socket.character.stats.mp - abilitiesKeyByID[ability.id].mana_cost;

						if (ability.id === 1) {
							const characterIndex = world[socket.character.mapID].characterStates.findIndex((character) => character._id === socket.character._id);

							world[socket.character.mapID].characterStates.splice(characterIndex, 1);

							socket.to(socket.character.mapID).emit('player_UseAbility', {
								_id: socket.character._id,
								abilityID: ability.id
							});
	
							// Simulate Teleport on the Server Side
							socket.character.location = {
								x: ability.forwardVector.x * 600,
								y: ability.forwardVector.y * 600,
								z: 0
							};
						}
					
						console.log(chalk.yellow(`[Abiliity Factory] ${socket.character.name} used ability: ${abilitiesKeyByID[ability.id].ability_name}`));
					} else {
						console.log(chalk.yellow(`[Abiliity Factory] ${socket.character.name} MP: ${socket.character.stats.mp} MP Cost: ${abilitiesKeyByID[ability.id].mana_cost}`));
					}
				} else {
					console.log(chalk.yellow(`[Abiliity Factory] ${socket.character.name} used ability ID: ${ability.id} | No ability name was found in the Ability Data Table`));
				}
			}).catch((err) => console.log(err));
		},
	};

	return AbilityFactory;
};
