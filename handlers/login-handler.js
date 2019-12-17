// Login Handler
const chalk = require('chalk');
const util = require('util');
const serverConfig = require('../serverConfig.json');

const clients = [];

module.exports = function(io) {
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

            Account.getCharacters(data.accountID, (character) => {
                callback(arrayToObject(character, 'name'));
            });

        });

        socket.on('selectCharacter', (data) => {
            Character.getCharacterByID(data._id, (err, character) => {
                if (character && !err) {
                    socket.emit('handoffToWorldServer', character);
                } else {
                    console.log('IP: ' + socket.handshake.address + ' tried to select a character not tied to their account.');
                }
            });
        });

        socket.on('disconnect', function () {
            console.log(chalk.yellow('[Login Server] ') + 'Disconnection | Socket: ' + util.inspect(socket.id) + ' | Total Connected: ' + clients.length);
    
            socketIndex = clients.findIndex(item => item.socket === socket.id);
            clients.splice(socketIndex, 1);
        })
    });
}