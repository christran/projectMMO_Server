const express = require('express');
const app = express();
const bodyParser = require('body-parser')
const http = require('http').Server(app);
const io = require('socket.io')(http);
global.db = require("./db");
const bcrypt = require('bcrypt');
const util = require('util');
const chalk = require('chalk');
const serverConfig = require('./serverConfig.json');
const port = serverConfig.loginServer.port;

const clients = [];

require('./models/Account');
require('./models/Character');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

io.on('connection', function (socket) {
	clients.push({
        socket: socket.id,
        ip: socket.handshake.address
    });
    console.log(chalk.yellow('[Login Server] ') + 'Connection | IP: ' + socket.handshake.address + ' | Total Connected: ' + clients.length);

    // Check Client's Version
	socket.on('serverVersion', function (clientVersion, callback) {
        callback(serverConfig.version);
    });

    socket.on('getCharacters', (data, callback) => {
        const arrayToObject = (arr, keyField) => Object.assign({}, ...arr.map(item => ({[item[keyField]]: item})));

        Character.getCharacters(data.accountID, (character) => {
            callback(arrayToObject(character, 'name'));
        });

	});
    

	socket.on('disconnect', function () {
        console.log(chalk.yellow('[Login Server] ') + 'Disconnection | Socket: ' + util.inspect(socket.id) + ' | Total Connected: ' + clients.length);

        socketIndex = clients.findIndex(item => item.socket === socket.id);
        clients.splice(socketIndex, 1);
	})
});

app.post('/LoginServer/login', function(req, res) {
    login(req, res);
});

app.post('/LoginServer/register', function(req, res) {
    register(req, res);
});

app.post('/LoginServer/createChar', function (req, res) {
    createChar(req, res);
});

app.post('/LoginServer/', function(req, res) {
    res.status(403).end()
});

app.get('/LoginServer/', function(req, res) {
    res.status(403).end()
});

function login (req, res) {
    Account.getAccount(req.body.username, (err, account) => {
        // Find Username
        if (account && !err) {
            bcrypt.compare(req.body.password, account.password, function(err, bcryptRes) {
                if (bcryptRes && !err) {
                    if (account.banType == 0) {
                        let response =  {
                            'result': 'Handshaked',
                            'accountID': account._id,
                            'username': account.username,
                            'lastLogin': account.lastLoginDate.toLocaleString()
                            }
                    
                        res.send(response);
                        account.lastLoginDate = Date();
                        account.ip = req.connection.remoteAddress;
                        account.save();
                        console.log(chalk.yellow('[Login Server] ') + req.body.username + ' has logged in. | IP: ' + req.connection.remoteAddress);
                    } else {
                        // User is banned
                        let response =  {
                            'result': 'Banned',
                            'banType': account.banType,
                            'reason': account.banReason
                            }
                        console.log(chalk.yellow('[Login Server] ') + req.body.username + ' tried to log in but is banned. | IP: ' + req.connection.remoteAddress);
                        res.send(response);
                    }
                } else {
                    let response =  {
                        'result': 'InvalidPW',
                        'reason': 'Incorrect Password'
                        }
                    res.send(response);
                }
            });

        } else {
            let response =  {
                'result': 'Invalid',
                'reason': 'Username not found'
                }

                res.statusCode = 401;
                res.send(response);
                console.log(chalk.yellow('[Login Server] Failed Login Attempt | ') + 'Username: ' + req.body.username.replace(/\r?\n|\r/g, "") + ' | IP: ' + req.connection.remoteAddress);
        }

        if (err) {
            console.log(err);
        }
    });
}

function register (req, res) {
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(req.body.password, salt, function(err, hash) {
            let newAccount = new Account({
                username: req.body.username,
                password: hash,
                ip: req.connection.remoteAddress
            });

            newAccount.save(function (err, account) {
                if (!err) {
                    let response =  {
                        'result': 'Account Created'
                        }
                    
                    res.send(response)
                    console.log(chalk.yellow('[Login Server] New Account | Username: ' + account.username));
                } else {
                    let response =  {
                        'result': 'Username Taken'
                        }
                    
                    res.send(response)
                }
            });
        });
    });
}

function createChar (req, res) {
    let newChar =  new Character({
        accountID: req.body.accountID,
        name: req.body.name,
            female: false,
            skin: 1,
            hair: 1,
            eyes: 1,
            
            mapID: 1,
            mapPos: 0,
            
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

    newChar.save(function (err, character) {
        if (!err) {
            let response =  {
                'result': 'Character Created'
                }
            
            res.send(response)
            console.log(chalk.yellow('[Login Server] New Character | Name: ' + character.name));
        } else {
            let response =  {
                'result': 'Username Taken',
                'reason': 'Name is already taken'
                }
            
            res.send(response)
            console.log(err.errmsg);
        }
    });

}

//Start the Server
http.listen(port, function () {
	console.log(chalk.yellow('[Login Server] Starting Login Server...', port));
});
