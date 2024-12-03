import 'dotenv/config'; // Load environment variables from .env file
import postgres from 'postgres';
import chalk from 'chalk';

// Create a PostgreSQL connection using environment variables
const sql = postgres({
	host: process.env.PGHOST,
	database: process.env.PGDATABASE,
	user: process.env.PGUSER,
	password: process.env.PGPASSWORD,
	port: process.env.PGPORT || 5432,
	// ssl: 'require',
});

const connect = () => {
	// Test the connection using promises
	sql`SELECT 1`
		.then(() => {
			console.log(chalk.blueBright('[Database] Connected to PostgreSQL Database'));
		})
		.catch((err) => {
			console.log(chalk.redBright(`[Database] Error: ${err.message}`));
			process.exit(1);
		});
};

async function createTables() {
	try {
		await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

		// Create accounts table
		await sql`
			CREATE TABLE IF NOT EXISTS accounts (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				username VARCHAR(50) UNIQUE NOT NULL,
				password VARCHAR(255) NOT NULL,
				email VARCHAR(100) UNIQUE,
				is_online BOOLEAN DEFAULT false,
				is_gm BOOLEAN DEFAULT false,
				ban_type INTEGER DEFAULT 0,
				ban_reason TEXT,
				last_login_date TIMESTAMP WITH TIME ZONE,
				ip VARCHAR(45),
				inventory_pos_x FLOAT DEFAULT 0,
				inventory_pos_y FLOAT DEFAULT 0,
				chat_pos_x FLOAT DEFAULT 0,
				chat_pos_y FLOAT DEFAULT 0,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
			)
		`;
		console.log('Accounts table created successfully');

		// Create characters table
		await sql`
			CREATE TABLE IF NOT EXISTS characters (
    			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				account_id UUID REFERENCES accounts(id),
				world_id INTEGER,
				name VARCHAR(50) NOT NULL,
				tagline TEXT,
				location_x FLOAT,
				location_y FLOAT,
				location_z FLOAT,
				rotation FLOAT,
				gender INTEGER DEFAULT 1,
				skin INTEGER DEFAULT 1,
				hair INTEGER DEFAULT 1,
				eyes INTEGER DEFAULT 1,
				top INTEGER DEFAULT 2,
				bottom INTEGER DEFAULT 2,
				shoes INTEGER DEFAULT 2,
				weapon_l INTEGER DEFAULT 0,
				weapon_r INTEGER DEFAULT 0,
				map_id INTEGER DEFAULT 1,
				level INTEGER DEFAULT 1,
				job INTEGER,
				str INTEGER,
				dex INTEGER,
				int INTEGER,
				luk INTEGER,
				hp INTEGER,
				max_hp INTEGER,
				mp INTEGER,
				max_mp INTEGER,
				ap INTEGER,
				sp INTEGER,
				exp INTEGER DEFAULT 0,
				fame INTEGER,
				mesos INTEGER DEFAULT 0,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
			)
		`;
		console.log('Characters table created successfully');

		// Create items table
		await sql`
			CREATE TABLE IF NOT EXISTS items (
    			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				item_id INTEGER NOT NULL,
				character_id UUID REFERENCES characters(id),
				lootable BOOLEAN DEFAULT false,
				stackable BOOLEAN DEFAULT false,
				max_stack INTEGER DEFAULT 1,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
			)
		`;
		console.log('Items table created successfully');

		// Create chats table
		await sql`
			CREATE TABLE IF NOT EXISTS chats (
    			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				account_id UUID REFERENCES accounts(id),
				character_id UUID REFERENCES characters(id),
				type VARCHAR(50) NOT NULL,
				message TEXT,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

			)
		`;
		console.log('Chats table created successfully');

		// Create susLog table
		await sql`
			CREATE TABLE IF NOT EXISTS sus_log (
    			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				account_id UUID REFERENCES accounts(id),
				character_id UUID REFERENCES characters(id),
				reason TEXT,
				ip VARCHAR(45),
				created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

			)
		`;
		console.log('susLog table created successfully');

		// Create indexes
		await sql`CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_characters_account_id ON characters(account_id)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_items_character_id ON items(character_id)`;
		console.log('Indexes created successfully');

		console.log('All tables and indexes created successfully');
	} catch (error) {
		console.error('Error creating tables:', error);
	}
}

createTables().catch(console.error);

export { sql, connect };
