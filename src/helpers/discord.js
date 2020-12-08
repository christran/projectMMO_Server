const discordHook = require('webhook-discord');
const moment = require('moment');
const randomColor = require('random-color')();

const Account = require('../models/Account');

module.exports = {
	/*
	Player Login Message
	- Optional - Let player choose to opt out of this
	*/
	LoginNotify: async (character) => {
		const account = await Account.getAccountByID(character.accountID).catch((err) => console.log(`[Login Server] Login | Error: ${err}`));

		if (!moment(account.lastLoginDate).isSame(moment(), 'day')) {
			const newDiscordHook = new discordHook.Webhook('https://discord.com/api/webhooks/783926545558798356/FBSLgE0JkOHnqiWMYGXEcXFOcEgH8nACmHjpaAqP2gecgR-UOmCIxwYlKOvjTuldt5zz');

			const discordMsg = new discordHook.MessageBuilder()
				.setName(`${character.name}`)
				.setAvatar('https://i.imgur.com/HLZ0Hq5.png') // Get Character Image from Database / Custom Char Emotion Set by Player
				// .setAuthor(`${character.name}`, 'https://i.imgur.com/shh9J3J.jpeg')
				.setColor(randomColor.hexString())
				.setDescription('Hello. This is my message.'); // Custom Message Set by Player
				// .setText(`${character.name} logged in`);
			newDiscordHook.send(discordMsg);
		} else {
			// Player already logged in today
		}
	}
};
