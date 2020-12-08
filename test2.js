/**
Length of a tick in milliseconds. The denominator is your desired framerate.
e.g. 1000 / 20 = 20 fps,  1000 / 60 = 60 fps
*/
const tickLengthMs = 1000 / 10;

/* gameLoop related variables */
// timestamp of each loop
let previousTick = Date.now();
// number of times gameLoop gets called
let actualTicks = 0;

/**
Update is normally where all of the logic would go. In this case we simply call
a function that takes 10 milliseconds to complete thus simulating that our game
had a very busy time.
*/
const update = (delta) => {

};

const gameLoop = () => {
	const now = Date.now();

	actualTicks += 1;
	if (previousTick + tickLengthMs <= now) {
		const delta = (now - previousTick) / 1000;
		previousTick = now;

		update(delta);

		console.log('delta', delta, `(target: ${tickLengthMs} ms)`, 'node ticks', actualTicks);
		actualTicks = 0;
	}

	if (Date.now() - previousTick < tickLengthMs - 16) {
		setTimeout(gameLoop);
	} else {
		setImmediate(gameLoop);
	}
};

/**
A function that wastes time, and occupies 100% CPU while doing so.
Suggested use: simulating that a complex calculation took time to complete.
*/
// begin the loop !
gameLoop();
