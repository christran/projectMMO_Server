const _config = require('./_config.json');
const mongoose = require('mongoose');
const dbName = _config.mongoDB.dbName;
const url = _config.mongoDB.dbUrl;
const mongoOptions = { useNewUrlParser: true, useUnifiedTopology: true };

const chalk = require('chalk');

mongoose.set('useCreateIndex', true);

mongoose.connect(url + dbName, mongoOptions)
  .then(() => {
    console.log(chalk.blueBright("[Database] Connected to Database"));
  })
  .catch((err) => {
    console.log(chalk.blueBright("[Database] Error: " + err));
    process.exit();
  });

module.exports = {mongoose};