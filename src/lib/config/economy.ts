// ── Economía de cuenta (solo front-end) ──────────────────────────────
// Definición de planes, monedas y créditos que la nueva configuración
// presenta. Los precios y límites viven aquí; las acciones reales
// (pagos, consumo) se conectarán después sin tocar la UI.

export type PlanId = 'free' | 'pro' | 'infinity';

export interface Plan {
	id: PlanId;
	name: string;
	priceLabel: string;
	period: string;
	/** Resumen de una línea para la tarjeta. */
	tagline: string;
	/** Ventajas destacadas por plan (máximo 4 por tarjeta). */
	features: string[];
	/** Multiplicador de la recompensa diaria de monedas. */
	dailyBonusMultiplier: number;
	accent: 'neutral' | 'violet' | 'rose';
}

export const PLANS: Plan[] = [
	{
		id: 'free',
		name: 'Gratis',
		priceLabel: 'S/ 0',
		period: 'para siempre',
		tagline: 'Todo lo esencial para empezar a convivir con ella.',
		features: [
			'Chat y voz con sus modelos base',
			'Memoria de largo plazo básica',
			'Un avatar VRM y una habitación',
			'Recompensa diaria ×1'
		],
		dailyBonusMultiplier: 1,
		accent: 'neutral'
	},
	{
		id: 'pro',
		name: 'Pro',
		priceLabel: 'S/ 19',
		period: 'al mes',
		tagline: 'Más memoria, más voz, más ella.',
		features: [
			'Modelos premium de chat y voz',
			'Memoria extendida + recuerdos fijos',
			'Todos los avatares y escenas',
			'Recompensa diaria ×1.5'
		],
		dailyBonusMultiplier: 1.5,
		accent: 'violet'
	},
	{
		id: 'infinity',
		name: 'Infinity',
		priceLabel: 'S/ 39',
		period: 'al mes',
		tagline: 'La experiencia completa, sin topes.',
		features: [
			'Todo lo de Pro, sin límites de uso',
			'Modos experimentales antes que nadie',
			'Fotomodo en máxima calidad',
			'Recompensa diaria ×2'
		],
		dailyBonusMultiplier: 2,
		accent: 'rose'
	}
];

export interface CoinPack {
	id: string;
	name: string;
	/** Cantidad de lunas que recibe el usuario. */
	coins: number;
	/** Etiqueta de precio tal como se muestra (sin cobro real aún). */
	priceLabel: string;
	/** Monedas extra incluidas (se muestran como +N). */
	bonusCoins?: number;
	badge?: string;
}

export const COIN_PACKS: CoinPack[] = [
	{ id: 'pack-s', name: 'Puñado de lunas', coins: 500, priceLabel: 'S/ 4.90' },
	{ id: 'pack-m', name: 'Frasco de lunas', coins: 1_200, priceLabel: 'S/ 9.90', bonusCoins: 100, badge: 'Popular' },
	{ id: 'pack-l', name: 'Cofre de lunas', coins: 3_000, priceLabel: 'S/ 19.90', bonusCoins: 400 },
	{ id: 'pack-xl', name: 'Galaxia de lunas', coins: 8_000, priceLabel: 'S/ 39.90', bonusCoins: 1_500, badge: 'Mejor valor' }
];

export interface CreditPack {
	id: string;
	name: string;
	/** Créditos de inference premium (minutos aproximados de conversación). */
	credits: number;
	priceLabel: string;
}

export const CREDIT_PACKS: CreditPack[] = [
	{ id: 'credit-s', name: '60 créditos', credits: 60, priceLabel: 'S/ 5.90' },
	{ id: 'credit-m', name: '200 créditos', credits: 200, priceLabel: 'S/ 14.90' },
	{ id: 'credit-l', name: '600 créditos', credits: 600, priceLabel: 'S/ 34.90' }
];

/** Recompensa base por entrar cada día (se multiplica por el plan). */
export const DAILY_BASE_REWARD = 50;

/** Días extra de racha que añaden bonus (cada 7 días). */
export const STREAK_MILESTONE_EVERY = 7;

/** Bonus de lunas al alcanzar un hito de racha. */
export const STREAK_MILESTONE_BONUS = 100;

export function planById(id: PlanId): Plan {
	return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function planAccentVar(id: PlanId): string {
	switch (planById(id).accent) {
		case 'violet':
			return 'var(--stat-comfort)';
		case 'rose':
			return 'var(--stat-intimacy)';
		default:
			return 'var(--accent)';
	}
}
