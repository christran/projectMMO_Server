module.exports = {
	awaitStall: async (stallTime = 3000) => {
		await new Promise((resolve) => setTimeout(resolve, stallTime));
	}
};
