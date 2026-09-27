<script lang="ts">
	import { createTtsSettingsState } from '$lib/stores/ai-services-settings.svelte';
	import TtsSettings from '$lib/components/settings/TtsSettings.svelte';
	import '../modal-kit.css';

	const state = createTtsSettingsState();
</script>

<div class="set-view">
	<header class="set-header">
		<h2>Voz (TTS)</h2>
		<p>El motor que da voz a Luna: proveedor y ajustes de habla.</p>
	</header>

	<div class="embed">
		<TtsSettings {state} />
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
