<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { Icon } from '$lib/components/ui';
	import './ai-services-settings.css';
</script>

<div class="service-group">
	<div class="service-header">
		<Icon name="mic" size={14} />
		<span>Entrada de voz (STT)</span>
	</div>
	<p class="stt-hint">Entrada de voz de mayor calidad mediante Whisper. Se usa un servidor local si está configurado; después Groq, después OpenAI y, por último, el reconocimiento integrado del navegador. Obligatorio en escritorio (que no tiene reconocimiento integrado).</p>

	<span class="stt-sublabel">Clave de API de Groq</span>
	<div class="api-key-row">
		<input
			type="password"
			class="api-key-input"
			placeholder="Clave de API de Groq"
			value={settingsStore.getProviderConfig('groq-stt').apiKey ?? ''}
			oninput={(e) => {
				const v = e.currentTarget.value;
				settingsStore.setProviderConfig('groq-stt', { apiKey: v });
				if (v) settingsStore.markProviderAdded('groq-stt');
				else settingsStore.removeProvider('groq-stt');
			}}
		/>
	</div>

	<span class="stt-sublabel">Clave de API de OpenAI (Whisper)</span>
	<div class="api-key-row">
		<input
			type="password"
			class="api-key-input"
			placeholder="Clave de API de OpenAI"
			value={settingsStore.getProviderConfig('openai-stt').apiKey ?? ''}
			oninput={(e) => {
				const v = e.currentTarget.value;
				settingsStore.setProviderConfig('openai-stt', { apiKey: v });
				if (v) settingsStore.markProviderAdded('openai-stt');
				else settingsStore.removeProvider('openai-stt');
			}}
		/>
	</div>

	<span class="stt-sublabel">Servidor local (Speaches, faster-whisper-server, whisper.cpp)</span>
	<div class="api-key-row">
		<input
			type="text"
			class="api-key-input"
			placeholder="http://localhost:8000/v1/"
			value={settingsStore.getProviderConfig('local-stt').baseUrl ?? ''}
			oninput={(e) => {
				const v = e.currentTarget.value.trim();
				settingsStore.setProviderConfig('local-stt', { baseUrl: v });
				if (v) settingsStore.markProviderAdded('local-stt');
				else settingsStore.removeProvider('local-stt');
			}}
		/>
	</div>
	<div class="api-key-row">
		<input
			type="text"
			class="api-key-input"
			placeholder="Modelo (p. ej. Systran/faster-whisper-large-v3)"
			value={settingsStore.getProviderConfig('local-stt').modelId ?? ''}
			oninput={(e) => {
				settingsStore.setProviderConfig('local-stt', { modelId: e.currentTarget.value.trim() });
			}}
		/>
	</div>
</div>

<style>
	.stt-hint {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		margin: 0;
		line-height: 1.4;
	}

	.stt-sublabel {
		display: block;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-secondary);
		margin-top: 0.25rem;
	}
</style>
