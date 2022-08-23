/* eslint-disable func-names */
import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const characterSchema = new mongoose.Schema(
	{
		accountID: { type: String, required: true },
		_id: String,
		worldId: Number,
		name: {
			type: String,
			required: true
		},
		tagline: {
			type: String,
			required: true
		},
		location: {
			x: Number,
			y: Number,
			z: Number
		},
		rotation: Number,

		appearance: {
			gender: { type: Number, default: 1 },
			skin: { type: Number, default: 1 },
			hair: { type: Number, default: 1 },
			eyes: { type: Number, default: 1 },
			top: { type: Number, default: 2 },
			bottom: { type: Number, default: 2 },
			shoes: { type: Number, default: 2 },

			weapon_L: { type: Number, default: 0 },
			weapon_R: { type: Number, default: 0 },
		},

		mapID: { type: Number, default: 1 },
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

characterSchema.statics.generateTagline = async function (name) {
	const nameExists = await this.findOne({ name });

	if (!nameExists) {
		console.log('name doesnt exist yet setting tagline to NA1');
		// Set tagline to country code
		return 'NA1';
	}

	// Random number with a max length of 4
	const randomNumber = Math.floor(Math.random() * 9000) + 1000;
	// const randomNumber = Math.floor(Math.random() * 10000);
	const findACharacter = await this.findOne({ name, tagline: randomNumber });

	if (findACharacter) {
		return randomNumber;
	}
	return randomNumber;
};

export default mongoose.model('characters', characterSchema);
