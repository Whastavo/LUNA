<script lang="ts">
	import DeveloperTools from '$lib/components/settings/DeveloperTools.svelte';
	import '../modal-kit.css';
</script>

<div class="set-view dev-view">
	<header class="set-header">
		<h2>Herramientas de desarrollo</h2>
		<p>Depura expresiones, animaciones y el sistema de eventos de Luna.</p>
	</header>

	<div class="embed">
		<DeveloperTools />
	</div>
</div>

<style>
	.dev-view {
		max-width: none;
		width: 100%;
	}

	.embed :global(.developer-settings) {
		max-width: none;
		height: auto;
		overflow: visible;
	}

	/* Dos columnas SOLO en pantallas anchas: abajo, el layout base
	   colapsa a una columna — si no, el panel derecho se aplasta a
	   unos píxeles y el texto sale vertical. */
	@media (min-width: 901px) {
		.embed :global(.dev-layout) {
			grid-template-columns: minmax(240px, 320px) 1fr;
		}
	}

	.embed :global(.controls-panel),
	.embed :global(.viewport-container),
	.embed :global(.section) {
		min-width: 0;
	}

	.embed :global(.viewport) {
		min-height: 260px;
		max-height: 340px;
	}

	.embed :global(.section) {
		background: transparent;
		border: none;
		box-shadow: none;
		padding: 0 0 1.25rem;
	}
</style>
