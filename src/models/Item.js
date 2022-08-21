/* eslint-disable func-names */
import mongoose from 'mongoose';
import chalk from 'chalk';

const itemSchema = new mongoose.Schema(
	{
		_id: String,
		itemID: { type: Number, required: true },
		characterID: { type: String, default: null },
		lootable: { type: Boolean, default: false }

		// stats: {
		// 	level: { type: Number, default: 1 },
		// 	job: Number,
		// 	str: Number,
		// 	dex: Number,
		// 	int: Number,
		// 	luk: Number,
		// 	hp: Number,
		// 	mhp: { type: Number, min: 1 },
		// 	mp: Number,
		// 	mmp: { type: Number, min: 1 },
		// 	ap: Number,
		// 	sp: Number,
		// 	exp: { type: Number, default: 0 },
		// 	fame: Number,
		// },
	},
	{
		timestamps: true
	}
);

itemSchema.statics.createItem = async function (item) {
	const newItem = new this({
		_id: new mongoose.Types.ObjectId().toHexString(),
		itemID: item.itemID,
		characterID: item.characterID,
		// stats: item.stats,
	});

	try {
		// eslint-disable-next-line no-await-in-loop
		await newItem.save();

		console.log(chalk.yellow(`[Item Factory] New Item Created | ID: ${newItem._id} | Item ID: ${newItem.itemID} ${newItem.characterID ? `| Character ID: ${newItem.characterID}` : ''}`));
	} catch (err) {
		console.log(err);
	}

	return newItem;
};

itemSchema.statics.updateItemOwner = async function (_id, characterID) {
	return this.model('items').updateOne({ _id }, { characterID });
};

itemSchema.statics.deleteByID = async function (_id) {
	return this.model('items').deleteOne({ _id });
};

itemSchema.statics.findItemByID = async function (_id) {
	return this.model('items').findOne({ _id });
};

itemSchema.statics.getCharacterItems = async function (characterID) {
	return this.model('items').find({ characterID }).sort({ createdAt: 'asc' });
};

export default mongoose.model('items', itemSchema);
