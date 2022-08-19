/* eslint-disable func-names */
import mongoose from 'mongoose';

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
		await newItem.save();

		return newItem;
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
