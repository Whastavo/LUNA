import { browser } from '$app/environment';
import { COIN_PACKS, CREDIT_PACKS, planById, type PlanId } from '$lib/config/economy';
import {
	DEFAULT_DAILY_REWARD,
	claimDailyReward,
	evaluateDailyReward,
	type DailyRewardState
} from './daily-reward-logic.ts';

const STORAGE_KEY = 'luna-account';

// ── Estado ────────────────────────────────────────────────────────────
// Cuenta simulada en el cliente: la sesión real llegará después; mientras
// tanto la UI trabaja sobre este estado persistido y sus acciones.

let plan = $state<PlanId>('pro');
let coins = $state(1_350);
let credits = $state(120);
let daily = $state<DailyRewardState>({ ...DEFAULT_DAILY_REWARD, lastClaimDay: null });
let lastClaim = $state<{ coins: number; milestoneBonus: number } | null>(null);
let hydrated = $state(false);

// ── Persistencia ──────────────────────────────────────────────────────

function persist() {
	if (!browser) return;
	localStorage.setItem(
		STORAGE_KEY,
		JSON.stringify({ plan, coins, credits, daily } satisfies AccountSnapshot)
	);
}

function hydrate() {
	if (!browser || hydrated) return;
	hydrated = true;
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (!saved) return;
		const parsed = JSON.parse(saved) as Partial<AccountSnapshot>;
		if (parsed.plan) plan = parsed.plan;
		if (typeof parsed.coins === 'number') coins = parsed.coins;
		if (typeof parsed.credits === 'number') credits = parsed.credits;
		if (parsed.daily) daily = { ...DEFAULT_DAILY_REWARD, ...parsed.daily };
	} catch (e) {
		console.error('Failed to load account:', e);
	}
}

export interface AccountSnapshot {
	plan: PlanId;
	coins: number;
	credits: number;
	daily: DailyRewardState;
}

// ── Store público ─────────────────────────────────────────────────────

export const accountStore = {
	get plan() {
		return plan;
	},
	get planName() {
		return planById(plan).name;
	},
	get coins() {
		return coins;
	},
	get credits() {
		return credits;
	},
	get daily() {
		return daily;
	},
	get lastClaim() {
		return lastClaim;
	},
	/** Evaluación viva de la recompensa de hoy. */
	get dailyCheck() {
		hydrate();
		return evaluateDailyReward(daily, plan);
	},

	setPlan(next: PlanId) {
		plan = next;
		persist();
	},

	addCoins(amount: number) {
		coins = Math.max(0, coins + amount);
		persist();
	},

	addCredits(amount: number) {
		credits = Math.max(0, credits + amount);
		persist();
	},

	spendCoins(amount: number): boolean {
		if (coins < amount) return false;
		coins -= amount;
		persist();
		return true;
	},

	/** Reclama la recompensa del día. Devuelve lo ganado (o null si ya reclamó). */
	claimDaily(): { coins: number; milestoneBonus: number } | null {
		const result = claimDailyReward(daily, plan);
		if (result.amount === 0 && result.milestoneBonus === 0 && !evaluateChanged(result.state, daily)) {
			return null;
		}
		daily = result.state;
		coins += result.amount + result.milestoneBonus;
		lastClaim = { coins: result.amount, milestoneBonus: result.milestoneBonus };
		persist();
		return lastClaim;
	},

	/** Compra simulada de un paquete de monedas (aún sin cobro real). */
	buyCoinPack(packId: string): boolean {
		const pack = COIN_PACKS.find((p) => p.id === packId);
		if (!pack) return false;
		coins += pack.coins + (pack.bonusCoins ?? 0);
		persist();
		return true;
	},

	/** Compra simulada de un paquete de créditos (aún sin cobro real). */
	buyCreditPack(packId: string): boolean {
		const pack = CREDIT_PACKS.find((p) => p.id === packId);
		if (!pack) return false;
		credits += pack.credits;
		persist();
		return true;
	}
};

function evaluateChanged(a: DailyRewardState, b: DailyRewardState): boolean {
	return a.lastClaimDay !== b.lastClaimDay || a.streak !== b.streak;
}

// Hidrata en cuanto el módulo se usa por primera vez en el cliente.
if (browser) {
	hydrate();
}
