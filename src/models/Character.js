import { sql } from '../../db.js';

const formatCharacter = (character) => {
	return {
		id: character.id,
		account_id: character.account_id,
		world_id: character.world_id,
		name: character.name,
		tagline: character.tagline,
		location: {
			x: character.location_x,
			y: character.location_y,
			z: character.location_z
		},
		rotation: character.rotation,
		appearance: {
			gender: character.gender,
			skin: character.skin,
			hair: character.hair,
			eyes: character.eyes,
			top: character.top,
			bottom: character.bottom,
			shoes: character.shoes,
			weapon_l: character.weapon_l,
			weapon_r: character.weapon_r
		},
		map_id: character.map_id,
		level: character.level,
		job: character.job,
		stats: {
			str: character.str,
			dex: character.dex,
			int: character.int,
			luk: character.luk,
			hp: character.hp,
			max_hp: character.max_hp,
			mp: character.mp,
			max_mp: character.max_mp,
			ap: character.ap,
			sp: character.sp,
			exp: character.exp,
			fame: character.fame,
		},
		inventory: {
			mesos: character.mesos,
		}
	};
};

// Character model using async/await for database operations
const Character = {
	async create(characterData) {
		try {
			const result = await sql`
        INSERT INTO characters (
          account_id, 
          world_id, 
          name, 
          tagline, 
          location_x, 
          location_y, 
          location_z, 
          rotation, 
          gender, 
          skin, 
          hair, 
          eyes, 
          top, 
          bottom, 
          shoes, 
          weapon_l, 
          weapon_r, 
          map_id, 
          level, 
          job, 
          str, 
          dex, 
          int, 
          luk, 
          hp, 
          max_hp, 
          mp, 
          max_mp, 
          ap, 
          sp, 
          exp, 
          fame, 
          mesos
        ) VALUES (
          ${characterData.accountID},
          ${characterData.worldID},
          ${characterData.name},
          ${characterData.tagline},
          ${characterData.location.x},
          ${characterData.location.y},
          ${characterData.location.z},
          ${characterData.rotation},
          ${characterData.appearance.gender},
          ${characterData.appearance.skin},
          ${characterData.appearance.hair},
          ${characterData.appearance.eyes},
          ${characterData.appearance.top},
          ${characterData.appearance.bottom},
          ${characterData.appearance.shoes},
          ${characterData.appearance.weapon_L},
          ${characterData.appearance.weapon_R},
          ${characterData.map_id},
          ${characterData.stats.level},
          ${characterData.stats.job},
          ${characterData.stats.str},
          ${characterData.stats.dex},
          ${characterData.stats.int},
          ${characterData.stats.luk},
          ${characterData.stats.hp},
          ${characterData.stats.max_hp},
          ${characterData.stats.mp},
          ${characterData.stats.max_mp},
          ${characterData.stats.ap},
          ${characterData.stats.sp},
          ${characterData.stats.exp},
          ${characterData.stats.fame},
          ${characterData.mesos}
        ) RETURNING *
      `;
			return result[0];
		} catch (error) {
			console.error('Error creating character:', error);
			throw error;
		}
	},

	async getCharacterByID(id) {
		try {
			const character = await sql`
        SELECT * FROM characters WHERE id = ${id}
      `;
			return formatCharacter(character[0]);
		} catch (error) {
			console.error('Error finding character by ID:', error);
			throw error;
		}
	},

	async findByName(name) {
		try {
			const character = await sql`
        SELECT * FROM characters WHERE name ILIKE ${name}
      `;
			return formatCharacter(character[0]);
		} catch (error) {
			console.error('Error finding character by name:', error);
			throw error;
		}
	},

	async updateCharacter(id, updates) {
		const setClause = Object.entries(updates)
			.map(([key, value], index) => `${key} = $${index + 2}`)
			.join(', ');

		const values = Object.values(updates);

		const query = `
            UPDATE characters
            SET ${setClause}
            WHERE id = $1
            RETURNING *
        `;

		return sql.unsafe(query, [id, ...values]);
	},

	async delete(id) {
		try {
			// Begin transaction
			await sql.begin(async sql => {
				// First delete all related items
				// TODO: don't delete items or chats...
				await sql`DELETE FROM items WHERE character_id = ${id}`;
				await sql`DELETE FROM chats WHERE character_id = ${id}`;
				
				// Then delete the character
				await sql`DELETE FROM characters WHERE id = ${id}`;
			});
			
			return true;
		} catch (error) {
			console.error('Error deleting character:', error);
			throw error;
		}
	},

	async generateTagline(name) {
		try {
			// Function to check if a character with the given name exists
			const nameExists = async () => {
				try {
					const character = await sql`
						SELECT * FROM characters WHERE name ILIKE ${name}
					`;
					return character.length > 0; // Return true if character exists
				} catch (error) {
					console.error('Error finding character by name:', error);
					throw error;
				}
			};

			// Check if the name exists
			const exists = await nameExists();

			if (!exists) {
				return 'NA1'; // Return 'NA1' if the name does not exist
			}

			let randomNumber;
			let findACharacter;

			// Generate a unique tagline
			do {
				randomNumber = Math.floor(Math.random() * 9000) + 1000;
				findACharacter = await sql`
					SELECT 1 FROM characters WHERE name = ${name} AND tagline = ${randomNumber}
				`;
			} while (findACharacter.length > 0);

			return randomNumber;
		} catch (error) {
			console.error('Error generating tagline:', error);
			throw error;
		}
	}
};

export default Character;
