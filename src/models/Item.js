// Item.js
import chalk from 'chalk';
import { sql } from '../../db.js';

const Item = {
	async createItem(item) {
		const result = await sql`
            INSERT INTO items (item_id, lootable, stackable, max_stack)
            VALUES (${item.item_id}, ${item.lootable}, ${item.stackable || false}, ${item.maxStack || 1})
            RETURNING *
        `;

		const newItem = result[0];
		console.log(chalk.yellow(`[Item Factory] New Item Created | ID: ${newItem.id} | Item ID: ${newItem.item_id} ${newItem.character_id ? `| Character ID: ${newItem.character_id}` : ''}`));

		return newItem;
	},

	async updateItemOwner(item_uuid, characterId) {
		return sql`
            UPDATE items
            SET character_id = ${characterId}
            WHERE id = ${item_uuid}
            RETURNING *
        `;
	},

	async updateItem(id, updates) {
		const setClause = Object.entries(updates)
			.map(([key, value], index) => `${key} = $${index + 2}`)
			.join(', ');

		const values = Object.values(updates);

		const query = `
            UPDATE items
            SET ${setClause}
            WHERE id = $1
            RETURNING *
        `;

		return sql.unsafe(query, [id, ...values]);
	},

	async deleteByID(item_uuid) {
		return sql`
            DELETE FROM items
            WHERE id = ${item_uuid}
        `;
	},

	async findItemByID(item_uuid) {
		const result = await sql`
            SELECT * FROM items
            WHERE id = ${item_uuid}
            LIMIT 1
        `;
		return result[0];
	},

	async getCharacterItems(character_id) {
		return sql`
            SELECT * FROM items
            WHERE character_id = ${character_id}
            ORDER BY created_at ASC
        `;
	}
};

export default Item;
