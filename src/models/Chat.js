import { sql } from '../../db.js';

const Chat = {
	async new(data) {
		return sql`
            INSERT INTO chats (account_id, character_id, type, message)
            VALUES (${data.account_id}, ${data.character_id}, ${data.type}, ${data.message})
            RETURNING *
        `;
	}
};

export default Chat;
