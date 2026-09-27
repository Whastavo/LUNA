<script lang="ts">
	import DisplaySettings from '$lib/components/settings/DisplaySettings.svelte';
	import '../modal-kit.css';
</script>

<div class="set-view">
	<header class="set-header">
		<h2>Pantalla</h2>
		<p>Cómo aparecen los mensajes de chat en tu pantalla.</p>
	</header>

	<div class="embed">
		<DisplaySettings />
	</div>
</div>

<style>
	.embed :global(.display-page) {
		height: auto;
		overflow: visible;
		max-width: none;
		gap: 1rem;
	}

	.embed :global(.card) {
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		box-shadow: none;
	}

	.embed :global(.segment-btn.active) {
		background: var(--accent);
		color: var(--accent-contrast);
	}

	/* Aire entre segmentos: el activo y el hover no se pegan */
	.embed :global(.segment-control) {
		gap: 0.375rem;
		padding: 0.3125rem;
	}

	.embed :global(.segment-btn:hover:not(.active)) {
		background: color-mix(in srgb, var(--text-primary) 4%, transparent);
		border-radius: calc(var(--radius-md) - 0.125rem);
	}

	/* Móvil: nada se sale de su card */
	.embed :global(.card-header) {
		flex-wrap: wrap;
	}

	.embed :global(.segment-control.compact) {
		width: 100%;
		flex-shrink: 1;
	}

	@media (max-width: 640px) {
		.embed :global(.segment-control) {
			flex-wrap: wrap;
		}

		.embed :global(.segment-btn) {
			flex: 1 1 auto;
			white-space: normal;
			padding: 0.45rem 0.625rem;
			font-size: 0.8125rem;
		}
	}
</style>
