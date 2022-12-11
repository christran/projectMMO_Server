import _ from 'lodash';
import moment from 'moment';
import jsonfile from 'jsonfile';
import chalk from 'chalk';
import * as fs from 'fs';

import Account from '../../models/Account.js';
import Character from '../../models/Character.js';
import PlayerHelper from '../../helpers/player-helper.js';
import MapFactory from '../../world/MapFactory.js';
import ItemFactory from '../../world/ItemFactory.js';

import Discord from '../../helpers/discord.js';
import susLog from '../../models/susLogger.js';

// const itemsDataTable = './game/items.json';

export default (io, socket, world, clients) => {
	const Player = PlayerHelper(io, world);
	const Map = MapFactory(io, world);
	// const Item = ItemFactory(io, socket, clients, world); // conflicting variable name

	// this function can be reused in the portal logic in player-helper.js
	const changeMap = async (mapID, socketID) => {
		return new Promise((resolve, reject) => {
			Map.getMap(mapID).then((targetMap) => {
				const targetSocket = io.sockets.sockets.get(socketID);

				targetSocket.to(targetSocket.character.mapID).emit('removeCharacter', {
					_id: targetSocket.character._id,
				});

				targetSocket.leave(targetSocket.character.mapID);
				targetSocket.join(mapID);

				_.remove(world[targetSocket.character.mapID].characters, { name: targetSocket.character.name });

				targetSocket.character.socketID = socketID;
				targetSocket.character.mapID = mapID;
				targetSocket.character.location = { x: 0, y: 0, z: 25 };
				targetSocket.character.rotation = 0;

				world[mapID].characters.push(targetSocket.character);

				// Character.saveCharacter(targetSocket);

				// socket.emit('changeMap', mapID);

				targetSocket.to(targetSocket.character.mapID).emit('addCharacter', {
					characterInfo: targetSocket.character
				});

				resolve();
			}).catch((err) => {
				console.log(`[Chat Handler] ${err}`);
				reject();
			});
		});
	};

	socket.on('chatServer', (data) => {
		const toMapID = parseInt(data.mapID, 10);
		const characterSocketID = _.find(clients, { characterID: data._id }).socketID;

		switch (data.type) {
		case 'changeMap':
			changeMap(toMapID, characterSocketID).then(() => {
				io.to(characterSocketID).emit('changeMap', toMapID);
			});
			break;
		default:
			break;
		}
	});
};
