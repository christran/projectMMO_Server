import { sql } from '../../db.js';

const susLog = {
	async new(data) {
		return sql`
            INSERT INTO sus_log (account_id, character_id, reason, ip)
            VALUES (${data.account_id}, ${data.character_id}, ${data.reason}, ${data.ip})
            RETURNING *
        `;
	}
};

export default susLog;
