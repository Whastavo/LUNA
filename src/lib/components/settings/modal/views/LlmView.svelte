<script lang="ts">
	import { getLLMProvider } from '$lib/services/providers/registry';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { createLlmSettingsState } from '$lib/stores/ai-services-settings.svelte';
	import { createFetchSignature } from '$lib/stores/ai-services-settings-logic';
	import LlmSettings from '$lib/components/settings/LlmSettings.svelte';
	import '../modal-kit.css';

	const state = createLlmSettingsState();

	// Fetch local LLM models automatically when the endpoint changes.
	$effect(() => {
		const providerId = state.consciousnessSettings.activeProvider as string;
		const provider = providerId ? getLLMProvider(providerId) : null;
		if (!provider?.isLocal) {
			state.lastLocalLLMFetchKey = '';
			return;
		}

		const baseUrl = settingsStore.getProviderConfig(provider.id).baseUrl ?? provider.defaultBaseUrl ?? '';
		const fetchKey = createFetchSignature(provider.id, baseUrl);

		if (fetchKey !== state.lastLocalLLMFetchKey) {
			state.lastLocalLLMFetchKey = fetchKey;
			state.debouncedFetchLLMModels();
		}
	});
</script>

<div class="set-view">
	<header class="set-header">
		<h2>Modelo LLM</h2>
		<p>El cerebro que piensa las respuestas de Luna: proveedor, modelo y parámetros.</p>
	</header>

	<div class="embed">
		<LlmSettings {state} />
	</div>
</div>

<style>
	.embed :global(.section) {
		background: transparent;
		border: none;
		box-shadow: none;
		padding: 0;
	}
</style>
