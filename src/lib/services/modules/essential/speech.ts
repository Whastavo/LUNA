import type { ModuleDefinition } from '$lib/types/module';

export const speechModule: ModuleDefinition = {
	metadata: {
		id: 'speech',
		name: 'Speech',
		description: 'Text-to-Speech for voice output',
		category: 'essential',
		icon: 'volume'
	},

	settingsSchema: {
		fields: [
			{
				key: 'activeProvider',
				type: 'provider-select',
				label: 'Proveedor TTS',
				description: 'Selecciona entre tus proveedores TTS configurados',
				providerCategory: 'tts',
				defaultValue: ''
			},
			{
				key: 'activeModel',
				type: 'model-select',					label: 'Modelo',
					description: 'Selecciona un modelo TTS del proveedor elegido',
				dependsOnField: 'activeProvider',
				providerCategory: 'tts'
			},
			{
				key: 'activeVoiceId',
				type: 'text',					label: 'ID de voz',
					description: 'Identificador de voz para el proveedor seleccionado',
					placeholder: 'Selecciona una voz'
			},
			{
				key: 'activeLanguage',
				type: 'text',					label: 'Idioma',
					description: 'Idioma principal para TTS multilingüe (ISO 639-1)',
					placeholder: 'es',
					defaultValue: 'es'
			},
			{
				key: 'enableAltLanguage',
				type: 'boolean',					label: 'Habilitar idioma alternativo',
					description: 'Usar una voz diferente para texto en otro idioma',
				defaultValue: false
			},
			{
				key: 'enableToolCalling',
				type: 'boolean',					label: 'Habilitar llamadas a funciones',
					description: 'Forzar idioma por segmento de habla (más fiable, pero requiere soporte de llamadas a funciones del LLM)',
				defaultValue: true
			},
			{
				key: 'altLanguage',
				type: 'text',					label: 'Idioma alternativo',
					description: 'Código ISO 639-1 para el idioma alternativo',
					placeholder: 'en',
				defaultValue: ''
			},
			{
				key: 'altVoiceId',
				type: 'text',					label: 'Voz alternativa',
					description: 'ID de voz para el idioma alternativo',
					placeholder: 'Selecciona una voz',
				defaultValue: ''
			},
			{
				key: 'altInstructions',
				type: 'text',					label: 'Instrucciones de voz alternativa',
					description: 'Instrucciones de diseño de voz para el idioma alternativo',
					placeholder: 'p. ej. masculina, madura',
				defaultValue: ''
			},
			{
				key: 'altSpeed',
				type: 'number',					label: 'Velocidad de voz alternativa',
					description: 'Velocidad del habla para el idioma alternativo (0.5-2.0). Recurre a la velocidad principal.',
				defaultValue: 1.0
			},
			{
				key: 'altNumStep',
				type: 'number',					label: 'Pasos de voz alternativa',
					description: 'Pasos de calidad OmniVoice para el idioma alternativo (4-64). Recurre al principal.',
				defaultValue: 32
			},
			{
				key: 'altPositionTemperature',
				type: 'number',					label: 'Temperatura de posición alternativa',
					description: 'Temperatura de diversidad de voz para el idioma alternativo (0-2). Recurre al principal.',
				defaultValue: 1.0
			},
			{
				key: 'altClassTemperature',
				type: 'number',					label: 'Temperatura de clase alternativa',
					description: 'Temperatura de muestreo de tokens para el idioma alternativo (0-2). Recurre al principal.',
				defaultValue: 0.2
			},
			{
				key: 'speed',
				type: 'number',					label: 'Velocidad',
					description: 'Velocidad del habla (0.5-2.0)',
				defaultValue: 1.0
			},
			{
				key: 'instructions',
				type: 'text',					label: 'Instrucciones de voz',
					description: 'Descripción en lenguaje natural de la voz sintética',
			},
			{
				key: 'numStep',
				type: 'number',					label: 'Pasos numéricos',
					description: 'Pasos de calidad OmniVoice (4-64)',
				defaultValue: 32
			},
			{
				key: 'positionTemperature',
				type: 'number',					label: 'Temperatura de posición',
					description: 'Temperatura de posición OmniVoice (0-2)',
				defaultValue: 1.0
			},
			{
				key: 'classTemperature',
				type: 'number',					label: 'Temperatura de clase',
					description: 'Temperatura de clase OmniVoice (0-2)',
				defaultValue: 0.2
			}
		]
	},

	isConfigured(settings: Record<string, unknown>): boolean {
		// Speech is configured if a provider is selected
		// Some providers (like browser TTS) don't require voice ID
		return !!settings.activeProvider;
	},

	async onEnable() {
	},

	async onDisable() {
	},

	onSettingsChange(settings: Record<string, unknown>) {
	}
};
