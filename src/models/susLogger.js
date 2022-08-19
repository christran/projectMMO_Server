/* eslint-disable func-names */
import mongoose from 'mongoose';

/*
// How to add a new entry
	susLog.new({
		socket,
		reason: 'speed hacking'
	});
*/

const SusLogSchema = new mongoose.Schema(
	{
		accountID: { type: String, required: true },
		characterName: { type: String, required: true },
		reason: { type: String, required: true },
		ip: { type: String, required: true },
	},
	{
		timestamps: true,
		collection: 'susLog'
	}
);

SusLogSchema.statics.new = async function (data) {
	if (data.socket) {
		const { character } = data.socket;

		this.create(
			{
				accountID: character.accountID,
				characterName: character.name,
				reason: data.reason,
				ip: data.socket.handshake.address
			}
		)
			.catch((err) => console.log(err));
	}
};

export default mongoose.model('susLog', SusLogSchema);
