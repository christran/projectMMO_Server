const fs = require('fs');
const path = require('path');
const jsonfile = require('jsonfile');
const _ = require('lodash');

let Maps = {};

class Map {
    constructor(_id, map) {
        this.mapID = _id;
        this.mapName = map.mapInfo.mapName;
        this.town = map.mapInfo.town;
        this.returnMapID = map.mapInfo.returnMapID;

        this.npcs = map.npcs;
        this.mobs = map.mobs;

        this.portals = map.portals;
    }


    // POrtals
    getPortalByID (portalID) {
        return _.find(this.portals, { id: portalID });
    }

    getPortalByName (portalName) {
        return this.portals[portalName];
    }
}

// Load all maps into memory
// fs.readdirSync('game/maps/').forEach((file) => {
//     let mapID = path.basename(file, '.json');
//     let mapData = jsonfile.readFileSync('game/maps/' + file);
	
//     // Maps[mapID] = jsonfile.readFileSync('game/maps/' + file);
    
//     Maps[mapID] = new Map(mapID, mapData);
// });

module.exports = function(io) {
    return {
        // Checks if is already map loaded into memory, if not add it.
        getMap: async function(mapID) {
            if (Maps.hasOwnProperty(mapID)) {
                return Maps[mapID];
            } else {
                let mapData = await jsonfile.readFile('game/maps/' + mapID + '.json');
                
                Maps[mapID] = new Map(mapID, mapData);

                return Maps[mapID];
            }
        },

		getAllPlayersInMap: function(mapID) {
			if ((io.sockets.adapter.rooms[mapID])) {
			let socketsinMap = [];

			for (let socketID in io.sockets.adapter.rooms[mapID].sockets) {
				socketsinMap.push(socketID);
			}

			playersInMap = [];

			socketsinMap.forEach(socketID => {
				playersInMap.push({
						[io.sockets.connected[socketID].character.name]: io.sockets.connected[socketID].character
				}); 
			});

			return playersInMap;
			
			//console.log(_.find(playersInMap, 'Tiger'));

			} else {
				console.log(`Map: ${mapID} is empty`);
			}
		}
    };
};

