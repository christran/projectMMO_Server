// import chalk from 'chalk';
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
		useAbility: (ability) => {
			return new Promise((resolve, reject) => {
				jsonfile
					.readFile(abilitiesDataTable)
					.then((fileData) => {
						const abilitiesKeyByID = _.keyBy(fileData, 'Name');
						if (abilitiesKeyByID[ability.id]) {
							if (socket.character.stats.mp >= abilitiesKeyByID[ability.id].mana_cost) {
								socket.character.stats.mp -= abilitiesKeyByID[ability.id].mana_cost;

								if (ability.id === 1) {
									const characterIndex = world[socket.character.map_id].characterStates.findIndex((character) => character._id === socket.character._id);
									world[socket.character.map_id].characterStates.splice(characterIndex, 1);

									socket.to(socket.character.map_id).emit('player_UseAbility', {
										_id: socket.character._id,
										abilityID: ability.id
									});

									socket.character.location = {
										x: ability.forwardVector.x * 600,
										y: ability.forwardVector.y * 600,
										z: 0
									};
								} else if (ability.id === 2) {
									socket.to(socket.character.map_id).emit('player_UseAbility', {
										_id: socket.character._id,
										abilityID: ability.id
									});
								}

								const data = {
									ability: abilitiesKeyByID[ability.id].ability_name,
									mp: socket.character.stats.mp,
									mp_cost: abilitiesKeyByID[ability.id].mana_cost
								};

								resolve(data);
							} else {
								reject({ id: 1, message: `Not enough mana. MP: ${socket.character.stats.mp} | MP Cost: ${abilitiesKeyByID[ability.id].mana_cost}` });
							}
						} else {
							reject({ id: 2, message: `Invalid Ability ID: ${ability.id}` });
						}
					})
					.catch((err) => {
						reject(err);
					});
			});
		},
	};

	return AbilityFactory;
};
