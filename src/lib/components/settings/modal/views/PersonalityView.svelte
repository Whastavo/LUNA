<script lang="ts">
	import { slideOpen } from '$lib/utils/motion';
	import { characterStore } from '$lib/stores/character.svelte';
	import { personaStore } from '$lib/stores/persona.svelte';
	import type { PersonalityProfile } from '$lib/types/character';
	import '../modal-kit.css';

	// Personalidad principal escribible (función original: describir sus
	// rasgos, estilo al hablar e historia en texto libre).
	let promptOpen = $state(false);
	let promptText = $state('');
	let promptSaved = $state(false);

	$effect(() => {
		promptText = characterStore.state.systemPrompt;
	});

	function savePrompt() {
		const current = characterStore.state.systemPrompt;
		if (promptText.trim() && promptText !== current) {
			personaStore.updateCard({ systemPrompt: promptText });
			promptSaved = true;
			setTimeout(() => (promptSaved = false), 1600);
		}
	}

	const personality = $derived(characterStore.state.personality);

	type StyleId = 'natural' | 'carinosa' | 'divertida' | 'tranquila' | 'directa';

	const STYLES: { id: StyleId; label: string; line: string; axes: Partial<PersonalityProfile> }[] = [
		{
			id: 'natural',
			label: 'Natural',
			line: 'Equilibrada, como una amiga de siempre.',
			axes: { warmth: 20, playfulness: 20, assertiveness: 0, openness: 20 }
		},
		{
			id: 'carinosa',
			label: 'Cariñosa',
			line: 'Atenta y afectuosa, siempre pendiente de ti.',
			axes: { warmth: 70, playfulness: 15, assertiveness: -20, sensitivity: 40 }
		},
		{
			id: 'divertida',
			label: 'Divertida',
			line: 'Bromista ligera, le gustan las risas.',
			axes: { playfulness: 75, warmth: 30, assertiveness: 20 }
		},
		{
			id: 'tranquila',
			label: 'Tranquila',
			line: 'Pausada y serena, sin prisa ni ruido.',
			axes: { warmth: 20, playfulness: -30, assertiveness: -30, sensitivity: 20 }
		},
		{
			id: 'directa',
			label: 'Directa',
			line: 'Al grano, clara, sin rodeos.',
			axes: { assertiveness: 70, warmth: 10, playfulness: -10, prefersDirectness: 80 }
		}
	];

	const activeStyle = $derived.by<StyleId>(() => {
		const p = personality;
		const match = STYLES.find(
			(s) =>
				(s.axes.warmth ?? 0) === p.warmth &&
				(s.axes.playfulness ?? 0) === p.playfulness &&
				(s.axes.assertiveness ?? 0) === p.assertiveness
		);
		return match?.id ?? 'natural';
	});

	function applyStyle(style: (typeof STYLES)[number]) {
		characterStore.updatePersona({});
		// Los ejes viven en state.personality; se actualizan vía save directo.
		const state = characterStore.state;
		state.personality = {
			...state.personality,
			...style.axes
		};
		characterStore.save();
	}

	function clampAxis(axis: keyof PersonalityProfile, value: number) {
		const state = characterStore.state;
		state.personality = { ...state.personality, [axis]: value };
		characterStore.save();
	}

	// Lecturas humanas de los ejes técnicos.
	const detailLevel = $derived(Math.round((personality.openness + 100) / 2));
	const expressiveness = $derived(Math.round((personality.playfulness + 100) / 2));
	const initiative = $derived(Math.round((personality.assertiveness + 100) / 2));
</script>

<div class="set-view">
	<header class="set-header">
		<h2>Personalidad</h2>
		<p>Cómo es Luna a tu lado y cómo se expresa contigo.</p>
	</header>

	<section class="set-section">
		<h3>Estilo</h3>
		<div class="styles">
			{#each STYLES as style (style.id)}
				<button
					class="style"
					class:active={activeStyle === style.id}
					type="button"
					onclick={() => applyStyle(style)}
				>
					<span class="style-name">{style.label}</span>
					<span class="style-line">{style.line}</span>
				</button>
			{/each}
		</div>
	</section>

	<hr class="set-divider" />

	<section class="set-section">
		<h3>Matices</h3>
		<div class="nuance">
			<span class="nuance-label">Nivel de detalle</span>
			<input
				class="set-slider"
				type="range"
				min="0"
				max="100"
				value={detailLevel}
				oninput={(e) => clampAxis('openness', Number(e.currentTarget.value) * 2 - 100)}
			/>
			<span class="set-slider-value">{detailLevel}%</span>
		</div>
		<div class="nuance">
			<span class="nuance-label">Expresividad</span>
			<input
				class="set-slider"
				type="range"
				min="0"
				max="100"
				value={expressiveness}
				oninput={(e) => clampAxis('playfulness', Number(e.currentTarget.value) * 2 - 100)}
			/>
			<span class="set-slider-value">{expressiveness}%</span>
		</div>
		<div class="nuance">
			<span class="nuance-label">Iniciativa</span>
			<input
				class="set-slider"
				type="range"
				min="0"
				max="100"
				value={initiative}
				oninput={(e) => clampAxis('assertiveness', Number(e.currentTarget.value) * 2 - 100)}
			/>
			<span class="set-slider-value">{initiative}%</span>
		</div>
		<p class="set-note">Los matices afinan el estilo elegido: ella adapta su tono con el tiempo.</p>
	</section>

	<hr class="set-divider" />

	<hr class="set-divider" />

	<!-- Personalidad principal (texto libre, como la página original) -->
	<section class="set-section">
		<button
			class="prompt-toggle"
			type="button"
			aria-expanded={promptOpen}
			onclick={() => (promptOpen = !promptOpen)}
		>
			Personalidad principal
			<span class="prompt-toggle-meta">
				{#if promptSaved}<em class="prompt-saved">Guardado</em>{/if}
				{promptOpen ? 'Ocultar' : 'Escribir'}
			</span>
		</button>
		{#if promptOpen}
			<div class="prompt-body" transition:slideOpen>
				<textarea
					class="prompt-textarea"
					bind:value={promptText}
					onblur={savePrompt}
					placeholder="Rasgos de personalidad, estilo al hablar, historia…"
					rows="7"
				></textarea>
				<p class="set-note">Se guarda al salir del campo. Define cómo piensa y habla Luna.</p>
			</div>
		{/if}
	</section>

	<hr class="set-divider" />

	<section class="set-section">
		<h3>Modo de relación</h3>
		<div class="modes">
			<button
				class="mode"
				class:active={characterStore.state.appMode === 'companion'}
				type="button"
				onclick={() => characterStore.setAppMode('companion')}
			>
				<span class="mode-name">Compañía diaria</span>
				<span class="mode-line">Ella contigo en el día a día, sin guion.</span>
			</button>
			<button
				class="mode"
				class:active={characterStore.state.appMode === 'dating_sim'}
				type="button"
				onclick={() => characterStore.setAppMode('dating_sim')}
			>
				<span class="mode-name">Modo historia</span>
				<span class="mode-line">Una historia con capítulos y momentos especiales.</span>
			</button>
		</div>
	</section>
</div>

<style>
	.styles {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.25rem 0;
	}

	.style {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: 0.5625rem 0.875rem;
		border: 1px solid rgba(255, 255, 255, 0.09);
		border-radius: 11px;
		background: transparent;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: border-color 0.14s ease, background 0.14s ease;
	}

	.style:hover {
		border-color: rgba(255, 255, 255, 0.22);
	}

	.style.active {
		border-color: rgba(255, 255, 255, 0.45);
		background: rgba(255, 255, 255, 0.06);
	}

	.style-name {
		font-size: 0.8438rem;
		font-weight: 590;
		color: rgba(255, 255, 255, 0.92);
	}

	.style-line {
		font-size: 0.7188rem;
		color: rgba(255, 255, 255, 0.42);
	}

	.nuance {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding: 0.4375rem 0;
	}


	.nuance-label {
		flex: 1;
		font-size: 0.8438rem;
		color: rgba(255, 255, 255, 0.78);
	}

	.prompt-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		width: 100%;
		padding: 0 0 0.5rem;
		border: none;
		background: transparent;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 640;
		color: var(--text-primary);
		text-align: left;
		cursor: pointer;
	}

	.prompt-toggle-meta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-tertiary);
	}

	.prompt-saved {
		font-style: normal;
		color: var(--color-success);
	}

	.prompt-textarea {
		width: 100%;
		padding: 0.75rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--text-primary);
		resize: vertical;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.prompt-textarea::placeholder {
		color: var(--text-tertiary);
	}

	.prompt-textarea:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-muted);
	}

	.modes {
		display: flex;
		flex-direction: column;
	}

	.mode {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: 0.6875rem 0.25rem;
		border: none;
		background: transparent;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: background 0.13s ease;
	}

	.mode:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.mode.active .mode-name {
		color: #fff;
	}

	.mode-name {
		font-size: 0.875rem;
		font-weight: 560;
		color: rgba(255, 255, 255, 0.7);
	}

	.mode-line {
		font-size: 0.7813rem;
		color: rgba(255, 255, 255, 0.42);
	}
</style>
