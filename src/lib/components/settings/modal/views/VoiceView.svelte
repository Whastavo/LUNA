<script lang="ts">
	import { modulesStore } from '$lib/stores/modules.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { getTTSProvider, getSTTProvider } from '$lib/services/providers/registry';
	import { ttsStore } from '$lib/stores/tts.svelte';
	import { displayStore } from '$lib/stores/display.svelte';
	import '../modal-kit.css';

	const speech = $derived(modulesStore.getModuleSettings('speech'));
	const voiceOn = $derived(modulesStore.isModuleEnabled('speech'));
	const speed = $derived(Number(speech.speed ?? 1));

	// Voz: nombres humanos desde el proveedor activo, sin exponer qué es.
	const provider = $derived(getTTSProvider(speech.activeProvider as string));
	const voiceOptions = $derived(provider?.voices ?? []);
	const currentVoiceName = $derived.by(() => {
		const id = speech.activeVoiceId as string;
		return voiceOptions.find((v) => v.id === id)?.name ?? (id ? 'Voz personalizada' : 'Voz por defecto');
	});

	// Micrófono: solo qué se usa para escuchar, no cómo está configurado.
	const sttActive = $derived.by(() => {
		if (settingsStore.isProviderAdded('local-stt')) return 'Servidor local';
		if (settingsStore.getProviderConfig('groq-stt').apiKey) return 'Nube rápida';
		if (settingsStore.getProviderConfig('openai-stt').apiKey) return 'Nube';
		return 'Micrófono del sistema';
	});
	const sttMeta = $derived(
		sttActive === 'Servidor local'
			? getSTTProvider('local-stt')
			: sttActive === 'Nube rápida'
				? getSTTProvider('groq-stt')
				: sttActive === 'Nube'
					? getSTTProvider('openai-stt')
					: undefined
	);

	function setSpeed(value: number) {
		modulesStore.setModuleSetting('speech', 'speed', value);
	}

	// Expresividad: el tool-calling de habla por segmento es su proxy real
	// (permite que el tono cambie con lo que dice).
	const expressiveOn = $derived(Boolean(speech.enableToolCalling ?? true));
	function toggleExpressive() {
		modulesStore.setModuleSetting('speech', 'enableToolCalling', !expressiveOn);
	}

	// Respuestas habladas automáticas: el módulo de voz entero.
	const autoSpeak = $derived(voiceOn);
	function toggleAutoSpeak() {
		modulesStore.setModuleEnabled('speech', !autoSpeak);
	}

	function previewVoice() {
		void ttsStore.speak('Hola, soy Luna. Así suena mi voz.', {
			provider: (speech.activeProvider || 'omnivoice') as never,
			voiceId: speech.activeVoiceId as string,
			model: speech.activeModel as string,
			speed: Number(speech.speed ?? 1),
			language: (speech.activeLanguage as string) || 'es'
		});
	}
</script>

<div class="set-view">
	<header class="set-header">
		<h2>Voz</h2>
		<p>Cómo suena Luna y cómo ella te escucha.</p>
	</header>

	<section class="set-section">
		<h3>Su voz</h3>
		<div class="active-voice">
			<span class="active-voice-name">{currentVoiceName}</span>
			<button class="set-btn set-btn--ghost" type="button" onclick={previewVoice}>Escuchar</button>
		</div>
		{#if voiceOptions.length > 0}
			<div class="voices">
				{#each voiceOptions.slice(0, 6) as voice (voice.id)}
					<button
						class="voice"
						class:active={speech.activeVoiceId === voice.id}
						type="button"
						onclick={() => modulesStore.setModuleSetting('speech', 'activeVoiceId', voice.id)}
					>
						{voice.name}
					</button>
				{/each}
			</div>
		{/if}
	</section>

	<hr class="set-divider" />

	<section class="set-section">
		<h3>Cómo habla</h3>
		<div class="line">
			<span class="line-label">Hablar sus respuestas</span>
			<span class="line-desc">Que te lea en voz alta cada vez que responde</span>
			<button
				class="set-switch"
				class:on={autoSpeak}
				type="button"
				role="switch"
				aria-checked={autoSpeak}
				aria-label="Hablar sus respuestas"
				onclick={toggleAutoSpeak}
			></button>
		</div>
		<div class="nuance">
			<span class="nuance-label">Velocidad</span>
			<input
				class="set-slider"
				type="range"
				min="0.5"
				max="2"
				step="0.05"
				value={speed}
				oninput={(e) => setSpeed(Number(e.currentTarget.value))}
			/>
			<span class="set-slider-value">{speed.toFixed(2)}×</span>
		</div>
		<div class="line">
			<span class="line-label">Expresividad</span>
			<span class="line-desc">Que su tono suba y baje con la conversación</span>
			<button
				class="set-switch"
				class:on={expressiveOn}
				type="button"
				role="switch"
				aria-checked={expressiveOn}
				aria-label="Expresividad"
				onclick={toggleExpressive}
			></button>
		</div>
	</section>

	<hr class="set-divider" />

	<section class="set-section">
		<h3>Cómo escucha</h3>
		<div class="line">
			<span class="line-label">Micrófono</span>
			<span class="line-desc">{sttMeta ? 'Listo para usar' : 'Usa el reconocedor del navegador'}</span>
			<span class="line-value">{sttActive}</span>
		</div>
	</section>
</div>

<style>
	.active-voice {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 0.25rem;
	}

	.active-voice-name {
		font-size: 0.9375rem;
		font-weight: 590;
		color: #fff;
	}

	.line {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 0.25rem;
	}


	.line-label {
		flex-shrink: 0;
		min-width: 10rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.88);
	}

	.line-desc {
		flex: 1;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.line-value {
		font-size: 0.7813rem;
		color: rgba(255, 255, 255, 0.45);
		white-space: nowrap;
	}

	.voices {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4375rem;
		padding: 0.25rem 0;
	}

	.voice {
		padding: 0.4375rem 0.8125rem;
		border: 1px solid rgba(255, 255, 255, 0.09);
		border-radius: 999px;
		background: transparent;
		font-size: 0.7813rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.65);
		cursor: pointer;
		transition: border-color 0.14s ease, color 0.14s ease, background 0.14s ease;
	}

	.voice:hover {
		border-color: rgba(255, 255, 255, 0.24);
		color: rgba(255, 255, 255, 0.9);
	}

	.voice.active {
		border-color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.07);
		color: #fff;
	}

	.nuance {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding: 0.4375rem 0;
	}
</style>
