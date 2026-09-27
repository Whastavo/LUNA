<script lang="ts">
	import { Icon } from '$lib/components/ui';
	import {
		photomodeStore,
		PHOTO_FILTERS,
		type PhotoBackground,
		type PhotoFilterId,
		type PhotoFrameId
	} from '$lib/stores/photomode.svelte';
	import { displayStore, CAMERA_LIMITS } from '$lib/stores/display.svelte';
	import { vrmStore } from '$lib/stores/vrm.svelte';
	import { loadPoseManifest, type PoseEntry } from '$lib/services/poses';
	import { keepImage } from '$lib/services/storage/keepsakes';
	import { saveToDownloads } from '$lib/utils/save-to-downloads';
	import { BACKGROUND_PRESETS, presetSwatch } from '$lib/services/scene-backgrounds';
	import { expressionLabel } from '$lib/services/expressions';

	type Tab = 'pose' | 'face' | 'scene' | 'camera' | 'sticker';
	const TABS: Array<{ id: Tab; label: string }> = [
		{ id: 'camera', label: 'Cámara' },
		{ id: 'pose', label: 'Pose' },
		{ id: 'face', label: 'Cara' },
		{ id: 'scene', label: 'Escena' },
		{ id: 'sticker', label: 'Pegatina' }
	];

	let tab = $state<Tab>('camera');
	let collapsed = $state(false);
	let poses = $state<PoseEntry[]>([]);
	let capturing = $state(false);
	let flash = $state(false);
	let savedTick = $state(false);
	let timerOn = $state(false);
	let countdown = $state(0);

	const HIDDEN_EXPRESSIONS = new Set([
		'aa', 'ih', 'ou', 'ee', 'oh',
		'blink', 'blinkLeft', 'blinkRight',
		'lookUp', 'lookDown', 'lookLeft', 'lookRight',
		'neutral'
	]);
	const expressions = $derived(
		(vrmStore.availableExpressions ?? []).filter((name) => !HIDDEN_EXPRESSIONS.has(name))
	);

	// Shared preset library; 'default' means "the scene as it is", which in
	// photo terms is the room. Patterns and pastels included.
	const BACKGROUNDS = BACKGROUND_PRESETS.map((preset) => ({
		id: preset.id,
		label: preset.id === 'default' ? 'Habitación' : preset.label,
		bg: (preset.bg.type === 'default' ? { type: 'room' } : preset.bg) as PhotoBackground,
		swatch: presetSwatch(preset)
	}));

	const FRAMES: Array<{ id: PhotoFrameId; label: string }> = [
		{ id: 'none', label: 'Ninguno' },
		{ id: 'polaroid', label: 'Polaroid' },
		{ id: 'film', label: 'Película' }
	];

	const FILTER_IDS = Object.keys(PHOTO_FILTERS) as PhotoFilterId[];

	const STICKERS: Array<{ id: string; label: string; src: string }> = [
		{ id: 'luna-logo', label: 'Logo de Luna', src: '/brand-assets/logo.svg' }
	];

	const activeBackgroundId = $derived(
		BACKGROUNDS.find(
			(b) =>
				b.bg.type === photomodeStore.background.type &&
				b.bg.value === photomodeStore.background.value
		)?.id ?? 'custom'
	);

	$effect(() => {
		let cancelled = false;
		loadPoseManifest().then((entries) => {
			if (!cancelled) poses = entries;
		});
		return () => {
			cancelled = true;
		};
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') photomodeStore.exit();
	}

	function resetFraming() {
		// Clear the session lens and re-fit; the user's saved camera profile is
		// never touched from photo mode
		photomodeStore.setPhotoFov(null);
		photomodeStore.requestReframe();
	}

	async function takePhoto(scale: number) {
		if (capturing) return;
		capturing = true;
		try {
			if (timerOn) {
				for (countdown = 3; countdown > 0; countdown--) {
					// Exiting photo mode during the countdown cancels the capture
					if (!photomodeStore.active) return;
					await new Promise((r) => setTimeout(r, 1000));
				}
			}
			if (!photomodeStore.active) return;
			const blob = await photomodeStore.capture(scale);
			if (!blob || !photomodeStore.active) return;

			flash = true;
			setTimeout(() => (flash = false), 220);

			await keepImage(crypto.randomUUID(), blob, {
				mimeType: 'image/png',
				note: 'Modo foto',
				kind: 'photo'
			});

			// Both platforms put the file where users expect downloads to land:
			// the browser via a download, the desktop app by writing directly to
			// the Downloads folder. The keepsake-store copy is kept either way.
			const filename = `luna-photo-${Date.now()}.png`;
			try {
				await saveToDownloads(filename, blob);
			} catch (e) {
				console.error('[PhotoMode] Could not write to Downloads:', e);
			}

			savedTick = true;
			setTimeout(() => (savedTick = false), 1600);
		} catch (e) {
			console.error('[PhotoMode] Capture failed:', e);
		} finally {
			countdown = 0;
			capturing = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if flash}
	<div class="shutter-flash" aria-hidden="true"></div>
{/if}

{#if countdown > 0}
	<div class="countdown" aria-hidden="true">{countdown}</div>
{/if}

{#if collapsed}
	<button class="panel-pill glass-chip" onclick={() => (collapsed = false)} aria-label="Abrir controles de foto">
		<Icon name="camera" size={16} />
	</button>
{:else}
	<div class="photo-panel glass-panel" role="toolbar" aria-label="Modo foto">
		<div class="panel-header">
			<span class="panel-title">Modo foto</span>
			{#if savedTick}
				<span class="saved-tick">Guardada</span>
			{/if}
			<button class="header-btn" onclick={() => (collapsed = true)} aria-label="Contraer panel">
				<Icon name="chevron-up" size={14} />
			</button>
			<button class="header-btn" onclick={() => photomodeStore.exit()} aria-label="Salir del modo foto">
				<Icon name="x" size={14} />
			</button>
		</div>

		<div class="tab-strip" role="tablist">
			{#each TABS as t (t.id)}
				<button
					class="tab"
					class:active={tab === t.id}
					role="tab"
					aria-selected={tab === t.id}
					onclick={() => (tab = t.id)}
				>
					{t.label}
				</button>
			{/each}
		</div>

		<div class="tab-content">
			{#if tab === 'pose'}
				<div class="chip-wrap">
					<button
						class="chip"
						class:selected={photomodeStore.selectedPoseId === null}
						onclick={() => photomodeStore.setPose(null)}
					>
						Natural
					</button>
					{#each poses as pose (pose.id)}
						<button
							class="chip"
							class:selected={photomodeStore.selectedPoseId === pose.id}
							onclick={() => photomodeStore.setPose(pose.id)}
						>
							{pose.name}
						</button>
					{/each}
				</div>
			{:else if tab === 'face'}
				<div class="chip-wrap">
					<button
						class="chip"
						class:selected={photomodeStore.selectedExpression === null}
						onclick={() => photomodeStore.setExpression(null)}						>
							Ánimo
						</button>
					{#each expressions as name (name)}
						<button
							class="chip chip-cap"
							class:selected={photomodeStore.selectedExpression === name}
							onclick={() => photomodeStore.setExpression(name)}
						>
							{expressionLabel(name)}
						</button>
					{/each}
				</div>
			{:else if tab === 'scene'}
				<span class="mini-label">Fondo</span>
				<div class="chip-wrap">
					{#each BACKGROUNDS as bg (bg.id)}
						<button
							class="swatch"
							class:selected={activeBackgroundId === bg.id}
							style:background={bg.swatch}
							title={bg.label}
							aria-label={`Fondo: ${bg.label}`}
							onclick={() => photomodeStore.setBackground(bg.bg)}
						></button>
					{/each}
				</div>
				<span class="mini-label">Filtro</span>
				<div class="chip-wrap">
					{#each FILTER_IDS as id (id)}
						<button
							class="chip"
							class:selected={photomodeStore.filterId === id}
							onclick={() => photomodeStore.setFilter(id)}
						>
							{PHOTO_FILTERS[id].label}
						</button>
					{/each}
				</div>
				<span class="mini-label">Marco</span>
				<div class="chip-wrap">
					{#each FRAMES as frame (frame.id)}
						<button
							class="chip"
							class:selected={photomodeStore.frameId === frame.id}
							onclick={() => photomodeStore.setFrame(frame.id)}
						>
							{frame.label}
						</button>
					{/each}
				</div>
				<label class="toggle-row">
					<span>Viñeta</span>
					<input
						class="switch-input"
						type="checkbox"
						checked={photomodeStore.vignette}
						onchange={(e) => photomodeStore.setVignette(e.currentTarget.checked)}
					/>
					<span class="switch" aria-hidden="true"><span class="switch-thumb"></span></span>
				</label>
			{:else if tab === 'camera'}
				<span class="mini-label">
					Lente
					<span class="mini-value">{(photomodeStore.photoFov ?? displayStore.camera.fov).toFixed(0)} °</span>
				</span>
				<input
					class="slider"
					type="range"
					min={CAMERA_LIMITS.fov.min}
					max={CAMERA_LIMITS.fov.max}
					step="1"
					value={photomodeStore.photoFov ?? displayStore.camera.fov}
					oninput={(e) => photomodeStore.setPhotoFov(parseFloat(e.currentTarget.value))}
					aria-label="Campo de visión"
				/>
				<label class="toggle-row">
					<span>Mirar a la cámara</span>
					<input
						class="switch-input"
						type="checkbox"
						checked={photomodeStore.headTracking}
						onchange={(e) => photomodeStore.setHeadTracking(e.currentTarget.checked)}
					/>
					<span class="switch" aria-hidden="true"><span class="switch-thumb"></span></span>
				</label>
				<label class="toggle-row">
					<span>Cuadrícula de tercios</span>
					<input
						class="switch-input"
						type="checkbox"
						checked={photomodeStore.showGrid}
						onchange={(e) => photomodeStore.setGrid(e.currentTarget.checked)}
					/>
					<span class="switch" aria-hidden="true"><span class="switch-thumb"></span></span>
				</label>
				<button class="panel-btn" onclick={resetFraming}>Restablecer encuadre</button>
			{:else if tab === 'sticker'}
				<div class="chip-wrap">
					{#each STICKERS as sticker (sticker.id)}
						<button class="chip" onclick={() => photomodeStore.addSticker(sticker.src)}>
							{sticker.label}
						</button>
					{/each}
				</div>
				{#if photomodeStore.stickers.length > 0}
					<span class="mini-label">En la toma</span>
					{#each photomodeStore.stickers as active, i (active.id)}
						<div class="sticker-row">
							<img class="sticker-thumb" src={active.src} alt="" />
							<span class="sticker-name">Pegatina {i + 1}</span>
							<button
								class="header-btn"
								aria-label="Quitar pegatina"
								onclick={() => photomodeStore.removeSticker(active.id)}
							>
								<Icon name="x" size={13} />
							</button>
						</div>
					{/each}
					<span class="hint">Arrastra para mover. Rueda para redimensionar. Doble clic también quita.</span>
				{:else}
					<span class="hint">Añade una pegatina y arrástrala a cualquier parte de la toma.</span>
				{/if}
			{/if}
		</div>

		<div class="capture-row">
			<button
				class="panel-btn timer"
				class:selected={timerOn}
				onclick={() => (timerOn = !timerOn)}
				title="Temporizador de 3 segundos"
			>
				3s
			</button>
			<button class="panel-btn" onclick={() => takePhoto(1)} disabled={capturing}>Foto</button>
			<button class="panel-btn primary" onclick={() => takePhoto(2)} disabled={capturing}>
				<Icon name="camera" size={14} />
				{capturing ? (countdown > 0 ? String(countdown) : '...') : 'Capturar'}
			</button>
		</div>
	</div>
{/if}

<style>
	.shutter-flash {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: white;
		pointer-events: none;
		animation: flashOut 0.22s ease-out both;
	}

	@keyframes flashOut {
		from {
			opacity: 0.9;
		}
		to {
			opacity: 0;
		}
	}

	.countdown {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 55;
		font-size: 6rem;
		font-weight: 700;
		color: white;
		text-shadow: 0 2px 24px rgba(0, 0, 0, 0.45);
		pointer-events: none;
		animation: countPop 1s ease-out infinite;
	}

	@keyframes countPop {
		from {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
		to {
			opacity: 0.2;
			transform: translate(-50%, -50%) scale(1.25);
		}
	}

	.panel-pill {
		position: fixed;
		top: 1rem;
		left: 1rem;
		z-index: 45;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-full);
		color: var(--text-secondary);
		cursor: pointer;
	}

	.panel-pill:hover {
		color: var(--text-primary);
	}

	.photo-panel {
		position: fixed;
		top: 1rem;
		left: 1rem;
		z-index: 45;
		width: 272px;
		max-height: calc(100vh - 2rem);
		padding: 0.75rem;
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		animation: panelIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes panelIn {
		from {
			opacity: 0;
			transform: translateY(-6px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.panel-header {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.panel-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-right: auto;
	}

	.saved-tick {
		font-size: 0.6875rem;
		color: var(--color-success);
	}

	.header-btn {
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

	.header-btn:hover {
		color: var(--text-primary);
		background: var(--chrome-wash);
	}

	.tab-strip {
		display: flex;
		gap: 0.125rem;
		padding: 0.125rem;
		background: var(--chrome-wash);
		border-radius: var(--radius-md);
	}

	.tab {
		flex: 1;
		padding: 0.3rem 0;
		border: none;
		border-radius: calc(var(--radius-md) - 2px);
		background: transparent;
		color: var(--text-tertiary);
		font-size: 0.66rem;
		font-weight: 600;
		cursor: pointer;
		transition: color 0.15s ease, background 0.15s ease;
	}

	.tab:hover {
		color: var(--text-primary);
	}

	.tab.active {
		background: var(--chrome-wash-strong);
		color: var(--chrome-text);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
	}

	.tab-content {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		overflow-y: auto;
		min-height: 96px;
	}

	.mini-label {
		display: flex;
		justify-content: space-between;
		font-size: 0.66rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-tertiary);
	}

	.mini-value {
		font-variant-numeric: tabular-nums;
		text-transform: none;
	}

	.chip-wrap {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.chip {
		padding: 0.28rem 0.6rem;
		border-radius: var(--radius-full);
		background: var(--chrome-wash);
		color: var(--text-secondary);
		font-size: 0.7rem;
		font-weight: 500;
		cursor: pointer;
		transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
	}

	.chip-cap {
		text-transform: capitalize;
	}

	.chip:hover {
		color: var(--text-primary);
	}

	.chip.selected {
		background: var(--chrome-wash-strong);
		color: var(--chrome-text);
	}

	.swatch {
		width: 26px;
		height: 26px;
		border-radius: var(--radius-full);
		border: 2px solid rgba(255, 255, 255, 0.28);
		cursor: pointer;
		transition: transform 0.15s ease, border-color 0.15s ease;
	}

	.swatch:hover {
		transform: scale(1.08);
	}

	.swatch.selected {
		border-color: var(--accent);
	}

	.slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 4px;
		border-radius: 2px;
		background: var(--chrome-wash-strong);
		outline: none;
		cursor: pointer;
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 15px;
		height: 15px;
		border-radius: 50%;
		/* White thumb on glass — the knob is light, never ink (matches CameraSettingsPanel) */
		background: rgba(255, 255, 255, 0.92);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
		border: none;
		cursor: pointer;
	}

	.slider::-moz-range-thumb {
		width: 15px;
		height: 15px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.92);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
		border: none;
		cursor: pointer;
	}

	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.75rem;
		color: var(--text-secondary);
		cursor: pointer;
	}

	/* Pill switch in the same style as the settings service toggles */
	.switch-input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
		pointer-events: none;
	}

	.switch {
		position: relative;
		width: 34px;
		height: 20px;
		border-radius: var(--radius-full);
		background: var(--chrome-wash-strong);
		transition: background 0.18s ease, border-color 0.18s ease;
		flex-shrink: 0;
	}

	.switch-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 14px;
		height: 14px;
		border-radius: var(--radius-full);
		background: var(--text-tertiary);
		box-shadow: var(--shadow-xs);
		transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), background 0.18s ease;
	}

	.switch-input:checked + .switch {
		background: var(--chrome-surface-active);
		border-color: var(--chrome-border);
	}

	.switch-input:checked + .switch .switch-thumb {
		background: white;
		transform: translateX(14px);
	}

	.switch-input:focus-visible + .switch {
		outline: 2px solid var(--chrome-text-dim);
		outline-offset: 2px;
	}

	.hint {
		font-size: 0.66rem;
		color: var(--text-tertiary);
		line-height: 1.4;
	}

	.sticker-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.375rem;
		border-radius: var(--radius-md);
		background: var(--chrome-wash);
	}

	.sticker-thumb {
		width: 34px;
		height: 18px;
		object-fit: contain;
	}

	.sticker-name {
		flex: 1;
		font-size: 0.7rem;
		color: var(--text-secondary);
	}

	.capture-row {
		display: flex;
		gap: 0.375rem;
	}

	.panel-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		padding: 0.45rem 0.5rem;
		border: none;
		border-radius: var(--radius-md);
		background: var(--chrome-wash);
		color: var(--text-secondary);
		font-size: 0.72rem;
		font-weight: 500;
		cursor: pointer;
		transition: color 0.15s ease, background 0.15s ease;
	}

	.panel-btn:hover:not(:disabled) {
		color: var(--text-primary);
	}

	.panel-btn.timer {
		flex: 0 0 40px;
	}

	.panel-btn.selected {
		background: var(--accent);
		color: var(--accent-contrast, #fff);
	}

	.panel-btn.primary {
		/* Primary action inside glass = brighter glass, never solid white */
		background: var(--chrome-wash-strong);
		color: var(--chrome-text);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
		flex: 1.4;
	}

	.panel-btn.primary:hover:not(:disabled) {
		background: var(--chrome-wash);
	}

	.panel-btn:disabled {
		opacity: 0.55;
		cursor: default;
	}
</style>
