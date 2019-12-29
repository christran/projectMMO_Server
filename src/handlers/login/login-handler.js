const bcrypt = require('bcrypt');
const _ = require('lodash');
const moment = require('moment');
const chalk = require('chalk');

module.exports = function(io, socket, clients) {
    socket.on('login', (data, callback) => {
        Account.getAccount(data.username)
        .then((account) => {
            // Find Username
            if (account) {
                bcrypt.compare(data.password, account.password, function(err, bcryptRes) {
                    if (bcryptRes && !err) {
                        if (account.ban.banType > 0) {
                            // Account is banned
                            let response =  {
                                'result': 'Banned',
                                'banType': account.ban.banType,
                                'reason': account.ban.banReason
                                };

                            console.log(chalk.yellow('[Login Server]'), `${socket.id} tried to log in but is banned. | IP: ${socket.handshake.address}`);
                            callback(response);
                        } else if (account.isOnline == true) {
                        // } else if (account.isOnline == true || _.find(clients, {username: account.username})) {
                            // Account is already online
                            let response =  {
                                'result': 'Online',
                                'reason': "This account is already logged in."
                                };

                            console.log(chalk.yellow('[Login Server]'), `${socket.id} tried to login into an account that is already online. | IP: ${socket.handshake.address}`);
                            callback(response);
                        } else {
                            let response =  {
                                'result': 'Handshaked',
                                'accountID': account._id,
                                'lastLogin': moment(account.lastLoginDate, "YYYY-MM-DD HH:mm:ss").fromNow()
                                };
                            
                            clients.push({
                                username: account.username,
                                socket: socket.id,
                                ip: socket.handshake.address
                            });
                            
                            socket.username = account.username;

                            //account.isOnline = true;
                            account.lastLoginDate = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
                            account.ip = socket.handshake.address;
                            account.save();

                            callback(response);
                            console.log(chalk.yellow('[Login Server]'), `${account.username} has logged in. | IP: ${socket.handshake.address}`);
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

                    callback(response);
                    console.log(chalk.yellow('[Login Server]'), `Failed Login Attempt | Username: ${data.username} | IP: ${socket.handshake.address}`);
            }            
        })
        .catch((err) => {
            console.log(err);
        });

    });

    socket.on('createCharacter', (data, callback) => {
        let newChar =  new Character({
            accountID: data.accountID,
            _id: new db.mongoose.Types.ObjectId().toHexString(),
            name: data.name,
            female: false,
            skin: 1,
            hair: 1,
            eyes: 1,
            
            mapID: 1,
            position: {
                location: { x: 0, y: 0, z: 0 },
                rotation: { roll: 0, pitch: 0, yaw: 0 }
            },
            
            stats: {
                level: 1,
                job: 100,
                str: 5,
                dex: 5,
                int: 5,
                luk: 5,
                hp: 50,
                mhp: 50,
                mp: 100,
                mmp: 100,
            },
            
            inventory: {
                mesos: 0,
                maxSlots: [96, 96, 96, 96, 96]
            }
        });
    
        newChar.save()
        .then((character) => {
            let response =  {
                'result': 'Character Created'
                };
            
            callback(response);
            console.log(chalk.yellow('[Login Server]'), `New Character | Name: ${character.name}`);
        })
        .catch((err) => {
            if (err.code == 11000) {
                // Name taken
                let response =  {
                    'result': 'Username Taken',
                    'reason': 'Name is already taken'
                    };
                
                callback(response);
            } else {
                console.log(`[Login Server] createCharacter | Error: ${err}`);
            }
        });
    });

    socket.on('getCharacters', (data, callback) => {
        Account.getCharacters(data.accountID)
        .then((characters) => {
            callback(_.keyBy(characters, 'name'));
            }
        )
        .catch((err) => {
            console.log(`[Login Server] getCharacters | Error: ${err}`);
        });
    });

    socket.on('selectCharacter', (data) => {
        Character.getCharacterByID(data._id)
        .then((character) => {
            if (character) {
                socket.handoffToWorldServer = true;
                socket.emit('handoffToWorldServer', character);
            } else {
                console.log(`[Login Server] IP: ${socket.handshake.address} tried to select a character not tied to their account.`);
            }
        })
        .catch((err) => {
            console.log(`[Login Server] ${err}`);
        });
    });

    socket.on('disconnect', () => {
        // Check if user was logged in and set isOnline to false.
        if (!socket.handoffToWorldServer && socket.username) {
            Account.getAccount(socket.username)
            .then((account) => {
                account.isOnline = false;
                account.save();
            })
            .catch((err) => {
                console.log(`[Login Server] ${err}`);
            });

            console.log(chalk.yellow('[Login Server]'), `Disconnection | User: ${socket.username} | Total Connected: ${clients.length}`);
        } else {
            console.log(chalk.yellow('[Login Server]'), `Disconnection | IP: ${socket.handshake.address} | Total Connected: ${clients.length}`);
        }

        socketIndex = clients.findIndex(item => item.socket === socket.id);
        clients.splice(socketIndex, 1);
    });
};