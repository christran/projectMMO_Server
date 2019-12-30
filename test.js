const msgpack = require('msgpack-lite');

// Encode
const buffer = msgpack.encode(
	{
		name: 'Tiger',
		level: 180,
		mesos: 1000000
	}
);

// Decode
const data = msgpack.decode(buffer);

console.log(buffer);
console.log(data);
