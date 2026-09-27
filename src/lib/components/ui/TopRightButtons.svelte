<script lang="ts">
	import { goto } from '$app/navigation';
	import { Icon } from '$lib/components/ui';
	import { settingsModal } from '$lib/stores/settings-modal.svelte';
	import { isTauri } from '$lib/services/platform';
	import { displayStore } from '$lib/stores/display.svelte';
	import { chatSurface } from '$lib/stores/chat-surface.svelte';
	import { photomodeStore } from '$lib/stores/photomode.svelte';
	import { getColorMode, cycleColorMode, type ColorMode } from '$lib/utils/color-mode';
	import { onMount } from 'svelte';
	import type { Reminder } from '$lib/types/memory';

	interface Props {
		upcomingReminders?: Reminder[];
		onDeleteReminder?: (id: number) => void;
		recentFired?: Reminder[];
		onDismissRecentFired?: (id: number) => void;
		/** Toggles the chat view inside the bottom command surface. */
		onMessagesToggle?: () => void;
	}

	let {
		upcomingReminders = [],
		onDeleteReminder,
		recentFired = [],
		onDismissRecentFired,
		onMessagesToggle
	}: Props = $props();
	let showOverlayBtn = $state(false);
	let clusterOpen = $state(false);
	let remindersOpen = $state(false);
	let colorMode = $state<ColorMode>('system');
	let rootEl = $state<HTMLDivElement | null>(null);

	const themeIcon = $derived(
		colorMode === 'system' ? 'monitor' : colorMode === 'light' ? 'sun' : 'moon'
	);
	const themeLabel = $derived(
		colorMode === 'system' ? 'Tema: Sistema' : colorMode === 'light' ? 'Tema: Claro' : 'Tema: Oscuro'
	);

	onMount(() => {
		showOverlayBtn = isTauri();
		colorMode = getColorMode();

		// Close dropdowns when clicking anywhere outside the root element
		const onPointerDown = (e: PointerEvent) => {
			if (!rootEl || rootEl.contains(e.target as Node)) return;
			clusterOpen = false;
			remindersOpen = false;
		};
		document.addEventListener('pointerdown', onPointerDown);
		return () => document.removeEventListener('pointerdown', onPointerDown);
	});

	function toggleCluster() {
		clusterOpen = !clusterOpen;
		remindersOpen = false;
	}

	function formatTimeLabel(date: Date): string {
		const now = new Date();
		const diffMs = date.getTime() - now.getTime();
		const diffMin = Math.max(0, Math.ceil(diffMs / 60000));
		if (diffMin < 60) return `en ${diffMin} min`;
		const diffH = Math.ceil(diffMin / 60);
		return `en ${diffH} h`;
	}

	function deleteReminder(id?: number) {
		if (id === undefined) return;
		remindersOpen = false;
		onDeleteReminder?.(id);
	}

	function dismissRecentFired(id?: number) {
		if (id === undefined) return;
		onDismissRecentFired?.(id);
	}

	async function launchOverlay() {
		try {
			const { invoke } = await import('@tauri-apps/api/core');
			const { getCurrentWindow } = await import('@tauri-apps/api/window');

			// Show overlay and hide main window
			await invoke('show_overlay');
			const mainWindow = getCurrentWindow();
			await mainWindow.hide();
		} catch (e) {
			console.error('Failed to launch overlay:', e);
		}
	}
</script>

<div class="top-right-buttons" bind:this={rootEl}>
	<div class="button-row">
		<div class="reminder-wrapper">
			<button
				class="icon-btn glass-chip"
				class:active={remindersOpen}
				onclick={() => (remindersOpen = !remindersOpen)}
				aria-label="Abrir recordatorios"
				title="Abrir recordatorios"
			>
				<Icon name="bell" size={20} />
				{#if upcomingReminders.length > 0}
					<span class="reminder-badge">{upcomingReminders.length}</span>
				{/if}
			</button>
			{#if remindersOpen}
				<div class="reminder-dropdown glass-panel">
					<div class="reminder-header">Tareas abiertas</div>
					{#if upcomingReminders.length === 0}
						<div class="reminder-empty">No hay tareas ni temporizadores abiertos</div>
					{:else}
						<ul class="reminder-list">
							{#each upcomingReminders as reminder (reminder.id)}
								<li class="reminder-item">
									<div class="reminder-text">
										<span class="reminder-content">{reminder.content}</span>
										<span class="reminder-time">{formatTimeLabel(reminder.triggerAt)}</span>
									</div>
									<button
										class="reminder-delete"
										onclick={() => deleteReminder(reminder.id)}
										aria-label="Eliminar recordatorio"
										title="Eliminar recordatorio"
									>
										<Icon name="trash" size={14} />
									</button>
								</li>
							{/each}
						</ul>
					{/if}

					{#if recentFired.length > 0}
						<div class="reminder-header reminder-header--fired">Activados o perdidos</div>
						<ul class="reminder-list">
							{#each recentFired as reminder (reminder.id)}
								<li class="reminder-item reminder-item--fired">
									<div class="reminder-text">
										<span class="reminder-content">{reminder.content}</span>
										<span class="reminder-time">{formatTimeLabel(reminder.triggerAt)}</span>
									</div>
									<button
										class="reminder-delete"
										onclick={() => dismissRecentFired(reminder.id)}
										aria-label="Descartar recordatorio"
										title="Descartar recordatorio"
									>
										<Icon name="check" size={14} />
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		</div>		{#if displayStore.chatDisplayMode === 'sidebar' || displayStore.chatDisplayMode === 'both'}
			<button
				class="icon-btn glass-chip"
				class:active={chatSurface.open && chatSurface.view === 'chat'}
				onclick={() => onMessagesToggle?.()}
				aria-label="Chat"
				title="Chat"
			>
				<Icon name="message" size={20} />
			</button>
		{/if}
		{#if showOverlayBtn}
			<button class="icon-btn glass-chip overlay-btn" onclick={launchOverlay} aria-label="Lanzar superposición" title="Lanzar modo superposición">
				<Icon name="monitor" size={20} />
			</button>
		{/if}
		<button
			class="icon-btn glass-chip cluster-trigger"
			class:open={clusterOpen}
			onclick={toggleCluster}
			aria-label="Controles"
			aria-expanded={clusterOpen}
			title="Controles"
		>
			<Icon name={clusterOpen ? 'x' : 'sliders'} size={20} />
		</button>
	</div>

	{#if clusterOpen}
		<div class="menu glass-panel" role="menu">
			<button
				class="menu-item"
				style="--i: 0"
				role="menuitem"
				onclick={() => settingsModal.show()}
				aria-label="Configuración"
			>
				<Icon name="settings" size={19} />
				<span>Configuración</span>
			</button>
			<button
				class="menu-item"
				style="--i: 1"
				role="menuitem"
				onclick={() => photomodeStore.enter()}
				aria-label="Modo foto"
			>
				<Icon name="camera" size={19} />
				<span>Modo foto</span>
			</button>				<button
					class="menu-item"
					style="--i: 2"
					role="menuitem"
					onclick={() => (colorMode = cycleColorMode())}
					aria-label={themeLabel}
				>
					<Icon name={themeIcon} size={19} />
					<span>{colorMode === 'system' ? 'Sistema' : colorMode === 'light' ? 'Claro' : 'Oscuro'}</span>
				</button>
			</div>
		{/if}
	</div>

<style>
	.top-right-buttons {
		position: fixed;
		/* Shared top band with the brand header: same width; icons pinned right */
		top: calc(1.25rem + env(safe-area-inset-top, 0) + (46px - 44px) / 2);
		left: 50%;
		transform: translateX(-50%);
		width: clamp(300px, calc(100vw - 2rem), 450px);
		/* 55: el panel de cámara vive DENTRO de este contenedor — si quedara
		   bajo el dock inferior (z-50/60), la barra y los botones lo tapaban. */
		z-index: 55;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		pointer-events: none;
	}

	.top-right-buttons > :global(*) {
		pointer-events: auto;
	}

	.button-row {
		display: flex;
		gap: 0.5rem;
	}

	/* Grid menu under the trigger, like the reference's controls popover */
	.menu {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.4rem;
		width: 208px;
		margin-top: 0.6rem;
		padding: 0.5rem;
		border-radius: 18px;
	}

	/* The third tile spans both columns so the grid never leaves a hole */
	.menu-item:last-child:nth-child(odd) {
		grid-column: 1 / -1;
	}

	.menu-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		height: 58px;
		border: 1px solid var(--chrome-border);
		border-radius: 14px;
		background: transparent;
		color: var(--chrome-text);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		cursor: pointer;
		animation: menuIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
		animation-delay: calc(var(--i) * 40ms);
		transition: background 0.15s ease, color 0.15s ease;
	}

	@keyframes menuIn {
		from {
			opacity: 0;
			transform: translateY(-8px) scale(0.92);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.menu-item span {
		opacity: 0.72;
	}

	.menu-item:hover {
		background: var(--chrome-wash);
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-full);
		color: var(--chrome-text);
		cursor: pointer;
		transition: color 0.15s ease, background 0.15s ease,
			box-shadow 0.15s ease, transform 0.15s ease;
	}

	.icon-btn.glass-chip {
		overflow: hidden;
	}

	.icon-btn:hover {
		color: var(--chrome-text);
		background: var(--chrome-surface-active, rgba(30, 30, 35, 0.58));
		transform: translateY(-1px);
	}

	.icon-btn:focus-visible {
		outline: none;
		color: var(--chrome-text);
		box-shadow: 0 0 0 3px var(--accent-muted);
	}

	.icon-btn:active {
		color: var(--chrome-text);
		transform: translateY(0) scale(0.96);
		background: color-mix(in srgb, var(--chrome-surface) 70%, var(--chrome-text));
	}

	.cluster-trigger.open {
		/* Active state = denser smoked glass, never ink, never white-out */
		color: var(--chrome-text);
		background: var(--chrome-surface-active, rgba(30, 30, 35, 0.58));
	}

	/* Overlay button - accent action */
	.overlay-btn {
		background: var(--accent);
		border-color: transparent;
		color: var(--accent-contrast, #fff);
	}

	.overlay-btn:hover {
		background: var(--accent-hover);
		color: var(--accent-contrast, #fff);
	}

	.overlay-btn:active {
		color: var(--accent-contrast, #fff);
		background: var(--accent-hover);
	}

	.reminder-wrapper {
		position: relative;
	}

	.reminder-badge {
		position: absolute;
		top: -2px;
		right: -2px;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		background: var(--color-error);
		color: white;
		font-size: 10px;
		font-weight: 700;
		border-radius: 9px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
	}

	.reminder-dropdown {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		width: 280px;
		max-height: 320px;
		overflow-y: auto;
		border-radius: var(--radius-lg);
		padding: 0.75rem;
		z-index: 60;
	}

	.reminder-header {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 0.5rem;
		padding: 0 0.25rem;
	}

	.reminder-header--fired {
		margin-top: 0.75rem;
		color: var(--color-error);
	}

	.reminder-empty {
		font-size: 0.85rem;
		color: var(--text-muted);
		padding: 0.75rem 0.25rem;
		text-align: center;
	}

	.reminder-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.reminder-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.5rem;
		background: var(--chrome-wash);
		border-radius: var(--radius-md);
		transition: background 0.15s ease;
	}

	.reminder-item:hover {
		background: var(--chrome-wash-strong);
	}

	.reminder-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
		flex: 1;
	}

	.reminder-content {
		font-size: 0.85rem;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.reminder-time {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.reminder-delete {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: var(--radius-full);
		color: var(--text-muted);
		cursor: pointer;
		transition: color 0.15s ease, background 0.15s ease;
		flex-shrink: 0;
	}

	.reminder-delete:hover {
		color: var(--color-error);
		background: color-mix(in srgb, var(--color-error) 10%, transparent);
	}
</style>
