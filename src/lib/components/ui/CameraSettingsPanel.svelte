<script lang="ts">
	import { Icon } from '$lib/components/ui';
	import {
		displayStore,
		CAMERA_DEFAULTS,
		CAMERA_LIMITS,
		type CameraProfile
	} from '$lib/stores/display.svelte';
	import {
		PHYSICS_INTENSITY_MIN,
		PHYSICS_INTENSITY_MAX,
		PHYSICS_INTENSITY_DEFAULT
	} from '$lib/engine/spring-physics';
	import { BACKGROUND_PRESETS, presetSwatch } from '$lib/services/scene-backgrounds';

	// Transparent is a photo-capture concept; the scene picker skips it
	const SCENE_PRESETS = BACKGROUND_PRESETS.filter((p) => !p.photoOnly);

	interface Props {
		onclose: () => void;
		profile?: CameraProfile;
	}

	let { onclose, profile = 'main' }: Props = $props();

	const cam = $derived(profile === 'overlay' ? displayStore.overlayCamera : displayStore.camera);
	const isDefault = $derived(
		cam.fov === CAMERA_DEFAULTS.fov &&
			cam.zoom === CAMERA_DEFAULTS.zoom &&
			cam.height === CAMERA_DEFAULTS.height &&
			(cam.panX ?? 0) === CAMERA_DEFAULTS.panX
	);
</script>

<div class="camera-panel glass-panel" role="dialog" aria-label="Ajustes de cámara">
	<div class="panel-header">
		<span class="panel-title">Cámara</span>
		<button class="panel-close" onclick={onclose} aria-label="Cerrar ajustes de cámara">
			<Icon name="x" size={14} />
		</button>
	</div>

	<label class="control">
		<span class="control-label">
			Zoom
			<span class="control-value">{cam.zoom.toFixed(2)}×</span>
		</span>
		<input
			type="range"
			min={CAMERA_LIMITS.zoom.min}
			max={CAMERA_LIMITS.zoom.max}
			step="0.05"
			value={cam.zoom}
			oninput={(e) => displayStore.setCamera({ zoom: parseFloat(e.currentTarget.value) }, profile)}
		/>
	</label>

	<label class="control">
		<span class="control-label">
			Altura
			<span class="control-value">{cam.height > 0 ? '+' : ''}{(cam.height * 100).toFixed(0)} cm</span>
		</span>
		<input
			type="range"
			min={CAMERA_LIMITS.height.min}
			max={CAMERA_LIMITS.height.max}
			step="0.01"
			value={cam.height}
			oninput={(e) => displayStore.setCamera({ height: parseFloat(e.currentTarget.value) }, profile)}
		/>
	</label>

	<label class="control">
		<span class="control-label">
			Desplazamiento lateral
			<span class="control-value">{cam.panX > 0 ? '+' : ''}{(cam.panX * 100).toFixed(0)} cm</span>
		</span>
		<input
			type="range"
			min={CAMERA_LIMITS.panX.min}
			max={CAMERA_LIMITS.panX.max}
			step="0.01"
			value={cam.panX ?? 0}
			oninput={(e) => displayStore.setCamera({ panX: parseFloat(e.currentTarget.value) }, profile)}
		/>
	</label>

	<label class="control">
		<span class="control-label">
			Campo de visión
			<span class="control-value">{cam.fov.toFixed(0)}°</span>
		</span>
		<input
			type="range"
			min={CAMERA_LIMITS.fov.min}
			max={CAMERA_LIMITS.fov.max}
			step="1"
			value={cam.fov}
			oninput={(e) => displayStore.setCamera({ fov: parseFloat(e.currentTarget.value) }, profile)}
		/>
	</label>

	<button class="reset-btn" onclick={() => displayStore.resetCamera(profile)} disabled={isDefault}>
		Restablecer cámara
	</button>

	{#if profile === 'main'}
		<div class="section-divider">
			<span class="section-label">Fondo</span>
		</div>

		<div class="swatch-row">
			{#each SCENE_PRESETS as preset (preset.id)}
				<button
					class="swatch"
					class:selected={displayStore.sceneBackground.type === preset.bg.type &&
						displayStore.sceneBackground.value === preset.bg.value}
					style:background={presetSwatch(preset)}
					title={preset.label}
					aria-label={`Background: ${preset.label}`}
					onclick={() => displayStore.setSceneBackground(preset.bg)}
				></button>
			{/each}
		</div>
	{/if}

	<div class="section-divider">
		<span class="section-label">Física</span>
	</div>

	<label class="control">
		<span class="control-label">
			Intensidad de movimiento
			<span class="control-value">
				{displayStore.physicsIntensity === PHYSICS_INTENSITY_DEFAULT
					? 'Predeterminada'
					: `${displayStore.physicsIntensity.toFixed(2)}x`}
			</span>
		</span>
		<input
			type="range"
			min={PHYSICS_INTENSITY_MIN}
			max={PHYSICS_INTENSITY_MAX}
			step="0.05"
			value={displayStore.physicsIntensity}
			oninput={(e) => displayStore.setPhysicsIntensity(parseFloat(e.currentTarget.value))}
		/>
		<span class="range-ends" aria-hidden="true">
			<span>Sutil</span>
			<span>Vivo</span>
		</span>
	</label>
</div>

<style>
	.camera-panel {
		width: 240px;
		padding: 1rem;
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		animation: panelIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes panelIn {
		from {
			opacity: 0;
			transform: translateY(-6px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.panel-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.panel-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		border-radius: var(--radius-full);
		background: transparent;
		color: var(--text-tertiary);
		cursor: pointer;
		transition: color 0.15s ease, background 0.15s ease;
	}

	.panel-close:hover {
		color: var(--text-primary);
		background: var(--chrome-wash);
	}

	.control {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.control-label {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.control-value {
		color: var(--text-tertiary);
		font-variant-numeric: tabular-nums;
	}

	.control input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 4px;
		border-radius: 2px;
		/* La LÍNEA del slider: un valor literal, no var() — el track es
		   pintado por el engine y un token inválido lo deja invisible. */
		background: rgba(255, 255, 255, 0.28);
		box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.18);
		outline: none;
		cursor: pointer;
	}

	/* Track visible también en Firefox (::-moz-range-track), que no
	   hereda el background del input. */
	.control input[type='range']::-moz-range-track {
		height: 4px;
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.28);
	}

	.control input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		/* White thumb on glass — the slider knob is light, never ink */
		background: rgba(255, 255, 255, 0.92);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
		border: none;
		cursor: pointer;
		transition: transform 0.15s ease;
	}

	.control input[type='range']::-webkit-slider-thumb:hover {
		transform: scale(1.15);
	}

	.control input[type='range']::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.92);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
		border: none;
		cursor: pointer;
	}

	.reset-btn {
		margin-top: 0.125rem;
		padding: 0.5rem;
		border: none;
		border-radius: var(--radius-md);
		background: var(--chrome-wash);
		color: var(--text-secondary);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: color 0.15s ease, background 0.15s ease;
	}

	.reset-btn:hover:not(:disabled) {
		color: var(--text-primary);
		background: var(--chrome-wash-strong);
	}

	.reset-btn:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.section-divider {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.125rem;
	}

	.section-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--chrome-border);
	}

	.section-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-tertiary);
	}

	.range-ends {
		display: flex;
		justify-content: space-between;
		font-size: 0.6875rem;
		color: var(--text-tertiary);
	}

	.swatch-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.swatch {
		width: 24px;
		height: 24px;
		border-radius: var(--radius-full);
		/* White ring that reads on glass — never a dark halo */
		border: 2px solid rgba(255, 255, 255, 0.28);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
		cursor: pointer;
		transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.swatch:hover {
		transform: scale(1.1);
	}

	.swatch.selected {
		border-color: rgba(255, 255, 255, 0.85);
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.2),
			0 1px 4px rgba(0, 0, 0, 0.18);
	}
</style>
