import mongoose from 'mongoose';
import chalk from 'chalk';
import * as fs from 'fs';

const config = JSON.parse(fs.readFileSync('./_config.json'));

const mongoOptions = { useNewUrlParser: true, useUnifiedTopology: true };
const { dbName } = config.mongoDB;
const url = config.mongoDB.dbUrl;

mongoose.set('useCreateIndex', true);
mongoose.Promise = Promise;

const connect = async () => {
	mongoose.connect(url + dbName + '?authMechanism=DEFAULT&tls=true&authSource=admin', mongoOptions)
		.then(() => {
			console.log(chalk.blueBright('[Database] Connected to Database'));
		})
		.catch((err) => {
			console.log(chalk.blueBright(`[Database] Error: ${err}`));
			process.exit();
		});
};

export default { mongoose, connect };