const msgpack = require("msgpack-lite");
 
// Encode
let buffer = msgpack.encode(
    {
        "name": "Tiger",
        "level": 180,
        "mesos": 1000000
    }
);
 
// Decode
let data = msgpack.decode(buffer);
 
console.log(buffer);
console.log(data);