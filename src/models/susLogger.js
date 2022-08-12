/* eslint-disable func-names */
const db = require('../../db');

/*
// How to add a new entry
	susLog.newEntry({
		accountID: socket.character.accountID,
		characterName: socket.character.name,
		reason: 'speed hacking'
	});
*/

const SusLogSchema = new db.mongoose.Schema(
	{
		accountID: { type: String, required: true },
		characterName: { type: String, required: true },
		reason: { type: String, required: true }
	},
	{
		timestamps: true,
		collection: 'susLog'
	}
);

SusLogSchema.statics.newEntry = async function (data) {
	this.create(
		{
			accountID: data.accountID,
			characterName: data.characterName,
			reason: data.reason
		}
	)
		.catch((err) => console.log(err));
};

const SusLogger = db.mongoose.model('susLog', SusLogSchema);

module.exports = SusLogger;
