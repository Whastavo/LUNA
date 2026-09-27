import test from 'node:test';
import assert from 'node:assert/strict';

import { bondState, weeklyPulse, momentsFromCharacter } from './bond.ts';

const NOW = Date.UTC(2026, 8, 19);
const daysAgo = (n: number) => NOW - n * 86_400_000;

test('bondState traduce etapas a estados humanos', () => {
	assert.equal(bondState({ relationshipStage: 'stranger' }).label, 'Conociéndose');
	assert.equal(bondState({ relationshipStage: 'close_friend' }).label, 'Cercanos');
	assert.equal(bondState({ relationshipStage: 'committed' }).label, 'Confianza');
	// companion y desconocidos caen al estado por defecto
	assert.equal(bondState({ relationshipStage: 'companion' }).label, 'Compañía');
});

test('weeklyPulse crece con las interacciones sin mostrar números de juego', () => {
	assert.equal(weeklyPulse({ totalInteractions: 0, currentStreak: 0 }).level, 0);
	assert.equal(weeklyPulse({ totalInteractions: 5, currentStreak: 1 }).level, 1);
	assert.equal(weeklyPulse({ totalInteractions: 30, currentStreak: 2 }).level, 2);
	assert.equal(weeklyPulse({ totalInteractions: 100, currentStreak: 4 }).level, 3);
	assert.equal(weeklyPulse({ totalInteractions: 500, currentStreak: 9 }).level, 4);
});

test('el primer encuentro siempre es un momento', () => {
	const moments = momentsFromCharacter(
		{ firstMet: new Date(daysAgo(1)), daysKnown: 1, currentStreak: 1, relationshipStage: 'stranger', totalInteractions: 2 },
		[],
		new Map()
	);
	assert.equal(moments[0].id, 'first-met');
	assert.equal(moments.length, 1);
});

test('los aniversarios y la etapa aparecen cuando toca', () => {
	const moments = momentsFromCharacter(
		{
			firstMet: new Date(daysAgo(40)),
			daysKnown: 40,
			currentStreak: 5,
			relationshipStage: 'close_friend',
			totalInteractions: 60
		},
		[],
		new Map()
	);
	const ids = moments.map((m) => m.id);
	assert.ok(ids.includes('one-week'));
	assert.ok(ids.includes('one-month'));
	assert.ok(ids.includes('presence'));
	assert.ok(ids.includes('stage-close'));
	// ordenado de más reciente a más antiguo
	assert.ok(moments[0].at >= moments[moments.length - 1].at);
});

test('los eventos completados se traducen con su nombre humano', () => {
	const names = new Map([['first-weather-chat', 'La primera charla del clima']]);
	const moments = momentsFromCharacter(
		{ firstMet: new Date(daysAgo(2)), daysKnown: 2, currentStreak: 1, relationshipStage: 'stranger', totalInteractions: 3 },
		['first-weather-chat'],
		names
	);
	const eventMoment = moments.find((m) => m.id === 'event-first-weather-chat');
	assert.ok(eventMoment);
	assert.equal(eventMoment.title, 'La primera charla del clima');
});
