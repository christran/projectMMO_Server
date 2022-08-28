/* eslint-disable func-names */
import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema(
	{
		accountID: { type: String, required: true },
		characterName: { type: String, required: true },
		type: { type: String, required: true },
		message: { type: String, required: true },
		ip: { type: String, required: false },
	},
	{
		timestamps: true,
		collection: 'chat'
	}
);

ChatSchema.statics.new = async function (data, character) {
	if (character) {
		this.create(
			{
				accountID: character.accountID,
				characterName: character.name,
				type: data.type,
				message: data.message,
				// ip: data.socket.handshake.address
			}
		)
			.catch((err) => console.log(err));
	}
};

export default mongoose.model('chat', ChatSchema);
