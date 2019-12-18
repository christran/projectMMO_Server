// Login Handler
const bcrypt = require('bcrypt');
const moment = require('moment');
const chalk = require('chalk');
const util = require('util');
const stuff = require('../utils/stuff');
const _config = require('../_config.json');

const clients = [];

module.exports = function(io) {
    io.on('connection', function (socket) {
    
        clients.push({
            socket: socket.id,
            ip: socket.handshake.address
        });
        console.log(chalk.yellow('[Login Server] ') + 'Connection | IP: ' + socket.handshake.address + ' | Total Connected: ' + clients.length);
        
        // Check Client's Version
        socket.on('serverVersion', (clientVersion, callback) => {
            callback(_config.version);
        });

        socket.on('login', (data, callback) => {
            Account.getAccount(data.username, (err, account) => {
                // Find Username
                if (account && !err) {
                    bcrypt.compare(data.password, account.password, function(err, bcryptRes) {
                        if (bcryptRes && !err) {
                            if (account.ban.banType > 0) {
                                // Account is banned
                                let response =  {
                                    'result': 'Banned',
                                    'banType': account.ban.banType,
                                    'reason': account.ban.banReason
                                    };

                                console.log(chalk.yellow('[Login Server] ') + socket.id + ' tried to log in but is banned. | IP: ' + socket.handshake.address);
                                callback(response);
                            } else if (account.isOnline == true) {
                                // Account is already online
                                let response =  {
                                    'result': 'Online',
                                    'reason': "This account is already logged in."
                                    };

                                console.log(chalk.yellow('[Login Server] ') + socket.id + ' tried to login into an account that is already online. | IP: ' + socket.handshake.address);
                                callback(response);
                            } else {
                                let response =  {
                                    'result': 'Handshaked',
                                    'accountID': account._id,
                                    'lastLogin': moment(account.lastLoginDate, "YYYY-MM-DD HH:mm:ss").fromNow()
                                    };
                            
                                callback(response);
                                
                                socket.username = account.username;

                                account.isOnline = true;
                                account.lastLoginDate = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
                                account.ip = socket.handshake.address;
                                account.save();
                                console.log(chalk.yellow('[Login Server] ') + account.username + ' has logged in. | IP: ' + socket.handshake.address);
                            }
                        } else {
                            let response =  {
                                'result': 'InvalidPW',
                                'reason': 'Incorrect Password'
                                };
                            callback(response);
                        }
                    });

                } else {
                    let response =  {
                        'result': 'Invalid',
                        'reason': 'Username not found'
                        };

                        res.statusCode = 401;
                        callback(response);
                        console.log(chalk.yellow('[Login Server] Failed Login Attempt | ') + 'Username: ' + req.body.username.replace(/\r?\n|\r/g, "") + ' | IP: ' + socket.handshake.address);
                }

                if (err) {
                    console.log(err);
                }
            });
        });

        socket.on('getCharacters', (data, callback) => {
            Account.getCharacters(data.accountID, (character) => {
                callback(stuff.arrayToObject(character, 'name'));
            });
        });

        socket.on('selectCharacter', (data) => {
            Character.getCharacterByID(data._id, (err, character) => {
                if (character && !err) {
                    socket.handoffToWorldServer = true;
                    socket.emit('handoffToWorldServer', character);
                } else {
                    console.log('IP: ' + socket.handshake.address + ' tried to select a character not tied to their account.');
                }
            });
        });

        socket.on('disconnect', function () {
            // Check if user was logged in and set isOnline to false.
            if (!socket.handoffToWorldServer && socket.username) {
                Account.getAccount(socket.username, (err, account) => {
                    account.isOnline = false;
                    account.save();
                });

                console.log(chalk.yellow('[Login Server] ') + 'Disconnection | User: ' + socket.username + ' | Total Connected: ' + clients.length);
            } else {
                console.log(socket.username);
                console.log(chalk.yellow('[Login Server] ') + 'Disconnection | Socket: ' + socket.id + ' | Total Connected: ' + clients.length);
            }
    
            socketIndex = clients.findIndex(item => item.socket === socket.id);
            clients.splice(socketIndex, 1);
        });
    });
};