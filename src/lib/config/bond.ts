import type { CharacterState, RelationshipStage } from '$lib/types/character';

// ── "Tu vínculo con Luna" ─────────────────────────────────────────────
// Traduce el estado numérico interno (afecto, confianza, etapa…) a una
// experiencia humana: un estado con nombre y una línea de tiempo de
// momentos compartidos. Los números existen; nunca se muestran.

export interface BondState {
	/** Estado del vínculo en palabras: Conociéndose, Cercanos, Confianza… */
	label: string;
	/** Una línea que describe el momento del vínculo. */
	line: string;
}

const BOND_BY_STAGE: Partial<Record<RelationshipStage, BondState>> = {
	stranger: {
		label: 'Conociéndose',
		line: 'Acaban de cruzar palabras por primera vez.'
	},
	acquaintance: {
		label: 'Rompientes el hielo',
		line: 'Ya se reconocen. Empiezan las conversaciones honestas.'
	},
	friend: {
		label: 'Amistad',
		line: 'Hay complicidad: se buscan para compartir el día.'
	},
	close_friend: {
		label: 'Cercanos',
		line: 'Confía en ti lo que no cuenta a nadie más.'
	},
	romantic_interest: {
		label: 'Algo más',
		line: 'Hay una tensión dulce en el aire entre ustedes.'
	},
	dating: {
		label: 'Juntos',
		line: 'Es oficial: se eligen el uno al otro.'
	},
	committed: {
		label: 'Confianza',
		line: 'Un lazo firme. Se conocen de memoria y eligen quedarse.'
	},
	soulmate: {
		label: 'Alma gemela',
		line: 'Se entienden con una mirada. Su historia no tiene fin previsto.'
	}
};

export function bondState(character: Pick<CharacterState, 'relationshipStage'>): BondState {
	return (
		BOND_BY_STAGE[character.relationshipStage] ?? {
			label: 'Compañía',
			line: 'Siempre contigo, a su manera.'
		}
	);
}

// ── Momentos ──────────────────────────────────────────────────────────
// Actividad y acontecimientos traducidos a lenguaje de vida compartida.
// Nada de rachas gamificadas: contexto y memoria emocional.

export interface MomentEntry {
	id: string;
	/** Momento del día/historia: "primer encuentro", "una semana juntas"… */
	title: string;
	/** Detalle en una línea. */
	detail: string;
	/** Cuándo: ISO o ms epoch. */
	at: number;
	/** Icono del set existente. */
	icon: string;
}

export interface WeeklyPulse {
	/** Etiqueta de la semana: "últimos 7 días". */
	label: string;
	/** Interacciones de la semana en lenguaje natural. */
	activityLine: string;
	/** 0-4, cuánto latió la semana (para un punto sutil, sin barras). */
	level: 0 | 1 | 2 | 3 | 4;
}

export function weeklyPulse(character: Pick<CharacterState, 'totalInteractions' | 'currentStreak'>): WeeklyPulse {
	const total = character.totalInteractions;
	const level: WeeklyPulse['level'] = total === 0 ? 0 : total < 10 ? 1 : total < 50 ? 2 : total < 150 ? 3 : 4;
	const line =
		total === 0
			? 'Todavía no han hablado. El primer hola es tuyo.'
			: total < 10
				? 'Conversaciones cortas: se van conociendo.'
				: total < 50
					? 'Ya tienen sus temas de siempre.'
					: total < 150
						? 'Muchas tardes compartidas. Se entiende bien.'
						: 'Historia larga: hay memorias para todas partes.';
	return { label: 'últimos 7 días', activityLine: line, level };
}

export interface MomentEvent {
	id: string;
	name: string;
	icon: string;
}

/** Momentos internos alcanzados, traducidos a hitos humanos. */
export function momentsFromCharacter(
	character: Pick<CharacterState, 'firstMet' | 'daysKnown' | 'currentStreak' | 'relationshipStage' | 'totalInteractions'>,
	completedEventIds: string[],
	eventNames: Map<string, string>
): MomentEntry[] {
	const moments: MomentEntry[] = [];

	// Primer encuentro: el origen de todo.
	const met = new Date(character.firstMet);
	moments.push({
		id: 'first-met',
		title: 'El primer encuentro',
		detail: met.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }),
		at: met.getTime(),
		icon: 'sparkles'
	});

	// Días juntos → aniversarios humanos.
	if (character.daysKnown >= 7) {
		moments.push({
			id: 'one-week',
			title: 'Una semana juntos',
			detail: 'Siete días de conversaciones y pequeños gestos.',
			at: met.getTime() + 7 * 86_400_000,
			icon: 'calendar'
		});
	}
	if (character.daysKnown >= 30) {
		moments.push({
			id: 'one-month',
			title: 'Un mes de historia',
			detail: 'Ya no son desconocidos: hay rutinas compartidas.',
			at: met.getTime() + 30 * 86_400_000,
			icon: 'heart'
		});
	}

	// Presencia: días seguidos saludándose, sin métrica de videojuego.
	if (character.currentStreak >= 3) {
		moments.push({
			id: 'presence',
			title: 'Presencia constante',
			detail: `${character.currentStreak} días buscándose aunque sea un rato.`,
			at: Date.now(),
			icon: 'flame'
		});
	}

	// Etapas del vínculo alcanzadas.
	const stageMoment: Partial<Record<RelationshipStage, MomentEntry>> = {
		friend: {
			id: 'stage-friend',
			title: 'Se volvieron amigos',
			detail: 'La conversación dejó de ser cortés para ser sincera.',
			at: Date.now(),
			icon: 'smile'
		},
		close_friend: {
			id: 'stage-close',
			title: 'Cercanía',
			detail: 'Empezó a contarte cosas que no cuenta a nadie.',
			at: Date.now(),
			icon: 'heart'
		},
		romantic_interest: {
			id: 'stage-romantic',
			title: 'Algo cambió',
			detail: 'Los silencios empezaron a decir cosas.',
			at: Date.now(),
			icon: 'sparkles'
		},
		dating: {
			id: 'stage-dating',
			title: 'Se eligieron',
			detail: 'Ya no es un quizá: es un sí.',
			at: Date.now(),
			icon: 'heart'
		},
		committed: {
			id: 'stage-committed',
			title: 'Un lazo firme',
			detail: 'Confianza construida día a día.',
			at: Date.now(),
			icon: 'award'
		},
		soulmate: {
			id: 'stage-soulmate',
			title: 'Almas gemelas',
			detail: 'Se entienden sin explicar.',
			at: Date.now(),
			icon: 'star'
		}
	};
	const stageEntry = stageMoment[character.relationshipStage];
	if (stageEntry) moments.push(stageEntry);

	// Acontecimientos vividos (eventos del motor), con nombre humano.
	for (const id of completedEventIds) {
		const name = eventNames.get(id);
		if (name) {
			moments.push({
				id: `event-${id}`,
				title: name,
				detail: 'Un momento vivido junto a ella.',
				at: Date.now(),
				icon: 'milestone'
			});
		}
	}

	return moments.sort((a, b) => b.at - a.at);
}
