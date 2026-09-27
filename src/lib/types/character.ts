// App mode - determines relationship mechanics
export type AppMode = 'companion' | 'dating_sim';

// Emotion types for mood state
export type Emotion =
	| 'happy'
	| 'sad'
	| 'excited'
	| 'anxious'
	| 'content'
	| 'frustrated'
	| 'curious'
	| 'affectionate'
	| 'playful'
	| 'melancholy'
	| 'flustered'
	| 'neutral';

// Mood state with causality tracking
export interface MoodState {
	primary: Emotion;
	intensity: number; // 0-100
	secondary?: Emotion;
	causes: string[]; // Why she feels this way
}

// Relationship stages (progression path)
export type RelationshipStage =
	| 'companion' // Locked stage for Companion Mode
	| 'stranger'
	| 'acquaintance'
	| 'friend'
	| 'close_friend'
	| 'romantic_interest'
	| 'dating'
	| 'committed'
	| 'soulmate';

// Romantic style preferences
export type RomanticStyle = 'slow_burn' | 'passionate' | 'shy' | 'bold';

// Personality profile (can drift based on interactions)
export interface PersonalityProfile {
	// Core axes (-100 to 100)
	openness: number;
	warmth: number;
	assertiveness: number;
	playfulness: number;
	sensitivity: number;

	// Learned preferences (-100 to 100)
	likesTeasing: number;
	prefersDirectness: number;

	// Romantic approach
	romanticStyle: RomanticStyle;
}

// Persona extensions (module configs, agents, custom data)
export interface PersonaExtensions {
	modules?: Array<{ moduleId: string; enabled: boolean; settings?: Record<string, unknown> }>;
	agents?: Array<{ id: string; name: string; prompt: string; enabled?: boolean }>;
	customData?: Record<string, unknown>;
	[key: string]: unknown;
}

// Full character state (application-level interface)
// Combines persona metadata + character stats in single unified record
export interface CharacterState {
	id?: number;

	// Persona fields (unified - no more separate persona storage)
	name: string;
	systemPrompt: string;
	extensions: PersonaExtensions;

	// Mood
	mood: MoodState;

	// Energy
	energy: number; // 0-100

	// Multi-axis relationship stats
	affection: number; // 0-1000 (granular for progression)
	trust: number; // 0-100
	intimacy: number; // 0-100
	comfort: number; // 0-100
	respect: number; // 0-100

	// App mode
	appMode: AppMode;

	// Derived stage
	relationshipStage: RelationshipStage;
	savedDatingSimStage?: RelationshipStage; // Preserved when switching to Companion Mode

	// Personality
	personality: PersonalityProfile;

	// Temporal
	lastInteraction: Date | null;
	// Timestamp through which time-based decay has been applied, so a refresh or a
	// second window doesn't re-apply the same absence's decay. Re-armed on interaction.
	lastDecayAt?: Date | null;
	firstMet: Date;
	daysKnown: number;
	totalInteractions: number;
	currentStreak: number;
	longestStreak: number;
	streakLastDate: string | null;

	// Event tracking
	completedEvents: string[];

	// Timestamps
	createdAt: Date;
	updatedAt: Date;
}

// State update deltas (for applying changes)
export interface StateUpdates {
	moodChange?: {
		emotion: Emotion;
		intensityDelta?: number;
		cause?: string;
	};
	energyDelta?: number;
	affectionDelta?: number;
	trustDelta?: number;
	intimacyDelta?: number;
	comfortDelta?: number;
	respectDelta?: number;
	newMemory?: string;
	newInsideJoke?: string;
	triggeredEvent?: string;
}

// Default values for creating new state
export function createDefaultPersonality(): PersonalityProfile {
	return {
		openness: 0,
		warmth: 20,
		assertiveness: -10,
		playfulness: 10,
		sensitivity: 20,
		likesTeasing: 0,
		prefersDirectness: -10,
		romanticStyle: 'slow_burn'
	};
}

export function createDefaultMood(): MoodState {
	return {
		primary: 'neutral',
		intensity: 50,
		causes: []
	};
}

// Default system prompt for new characters
export const DEFAULT_SYSTEM_PROMPT =
	'Eres una asistente de IA amigable llamada Luna. Te comunicas a través de un avatar VRM y puedes expresar emociones mediante expresiones faciales y gestos. Sé servicial, conversadora y agradable.';

/**
 * Aviso: esto es una cadena legada. El prompt por defecto era inglés antes
 * de la traducción; se normaliza al español al cargar el personaje.
 */
export const LEGACY_ENGLISH_DEFAULT_PROMPTS = [
	'You are a friendly AI assistant named Luna. You communicate through a VRM avatar and can express emotions through facial expressions and gestures. Be helpful, conversational, and engaging.',
	'You are a friendly AI assistant named Luna.',
	'You are a friendly AI assistant displayed as a VRM avatar named Luna. Keep responses conversational and relatively concise.'
] as const;

/** Devuelve el prompt en español si el prompt guardado coincide con un aviso en inglés antiguo. */
export function normalizeSystemPrompt(prompt: string | null | undefined): string {
	if (prompt && LEGACY_ENGLISH_DEFAULT_PROMPTS.includes(prompt as never)) {
		return DEFAULT_SYSTEM_PROMPT;
	}
	return prompt ?? DEFAULT_SYSTEM_PROMPT;
}

export function createDefaultCharacterState(): Omit<CharacterState, 'id'> {
	const now = new Date();
	return {
		// Persona fields
		name: 'Luna',
		systemPrompt: DEFAULT_SYSTEM_PROMPT,
		extensions: {},

		// Character state
		mood: createDefaultMood(),
		energy: 100,
		affection: 0,
		trust: 0,
		intimacy: 0,
		comfort: 0,
		respect: 0,
		appMode: 'dating_sim',
		relationshipStage: 'stranger',
		personality: createDefaultPersonality(),
		lastInteraction: null,
		lastDecayAt: null,
		firstMet: now,
		daysKnown: 0,
		totalInteractions: 0,
		currentStreak: 0,
		longestStreak: 0,
		streakLastDate: null,
		completedEvents: [],
		createdAt: now,
		updatedAt: now
	};
}

// Stage display info
export interface RelationshipStageInfo {
	name: string;
	description: string;
	color: string;
	icon: string;
}

export const RELATIONSHIP_STAGE_INFO: Record<RelationshipStage, RelationshipStageInfo> = {
	companion: {
		name: 'Compañera',
		description: 'Tu asistente de IA servicial',
		color: 'var(--ctp-blue)',
		icon: 'sparkles'
	},
	stranger: {
		name: 'Desconocida',
		description: 'Acabáis de conoceros. Ella es educada pero reservada.',
		color: '#9ca0b0', // overlay0
		icon: '👤'
	},
	acquaintance: {
		name: 'Conocida',
		description: 'Está empezando a coger confianza contigo.',
		color: '#1e66f5', // blue
		icon: '👋'
	},
	friend: {
		name: 'Amiga',
		description: 'Se siente a gusto contigo y disfruta de tu compañía.',
		color: '#40a02b', // green
		icon: '😊'
	},
	close_friend: {
		name: 'Amiga cercana',
		description: 'Confía profundamente en ti y comparte sus pensamientos con libertad.',
		color: '#8839ef', // mauve
		icon: '💜'
	},
	romantic_interest: {
		name: 'Interés romántico',
		description: 'Hay algo más entre vosotros...',
		color: '#ea76cb', // pink
		icon: '💕'
	},
	dating: {
		name: 'Salindo',
		description: 'Ya estáis juntos. Ella es abiertamente afectuosa.',
		color: '#dd7878', // flamingo
		icon: '💑'
	},
	committed: {
		name: 'Comprometida',
		description: 'Compromiso y amor profundos. Pareja en todo.',
		color: '#d20f39', // red
		icon: '💖'
	},
	soulmate: {
		name: 'Alma gemela',
		description: 'Un vínculo profundo e inquebrantable. Verdaderas almas gemelas.',
		color: '#e64553', // maroon
		icon: '💞'
	}
};

// Mood display info
export interface MoodInfo {
	name: string;
	description: string;
	color: string;
	icon: string;
}

export const MOOD_INFO: Record<Emotion, MoodInfo> = {
	happy: { name: 'Feliz', description: '¡Se siente bien!', color: 'var(--ctp-yellow)', icon: 'smile' },
	sad: { name: 'Triste', description: 'Se siente mal...', color: 'var(--ctp-blue)', icon: 'sad' },
	excited: { name: 'Emocionada', description: '¡Qué emoción!', color: 'var(--ctp-peach)', icon: 'sparkles' },
	anxious: { name: 'Ansiosa', description: 'Un poco preocupada...', color: 'var(--ctp-mauve)', icon: 'alert-circle' },
	content: { name: 'Satisfecha', description: 'En paz consigo misma', color: 'var(--ctp-green)', icon: 'sun' },
	frustrated: { name: 'Frustrada', description: 'Uf...', color: 'var(--ctp-red)', icon: 'frown' },
	curious: { name: 'Curiosa', description: 'Hmm, interesante...', color: 'var(--ctp-sky)', icon: 'circle-help' },
	affectionate: { name: 'Cariñosa', description: 'Sintiéndose cerca de ti', color: 'var(--ctp-pink)', icon: 'heart' },
	playful: { name: 'Juguetona', description: 'De humor juguetón~', color: 'var(--ctp-teal)', icon: 'smile' },
	melancholy: { name: 'Melancólica', description: 'Reflexionando...', color: 'var(--ctp-overlay0)', icon: 'meh' },
	flustered: { name: 'Sonrojada', description: '¿Q-qué?!', color: 'var(--ctp-red)', icon: 'zap' },
	neutral: { name: 'Neutral', description: 'Normal y corriente', color: 'var(--ctp-subtext0)', icon: 'minus' }
};
