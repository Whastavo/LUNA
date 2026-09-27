import type { EventDefinition } from '$lib/types/events';

// Debug event store for triggering test events
let pendingEvent = $state<EventDefinition | null>(null);

export const debugEventsStore = {
	get pendingEvent() {
		return pendingEvent;
	},

	trigger(event: EventDefinition) {
		pendingEvent = event;
	},

	consume() {
		const event = pendingEvent;
		pendingEvent = null;
		return event;
	}
};

// Sample test events for debugging
export const testEvents: EventDefinition[] = [
	{
		id: 'test_milestone',
		name: 'Hito de prueba',
		type: 'milestone',
		conditions: [],
		scene: {
			id: 'test_milestone_scene',
			intro: 'Está pasando algo especial...',
			dialogue:
				"¡Vaya, este es un evento de prueba de hito! El estilo se ve muy bien, ¿verdad? Me encanta cómo el modal combina con el resto de la app."
		},
		stateChanges: { affectionDelta: 5 },
		oneTime: false,
		priority: 100
	},
	{
		id: 'test_anniversary',
		name: 'Aniversario de prueba',
		type: 'anniversary',
		conditions: [],
		scene: {
			id: 'test_anniversary_scene',
			intro: 'Hoy marca una ocasión especial...',
			dialogue:
				"¡Feliz aniversario! Bueno, no realmente, pero así se ve un evento de aniversario. Bastante bonito, ¿verdad?"
		},
		stateChanges: { affectionDelta: 10, trustDelta: 5 },
		oneTime: false,
		priority: 80
	},
	{
		id: 'test_conditional',
		name: 'Condicional de prueba',
		type: 'conditional',
		conditions: [],
		scene: {
			id: 'test_conditional_scene',
			intro: 'Hoy algo se siente diferente...',
			dialogue: "Quería hablar contigo sobre algo importante...",
			choices: [
				{
					text: "Te escucho.",
					response:
						"Gracias por estar aquí. Esto es solo una prueba, ¡pero tu elección quedó registrada!",
					stateChanges: { trustDelta: 10 }
				},
				{
					text: '¿Qué es?',
					response:
						"Oh, no es nada en serio. ¡Solo probando el sistema de elecciones! Tu selección funciona perfectamente.",
					stateChanges: { affectionDelta: 5 }
				}
			]
		},
		oneTime: false,
		priority: 70
	},
	{
		id: 'test_random',
		name: 'Evento aleatorio de prueba',
		type: 'random',
		conditions: [],
		scene: {
			id: 'test_random_scene',
			dialogue:
				"*bosteza* Oh, ¡hola! Estaba soñando despierta. ¡Eventos aleatorios como este pueden ocurrir en cualquier momento!"
		},
		stateChanges: { comfortDelta: 3 },
		oneTime: false,
		priority: 30
	}
];
