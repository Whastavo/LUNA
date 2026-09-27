<script lang="ts">
	import DataManagement from '$lib/components/settings/DataManagement.svelte';
	import '../modal-kit.css';
</script>

<div class="set-view">
	<header class="set-header">
		<h2>Datos</h2>
		<p>Respaldo, importación y borrado de tu información local.</p>
	</header>

	<div class="embed">
		<DataManagement />
	</div>
</div>

<style>
	.embed :global(.data-management),
	.embed :global(section) {
		max-width: none;
	}

	/* El título grande vive en el header de la vista — el interno sobra */
	.embed :global(.section-title) {
		display: none;
	}

	.embed :global(.section-description) {
		margin-top: 0;
	}

	/* Móvil: los botones largos parten en vez de desbordar */
	@media (max-width: 640px) {
		.embed :global(.action-card) :global(button) {
			width: 100%;
			justify-content: center;
		}
	}
</style>
