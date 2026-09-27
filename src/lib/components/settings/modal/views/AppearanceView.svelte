<script lang="ts">
	import { displayStore } from '$lib/stores/display.svelte';
	import { colorModeStore } from '$lib/stores/colormode.svelte';
	import { BACKGROUND_PRESETS, presetSwatch } from '$lib/services/scene-backgrounds';
	import { settingsModal } from '$lib/stores/settings-modal.svelte';
	import { applyScreenWakeLock, onWakeStatus, getWakeStatus } from '$lib/services/platform/wake-lock';
	import type { ColorMode } from '$lib/utils/color-mode';
	import '../modal-kit.css';

	const theme = $derived(colorModeStore.mode);
	const scenePresets = $derived(BACKGROUND_PRESETS.filter((p) => !p.photoOnly));

	function setTheme(mode: ColorMode) {
		colorModeStore.set(mode);
	}

	let transparency = $state(75);
	let animations = $state(true);
	let wakeStatus = $state(getWakeStatus());
	$effect(() => onWakeStatus((s) => (wakeStatus = s)));

	function toggleWakeLock() {
		displayStore.setScreenWakeLock(!displayStore.screenWakeLock);
		void applyScreenWakeLock(displayStore.screenWakeLock).then(() => {
			wakeStatus = getWakeStatus();
		});
	}
</script>

<div class="set-view">
	<header class="set-header">
		<h2>Apariencia</h2>
		<p>El look de la app y el ambiente de su habitación.</p>
	</header>

	<section class="set-section">
		<h3>Tema</h3>
		<div class="themes">
			<button class="theme" class:active={theme === 'system'} type="button" onclick={() => setTheme('system')}>
				<span class="theme-swatch theme-swatch--system" aria-hidden="true"></span>
				Sistema
			</button>
			<button class="theme" class:active={theme === 'light'} type="button" onclick={() => setTheme('light')}>
				<span class="theme-swatch theme-swatch--light" aria-hidden="true"></span>
				Claro
			</button>
			<button class="theme" class:active={theme === 'dark'} type="button" onclick={() => setTheme('dark')}>
				<span class="theme-swatch theme-swatch--dark" aria-hidden="true"></span>
				Oscuro
			</button>
		</div>
	</section>

	<hr class="set-divider" />

	<section class="set-section">
		<h3>Escenario</h3>
		<p class="section-lead">El fondo de la escena donde vive Luna.</p>
		<div class="scenes">
			{#each scenePresets as preset (preset.id)}
				<button
					class="scene"
					class:active={displayStore.sceneBackground.value === preset.bg.value}
					type="button"
					onclick={() => displayStore.setSceneBackground(preset.bg)}
					aria-label="Fondo {preset.label}"
				>
					<span class="scene-swatch" style={`background: ${presetSwatch(preset)}`} aria-hidden="true"></span>
					<span class="scene-name">{preset.label}</span>
				</button>
			{/each}
		</div>
		<button class="set-btn set-btn--ghost more-scenes" type="button" onclick={() => settingsModal.hide()}>
			La galería completa vive en el modo foto
		</button>
	</section>

	<hr class="set-divider" />

	<section class="set-section">
		<h3>Textura de la interfaz</h3>
		<div class="nuance">
			<span class="nuance-label">Transparencia de paneles</span>
			<input
				class="set-slider"
				type="range"
				min="40"
				max="100"
				bind:value={transparency}
			/>
			<span class="set-slider-value">{transparency}%</span>
		</div>
		<div class="nuance">
			<span class="nuance-label">Animaciones</span>
			<button
				class="set-switch"
				class:on={animations}
				type="button"
				role="switch"
				aria-checked={animations}
				aria-label="Animaciones"
				onclick={() => (animations = !animations)}
			></button>
		</div>
		<div class="nuance">
			<span class="nuance-label">Pantalla siempre encendida</span>
			<button
				class="set-switch"
				class:on={displayStore.screenWakeLock}
				type="button"
				role="switch"
				aria-checked={displayStore.screenWakeLock}
				aria-label="Pantalla siempre encendida"
				onclick={toggleWakeLock}
			></button>
		</div>
	{#if displayStore.screenWakeLock && (wakeStatus === 'unsupported' || wakeStatus === 'requesting')}
		<p class="set-note" style="margin-top: -0.25rem">
			{wakeStatus === 'requesting' ? 'Activando…' : 'Este navegador no soporta mantener la pantalla encendida.'}
		</p>
	{/if}
		<p class="set-note">Con menos transparencia los paneles se ven más sólidos; con animaciones apagadas todo aparece al instante.</p>
	</section>
</div>

<style>
	.themes {
		display: flex;
		gap: 0.625rem;
		padding: 0.25rem 0;
	}

	.theme {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4375rem;
		padding: 0.625rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.09);
		border-radius: 11px;
		background: transparent;
		font-size: 0.7813rem;
		font-weight: 540;
		color: rgba(255, 255, 255, 0.65);
		cursor: pointer;
		transition: border-color 0.14s ease, color 0.14s ease;
	}

	.theme:hover {
		border-color: rgba(255, 255, 255, 0.24);
		color: rgba(255, 255, 255, 0.9);
	}

	.theme.active {
		border-color: rgba(255, 255, 255, 0.5);
		color: #fff;
	}

	.theme-swatch {
		width: 34px;
		height: 22px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.theme-swatch--system {
		background: linear-gradient(90deg, #2a2a2e 50%, #f5f5f7 50%);
	}

	.theme-swatch--light {
		background: #f5f5f7;
	}

	.theme-swatch--dark {
		background: #131316;
	}

	.scenes {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 0.5rem;
		padding: 0.375rem 0 0.625rem;
	}

	.scene {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3125rem;
		padding: 0.4375rem;
		border: 1px solid transparent;
		border-radius: 10px;
		background: transparent;
		font: inherit;
		cursor: pointer;
		transition: border-color 0.14s ease, background 0.14s ease;
	}

	.scene:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.scene.active {
		border-color: rgba(255, 255, 255, 0.42);
	}

	.scene-swatch {
		width: 100%;
		aspect-ratio: 1;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background-size: cover;
		background-position: center;
	}

	.scene-name {
		font-size: 0.6563rem;
		color: rgba(255, 255, 255, 0.5);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.more-scenes {
		align-self: flex-start;
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

	@media (max-width: 767px) {
		.scenes {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
</style>
