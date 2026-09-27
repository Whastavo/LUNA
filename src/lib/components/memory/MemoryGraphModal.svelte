<script lang="ts">
	import { Icon } from '$lib/components/ui';
	import MemoryGraph from './MemoryGraph.svelte';
	import { fadeFast } from '$lib/utils/motion';
	import type { FactCategory } from '$lib/types/memory';

	/**
	 * Grafo expandido a pantalla completa (utsuwa 0.15.0 "Expand graph").
	 * Comparte selección y categorías con el grafo embebido vía bindables,
	 * e inspecciona un recuerdo saltando a la lista de Recuerdos.
	 */
	interface Props {
		onClose: () => void;
		selectedId?: number | null;
		categories?: FactCategory[];
		onInspect?: (id: number) => void;
		onOpenFacts?: () => void;
	}

	let {
		onClose,
		selectedId = $bindable(null),
		categories = $bindable<FactCategory[]>(['user', 'relationship', 'shared_experience']),
		onInspect,
		onOpenFacts
	}: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	/** Portal al body (el Dialog.Portal de 0.15.0): dentro del sheet de
	 *  Configuración los backdrop-filter ancestros secuestran el fixed y
	 *  su apilamiento — cabecera y barra inferior pintaban encima. En el
	 *  body el overlay cubre TODO de verdad. */
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="modal-overlay" use:portal out:fadeFast={{ duration: 160 }} role="dialog" aria-modal="true" aria-label="Grafo de memoria">
	<div class="modal-container glass-panel">
		<header class="modal-header">
			<div class="header-info">
				<Icon name="brain" size={20} />
				<div class="header-copy">
					<h2>Grafo de memoria</h2>
					<p>Selecciona un recuerdo para inspeccionarlo, o arrastra y haz zoom para explorar conexiones.</p>
				</div>
			</div>
			<button class="close-btn" onclick={onClose} aria-label="Contraer grafo">
				<Icon name="x" size={20} />
			</button>
		</header>

		<div class="modal-content">
			<MemoryGraph bind:selectedId bind:categories {onInspect} {onOpenFacts} expanded />
		</div>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		padding: clamp(0.75rem, 4vh, 3rem);
		/* SIN velo propio (patrón del popover de Administración): el scrim
		   de Configuración ya aísla el fondo — sumar otro velo es lo que
		   apilaba todo a negro */
		background: transparent;
		z-index: 2000;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.modal-container {
		/* La MISMA hoja de Configuración: mismo tamaño, mismo liquid glass,
		   mismos inset highlights — una ventana gemela, no una prima */
		width: min(1020px, 100%);
		height: min(680px, 100%);
		display: flex;
		flex-direction: column;
		border-radius: var(--radius-xl);
		overflow: hidden;
		background: rgba(88, 88, 99, 0.84);
		backdrop-filter: blur(24px) saturate(1.5);
		-webkit-backdrop-filter: blur(24px) saturate(1.5);
		box-shadow:
			inset 0 2px 5px -2px rgba(255, 255, 255, 0.48),
			inset 0 0 2px 0.5px rgba(255, 255, 255, 0.22),
			inset 0 0 12px rgba(255, 255, 255, 0.1),
			inset 0 -8px 12px -8px rgba(255, 255, 255, 0.16),
			0 18px 40px rgba(0, 0, 0, 0.18);
		color: var(--chrome-text, rgba(255, 255, 255, 0.92));
		text-shadow: 0 1px 2px var(--chrome-text-shadow, rgba(0, 0, 0, 0.3));
	}

	:global(html.dark) .modal-container {
		background: var(--chrome-sheet, rgba(36, 36, 44, 0.7));
	}

	.modal-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.125rem 1.25rem 0.875rem;
		border-bottom: 1px solid var(--accent-subtle);
		background: transparent;
	}

	.header-info {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		min-width: 0;
	}

	.header-copy h2 {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.header-copy p {
		margin: 0.125rem 0 0;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.close-btn {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 9px;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition: background 0.14s ease, color 0.14s ease;
	}

	.close-btn:hover {
		background: var(--accent-subtle);
		color: var(--text-primary);
	}

	.modal-content {
		flex: 1;
		min-height: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		/* Aire interior: el grafo respira dentro del vidrio, pegado a nada */
		padding: 0.875rem 1.25rem 1.25rem;
		/* Lavado sutil para separar la zona del canvas del header */
		background: color-mix(in srgb, var(--text-primary) 3%, transparent);
		border-top: 1px solid color-mix(in srgb, var(--text-primary) 7%, transparent);
	}
</style>
