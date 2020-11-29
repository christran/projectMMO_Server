const mongoose = require('mongoose');

const mongoOptions = { useNewUrlParser: true, useUnifiedTopology: true };

const chalk = require('chalk');
const config = require('./_config.json');

const { dbName } = config.mongoDB;
const url = config.mongoDB.dbUrl;

mongoose.set('useCreateIndex', true);
mongoose.Promise = Promise;

mongoose.connect(url + dbName, mongoOptions)
	.then(() => {
		console.log(chalk.blueBright('[Database] Connected to Database'));
	})
	.catch((err) => {
		console.log(chalk.blueBright(`[Database] Error: ${err}`));
		process.exit();
	});

module.exports = { mongoose };
