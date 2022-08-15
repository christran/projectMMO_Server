/* eslint-disable func-names */
// const uniqueValidator = require('mongoose-unique-validator');
const chalk = require('chalk');
const db = require('../../db');

const itemSchema = new db.mongoose.Schema(
	{
		_id: String,
		itemID: { type: Number, required: true },
		characterID: { type: String, default: 'none' },
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
		_id: new db.mongoose.Types.ObjectId().toHexString(),
		itemID: item.itemID,
		characterID: item.characterID,
		// stats: item.stats,
	});

	try {
		await newItem.save();

		console.log(chalk.yellow(`[Item Factory] Created ID: ${newItem._id} | Item ID: ${newItem.itemID} | Character ID: ${newItem.characterID}`));
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

/** @type {Item.statics} */
const Item = db.mongoose.model('items', itemSchema);

module.exports = Item;
