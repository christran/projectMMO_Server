const msgpack = require('msgpack-lite');

// Encode
const buffer = msgpack.encode(
	{
		Tiger: {
			level: 180,
			mesos: 1000000,
		},
		FangBlade: {
			level: 200,
			mesos: 250000,
		}
	}
);

// Decode
const data = msgpack.decode(buffer);

console.log(buffer);
console.log(data);
