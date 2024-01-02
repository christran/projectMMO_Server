/* eslint-disable func-names */
import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

import Character from './Character.js';

const accountSchema = new mongoose.Schema(
	{
		username: {
			type: String,
			required: true,
			index: true,
			unique: true,
			uniqueCaseInsensitive: true
		},
		password: {
			type: String,
			required: true
		},
		email: {
			type: String,
			// Remind user to confirm their email ingame, don't force them confirm right after registering.
			// required: true,
			index: true,
			unique: true,
			uniqueCaseInsensitive: true,
			default: ''
		},
		isOnline: {
			type: Boolean,
			default: false
		},
		isGM: {
			type: Boolean,
			default: false
		},
		ban: {
			banType: { type: Number, default: 0 },
			banReason: { type: String, default: 'No Reason' }
		},
		lastLoginDate: {
			type: Date
		},
		ip: {
			type: String,
			default: ''
		},
		settings: {
			inventoryPos: {
				x: { type: Number, default: 0 },
				y: { type: Number, default: 0 }
			},
			chatPos: {
				x: { type: Number, default: 0 },
				y: { type: Number, default: 0 }
			}
		},
	},
	{
		timestamps: true
	}
);

accountSchema.plugin(uniqueValidator);

accountSchema.statics.getAccount = async function (username) {
	return this.model('accounts').findOne({ username: new RegExp(`^${username}$`, 'i') });
};

accountSchema.statics.getAccountByID = async function (accountID) {
	return this.model('accounts').findOne({ _id: accountID });
};

accountSchema.statics.getCharacters = async function (accountID) {
	return Character.model('characters').find({ accountID }).sort({ createdAt: 'asc' });
};

const Account = mongoose.model('accounts', accountSchema);

// // Delete Property from Collection
// // Make sure to add it to the schema first
// // After running this code, then delete it from the schema
// Account.updateMany({}, { $unset: { 'settings.test': 1 } }, (err) => {
// 	if (err) {
// 		console.log(`Error: ${err}`);
// 	} else {
// 		console.log('Property deleted successfully');
// 	}
// });

// // Add Property to Collection
// // Make sure to add it to the schema first
// Account.updateMany({}, { $set: { 'settings.test': 1 } }, (err) => {
// 	if (err) {
// 		console.log(`Error: ${err}`);
// 	} else {
// 		console.log('Property added successfully');
// 	}
// });

export default Account;
