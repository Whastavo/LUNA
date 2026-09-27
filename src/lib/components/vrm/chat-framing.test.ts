import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyChatFraming, type ChatFrame } from './chat-framing.ts';

type CameraStub = {
	aspect: number;
	setViewOffset: (w: number, h: number, x: number, y: number, w2: number, h2: number) => void;
	clearViewOffset: () => void;
};

function makeCamera() {
	const calls: Array<{ w: number; h: number; x: number; y: number }> = [];
	let cleared = 0;
	const cam: CameraStub = {
		aspect: 1,
		setViewOffset: (w, h, x, y) => calls.push({ w, h, x, y }),
		clearViewOffset: () => cleared++
	};
	return { cam, calls, getCleared: () => cleared };
}

const frame: ChatFrame = { width: 400, height: 600, left: true };

test('applyChatFraming offsets the view so the subject stays in the free area (panel left)', () => {
	const { cam, calls, getCleared } = makeCamera();
	applyChatFraming(cam as never, { width: 800, height: 600 }, frame);
	assert.equal(getCleared(), 0);
	// Full-size view rendered from a 400×600 projection shifted to the right
	assert.deepEqual(calls, [{ w: 400, h: 600, x: -400, y: 0 }]);
});

test('applyChatFraming keeps the default aspect when no frame applies', () => {
	const { cam, calls, getCleared } = makeCamera();
	applyChatFraming(cam as never, { width: 800, height: 600 }, undefined);
	assert.equal(cam.aspect, 800 / 600);
	assert.equal(getCleared(), 1);
	assert.deepEqual(calls, []);
});

test('applyChatFraming ignores frames larger than the viewport', () => {
	const { cam, calls, getCleared } = makeCamera();
	applyChatFraming(cam as never, { width: 800, height: 600 }, {
		width: 900,
		height: 700,
		left: false
	});
	assert.equal(getCleared(), 1);
	assert.deepEqual(calls, []);
});

test('applyChatFraming skips zero-size viewports', () => {
	const { cam, calls, getCleared } = makeCamera();
	applyChatFraming(cam as never, { width: 0, height: 0 }, frame);
	assert.deepEqual(calls, []);
	assert.equal(getCleared(), 0);
});
