/* eslint-disable func-names */
const uniqueValidator = require('mongoose-unique-validator');
const db = require('../../db');

const characterSchema = new db.mongoose.Schema(
	{
		accountID: { type: String, required: true },
		_id: String,
		worldId: Number,
		name: {
			type: String,
			required: true,
			index: true,
			unique: true,
			uniqueCaseInsensitive: true
		},
		female: Boolean,
		skin: Number,
		hair: Number,
		eyes: Number,

		mapID: { type: Number, default: 1 },
		transform: {
			location: { x: Number, y: Number, z: Number },
			rotation: Number
		},

		stats: {
			level: { type: Number, default: 1 },
			job: Number,
			str: Number,
			dex: Number,
			int: Number,
			luk: Number,
			hp: Number,
			mhp: { type: Number, min: 1 },
			mp: Number,
			mmp: { type: Number, min: 1 },
			ap: Number,
			sp: Number,
			exp: { type: Number, default: 0 },
			fame: Number,
		},

		inventory: {
			mesos: { type: Number, default: 0 },
			maxSlots: Array
		}
	},
	{
		timestamps: true
	}
);

characterSchema.plugin(uniqueValidator);

characterSchema.statics.getCharacter = async function (name) {
	return this.model('characters').findOne({ name: new RegExp(`^${name}$`, 'i') });
};

characterSchema.statics.getCharacterByID = async function (charID) {
	return this.model('characters').findOne({ _id: charID });
};

characterSchema.statics.saveCharacter = async function (socket) {
	try {
		await socket.character.save();
	} catch (err) {
		// socket.disconnect();
		socket.emit('dc', 'Character Error');
		console.log(`[World Server] Saving Character | Error: ${err}`);
	}
};

/** @type {characterSchema.statics} */
const Character = db.mongoose.model('characters', characterSchema);

module.exports = Character;
