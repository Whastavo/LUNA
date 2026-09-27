import test from 'node:test';
import assert from 'node:assert/strict';

import { phaseLabel } from './chat-phase.ts';

test('maps remembering to its label', () => {
	assert.equal(phaseLabel('remembering'), 'Recordando…');
});

test('maps seeing to its label', () => {
	assert.equal(phaseLabel('seeing'), 'Mirando tu foto…');
});

test('maps thinking to its label', () => {
	assert.equal(phaseLabel('thinking'), 'Pensando…');
});
