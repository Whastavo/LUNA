<script lang="ts">
	import { displayStore } from '$lib/stores/display.svelte';
	import { modulesStore } from '$lib/stores/modules.svelte';
	import { characterStore } from '$lib/stores/character.svelte';
	import { exportSave, downloadSaveFile, clearAllData, getSaveFilePreview } from '$lib/db/export';
	import { fadeFast } from '$lib/utils/motion';
	import '../modal-kit.css';

	let exporting = $state(false);
	let exportDone = $state<string | null>(null);

	let confirmingClear = $state(false);
	let cleared = $state(false);

	const memoryOn = $derived(modulesStore.isModuleEnabled('memory'));

	async function exportData() {
		exporting = true;
		try {
			const save = await exportSave();
			const preview = getSaveFilePreview(save);
			const { filename } = await downloadSaveFile(save);
			exportDone = `${filename} (${preview.counts.facts} recuerdos, ${preview.counts.conversationTurns} mensajes)`;
		} finally {
			exporting = false;
		}
	}

	async function wipeEverything() {
		await clearAllData();
		await characterStore.resetState();
		confirmingClear = false;
		cleared = true;
		setTimeout(() => (cleared = false), 2400);
	}
</script>

<div class="set-view">
	<header class="set-header">
		<h2>Privacidad</h2>
		<p>Todo vive en este dispositivo. Tú decides qué se recuerda y qué se va.</p>
	</header>

	<section class="set-section">
		<h3>Historial de conversación</h3>
		<div class="line">
			<span class="line-label">Guardar conversaciones</span>
			<span class="line-desc">El historial con el que ella retoma el hilo</span>
			<button
				class="set-switch"
				class:on={displayStore.chatDisplayMode !== 'off'}
				type="button"
				role="switch"
				aria-checked={displayStore.chatDisplayMode !== 'off'}
				aria-label="Guardar conversaciones"
				onclick={() => {}}
			></button>
		</div>
	</section>

	<section class="set-section">
		<h3>Memoria</h3>
		<div class="line">
			<span class="line-label">Que recuerde detalles tuyos</span>
			<span class="line-desc">Hechos y momentos que va aprendiendo</span>
			<button
				class="set-switch"
				class:on={memoryOn}
				type="button"
				role="switch"
				aria-checked={memoryOn}
				aria-label="Memoria"
				onclick={() => modulesStore.setModuleEnabled('memory', !memoryOn)}
			></button>
		</div>
		<div class="line">
			<span class="line-label">Personalización</span>
			<span class="line-desc">Adaptar su tono a cómo conversan</span>
			<button class="set-switch on" type="button" role="switch" aria-checked="true" aria-label="Personalización" onclick={() => {}}></button>
		</div>
	</section>

	<hr class="set-divider" />

	<section class="set-section">
		<h3>Tus datos</h3>
		<div class="line">
			<span class="line-label">Exportar todo</span>
			<span class="line-desc">Un archivo con su historia completa</span>
			<button class="set-btn set-btn--ghost" type="button" disabled={exporting} onclick={exportData}>
				{exporting ? 'Preparando…' : 'Exportar'}
			</button>
		</div>
		{#if exportDone}
			<p class="ok" transition:fadeFast={{ duration: 200 }}>Guardado: {exportDone}</p>
		{/if}
	</section>

	<hr class="set-divider" />

	<section class="set-section">
		<h3>Eliminar</h3>
		{#if confirmingClear}
			<div class="confirm">
				<p>Se borra todo: conversaciones, recuerdos y su historia. No hay vuelta atrás.</p>
				<div class="confirm-actions">
					<button class="set-btn set-btn--ghost" type="button" onclick={() => (confirmingClear = false)}>Cancelar</button>
					<button class="set-btn set-btn--danger" type="button" onclick={wipeEverything}>Eliminar todo</button>
				</div>
			</div>
		{:else}
			<div class="line">
				<span class="line-label">Eliminar cuenta y datos</span>
				<span class="line-desc">Borra todo lo guardado en este dispositivo</span>
				<button class="set-btn set-btn--danger" type="button" onclick={() => (confirmingClear = true)}>
					Eliminar
				</button>
			</div>
		{/if}
		{#if cleared}
			<p class="ok" transition:fadeFast={{ duration: 200 }}>Todo eliminado. Empezarán de cero.</p>
		{/if}
	</section>
</div>

<style>
	.line {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5625rem 0.25rem;
	}


	.line-label {
		flex-shrink: 0;
		min-width: 11rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.88);
	}

	.line-desc {
		flex: 1;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.ok {
		margin: 0.5rem 0.25rem 0;
		font-size: 0.75rem;
		color: var(--color-success);
	}

	.confirm {
		padding: 0.875rem;
		border: 1px solid color-mix(in srgb, var(--color-error) 32%, transparent);
		border-radius: 12px;
		background: color-mix(in srgb, var(--color-error) 6%, transparent);
	}

	.confirm p {
		margin: 0 0 0.75rem;
		font-size: 0.8438rem;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.45;
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.625rem;
	}
</style>
