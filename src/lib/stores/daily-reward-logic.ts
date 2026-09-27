import {
	DAILY_BASE_REWARD,
	STREAK_MILESTONE_BONUS,
	STREAK_MILESTONE_EVERY,
	type PlanId
} from '../config/economy.ts';

/** Estado persistido de la recompensa diaria. */
export interface DailyRewardState {
	/** Último día reclamado en ms (UTC medianoche). */
	lastClaimDay: number | null;
	/** Racha actual de días consecutivos. */
	streak: number;
	/** Mejor racha histórica. */
	bestStreak: number;
}

export const DEFAULT_DAILY_REWARD: DailyRewardState = {
	lastClaimDay: null,
	streak: 0,
	bestStreak: 0
};

/** Milisegundos desde epoch hasta la medianoche UTC del día dado. */
export function dayKey(time: number): number {
	const d = new Date(time);
	return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Multiplicador de recompensa por plan. */
export function planMultiplier(plan: PlanId): number {
	return plan === 'infinity' ? 2 : plan === 'pro' ? 1.5 : 1;
}

export function dailyRewardAmount(plan: PlanId, streak: number): number {
	// La racha añade +10% por día consecutivo, tope +100%.
	const streakBoost = Math.min(streak, 10) * 0.1;
	return Math.round(DAILY_BASE_REWARD * planMultiplier(plan) * (1 + streakBoost));
}

export interface DailyRewardCheck {
	canClaim: boolean;
	/** true si el usuario no reclamó HOY pero reclamó ayer (o es su primer día). */
	continuesStreak: boolean;
	amount: number;
	/** Días consecutivos que tendría tras reclamar hoy. */
	projectedStreak: number;
}

export function evaluateDailyReward(
	state: DailyRewardState,
	plan: PlanId,
	now: number = Date.now()
): DailyRewardCheck {
	const today = dayKey(now);
	const yesterday = today - 86_400_000;
	const claimedToday = state.lastClaimDay === today;
	const canClaim = !claimedToday;
	const continuesStreak =
		state.lastClaimDay === null || (state.lastClaimDay !== today && state.lastClaimDay >= yesterday);

	return {
		canClaim,
		continuesStreak,
		amount: dailyRewardAmount(plan, state.streak),
		projectedStreak: canClaim ? (continuesStreak ? state.streak + 1 : 1) : state.streak
	};
}

export interface DailyRewardClaimResult {
	state: DailyRewardState;
	/** Lunas ganadas en este reclamo (sin contar bonus de hito). */
	amount: number;
	/** Bonus extra si la racha alcanzó un hito de 7 días. */
	milestoneBonus: number;
}

export function claimDailyReward(
	state: DailyRewardState,
	plan: PlanId,
	now: number = Date.now()
): DailyRewardClaimResult {
	const check = evaluateDailyReward(state, plan, now);
	if (!check.canClaim) {
		return { state, amount: 0, milestoneBonus: 0 };
	}
	const streak = check.projectedStreak;
	const milestoneBonus =
		streak % STREAK_MILESTONE_EVERY === 0 ? STREAK_MILESTONE_BONUS * streakMultiplier(plan) : 0;
	return {
		state: {
			lastClaimDay: dayKey(now),
			streak,
			bestStreak: Math.max(state.bestStreak, streak)
		},
		amount: check.amount,
		milestoneBonus
	};
}

function streakMultiplier(plan: PlanId): number {
	return planMultiplier(plan);
}

/** Próximo hito de racha (7, 14, 21…) para mostrar "faltan N días". */
export function nextMilestone(streak: number): number {
	const rem = streak % STREAK_MILESTONE_EVERY;
	return rem === 0 ? streak + STREAK_MILESTONE_EVERY : streak + (STREAK_MILESTONE_EVERY - rem);
}
