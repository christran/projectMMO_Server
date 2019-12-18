const _config = require('./_config.json');
const mongoose = require('mongoose');
const dbName = _config.mongoDB.dbName;
const url = _config.mongoDB.dbUrl;
const mongoOptions = { useNewUrlParser: true, useUnifiedTopology: true };

const chalk = require('chalk');

mongoose.set('useCreateIndex', true);
mongoose.Promise = global.Promise;

mongoose.connect(url + dbName, mongoOptions, (err) => {
    if (err) {
        console.log(chalk.blue("[Database] Error: " + err));
    } else {
        console.log(chalk.blue("[Database] Connected to Database"));
    }
});

module.exports = {mongoose};