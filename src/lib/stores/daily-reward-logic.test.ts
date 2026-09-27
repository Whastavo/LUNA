import test from 'node:test';
import assert from 'node:assert/strict';

import {
	claimDailyReward,
	type DailyRewardState,
	dailyRewardAmount,
	dayKey,
	evaluateDailyReward,
	nextMilestone,
	planMultiplier
} from './daily-reward-logic.ts';

const DAY = 86_400_000;

test('dayKey ancla cualquier hora del día a la misma medianoche UTC', () => {
	const morning = dayKey(Date.UTC(2026, 8, 19, 3, 30));
	const night = dayKey(Date.UTC(2026, 8, 19, 23, 59));
	assert.equal(morning, night);
});

test('planMultiplier devuelve 1 / 1.5 / 2 según el plan', () => {
	assert.equal(planMultiplier('free'), 1);
	assert.equal(planMultiplier('pro'), 1.5);
	assert.equal(planMultiplier('infinity'), 2);
});

test('la racha suma +10% por día hasta un tope de +100%', () => {
	assert.equal(dailyRewardAmount('free', 0), 50);
	assert.equal(dailyRewardAmount('free', 3), 65);
	assert.equal(dailyRewardAmount('free', 15), 100);
	assert.equal(dailyRewardAmount('infinity', 0), 100);
});

test('primer día: se puede reclamar y la racha proyectada es 1', () => {
	const check = evaluateDailyReward({ lastClaimDay: null, streak: 0, bestStreak: 0 }, 'free');
	assert.equal(check.canClaim, true);
	assert.equal(check.projectedStreak, 1);
});

test('reclamar hoy bloquea un segundo reclamo el mismo día', () => {
	const now = Date.now();
	const { state } = claimDailyReward({ lastClaimDay: null, streak: 0, bestStreak: 0 }, 'free', now);
	const check = evaluateDailyReward(state, 'free', now + 60_000);
	assert.equal(check.canClaim, false);
	assert.equal(check.projectedStreak, 1);
});

test('reclamar al día siguiente continúa la racha', () => {
	const now = Date.now();
	const { state } = claimDailyReward({ lastClaimDay: null, streak: 0, bestStreak: 0 }, 'free', now);
	const check = evaluateDailyReward(state, 'free', now + DAY);
	assert.equal(check.canClaim, true);
	assert.equal(check.continuesStreak, true);
	assert.equal(check.projectedStreak, 2);
});

test('saltar un día rompe la racha y reinicia en 1', () => {
	const now = Date.now();
	const { state } = claimDailyReward({ lastClaimDay: null, streak: 4, bestStreak: 4 }, 'free', now);
	const check = evaluateDailyReward(state, 'free', now + 2 * DAY);
	assert.equal(check.canClaim, true);
	assert.equal(check.continuesStreak, false);
	assert.equal(check.projectedStreak, 1);
});

test('cada 7 días de racha cae el bonus de hito', () => {
	const now = Date.now();
	let state: DailyRewardState = { lastClaimDay: null, streak: 0, bestStreak: 0 };
	for (let i = 0; i < 7; i++) {
		const result = claimDailyReward(state, 'free', now + i * DAY);
		state = result.state;
		if (i === 6) {
			assert.equal(result.milestoneBonus, 100);
			assert.equal(result.amount, 50 + 6 * 5); // racha de 7 = +60%
		} else {
			assert.equal(result.milestoneBonus, 0);
		}
	}
	assert.equal(state.streak, 7);
	assert.equal(state.bestStreak, 7);
});

test('el hito escala con el multiplicador del plan', () => {
	const now = Date.now();
	let state: DailyRewardState = { lastClaimDay: null, streak: 0, bestStreak: 0 };
	let lastResult = claimDailyReward(state, 'pro', now);
	for (let i = 0; i < 7; i++) {
		lastResult = claimDailyReward(state, 'pro', now + i * DAY);
		state = lastResult.state;
	}
	// Séptimo reclamo con plan Pro: bonus 100 × 1.5
	assert.equal(lastResult.milestoneBonus, 150);
	// El octavo día ya no toca hito
	const next = claimDailyReward(state, 'pro', now + 7 * DAY);
	assert.equal(next.milestoneBonus, 0);
	assert.equal(next.state.streak, 8);
});

test('nextMilestone apunta al próximo múltiplo de 7', () => {
	assert.equal(nextMilestone(0), 7);
	assert.equal(nextMilestone(3), 7);
	assert.equal(nextMilestone(7), 14);
	assert.equal(nextMilestone(8), 14);
});
