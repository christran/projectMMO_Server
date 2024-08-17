// Account.js
import { sql } from '../../db.js';

const Account = {
	async getAccount(username) {
		const result = await sql`
            SELECT * FROM accounts
            WHERE LOWER(username) = LOWER(${username})
            LIMIT 1
        `;
		return result[0];
	},

	async getAccountByID(accountID) {
		const result = await sql`
            SELECT * FROM accounts
            WHERE id = ${accountID}
            LIMIT 1
        `;
		return result[0];
	},

	async getCharacters(accountID) {
		return sql`
            SELECT * FROM characters
            WHERE account_id = ${accountID}
            ORDER BY created_at ASC
        `;
	},

	async createAccount(username, password, email, ip) {
		return sql`
            INSERT INTO accounts (username, password, email, ip)
            VALUES (${username}, ${password}, ${email}, ${ip})
            RETURNING *
        `;
	},

	async updateAccount(accountID, updates) {
		const setClause = Object.entries(updates)
			.map(([key, value], index) => `${key} = $${index + 2}`)
			.join(', ');

		const values = Object.values(updates);

		const query = `
            UPDATE accounts
            SET ${setClause}
            WHERE id = $1
            RETURNING *
        `;

		return sql.unsafe(query, [accountID, ...values]);
	}
};

export default Account;
