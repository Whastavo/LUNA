import type { ModuleDefinition } from '$lib/types/module';

export const consciousnessModule: ModuleDefinition = {
	metadata: {
		id: 'consciousness',
		name: 'Consciousness',
		description: 'Large Language Model for AI responses and reasoning',
		category: 'essential',
		icon: 'brain'
	},

	settingsSchema: {
		fields: [
			{
				key: 'activeProvider',
				type: 'provider-select',					label: 'Proveedor LLM',
					description: 'Selecciona entre tus proveedores LLM configurados',
				providerCategory: 'llm',
				defaultValue: ''
			},
			{
				key: 'activeModel',
				type: 'model-select',					label: 'Modelo',
					description: 'Selecciona un modelo del proveedor elegido',
				dependsOnField: 'activeProvider',
				providerCategory: 'llm'
			},
			{
				key: 'temperature',
				type: 'number',					label: 'Temperatura',
					description: 'Controla la aleatoriedad en las respuestas (0.0-2.0)',
				defaultValue: 0.7
			},
			{
				key: 'topP',
				type: 'number',					label: 'Top P',
					description: 'Umble de muestreo por núcleo (0.0-1.0)',
				defaultValue: 1.0
			},
			{
				key: 'maxTokens',
				type: 'number',					label: 'Tokens máximos',
					description: 'Tokens máximos en la respuesta. Déjalo vacío para usar el valor por defecto del proveedor.'
			},
			{
				key: 'contextSize',
				type: 'number',					label: 'Ventana de contexto',
					description: 'Tamaño máximo de contexto del modelo seleccionado en tokens. Se usa para escalar la inyección de memoria y truncar el historial. Déjalo vacío para mantener el comportamiento por defecto.'
			},
			{
				key: 'presencePenalty',
				type: 'number',					label: 'Penalización de presencia',
					description: 'Penaliza tokens que ya han aparecido (-2.0 a 2.0)',
				defaultValue: 0
			},
			{
				key: 'frequencyPenalty',
				type: 'number',					label: 'Penalización de frecuencia',
					description: 'Penaliza tokens según la frecuencia con la que han aparecido (-2.0 a 2.0)',
				defaultValue: 0
			}
		]
	},

	isConfigured(settings: Record<string, unknown>): boolean {
		// Consciousness is configured if a provider is selected
		return !!settings.activeProvider && !!settings.activeModel;
	},

	async onEnable() {
	},

	async onDisable() {
	},

	onSettingsChange(settings: Record<string, unknown>) {
	}
};
