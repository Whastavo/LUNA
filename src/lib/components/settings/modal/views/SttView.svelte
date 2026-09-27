<script lang="ts">
	import SttSettings from '$lib/components/settings/SttSettings.svelte';
	import '../modal-kit.css';
</script>

<div class="set-view">
	<header class="set-header">
		<h2>Micrófono (STT)</h2>
		<p>De tu voz a texto: proveedor y sensibilidad del micrófono.</p>
	</header>

	<div class="embed">
		<SttSettings />
	</div>
</div>

<style>
	.embed :global(.section) {
		background: transparent;
		border: none;
		box-shadow: none;
		padding: 0;
	}
</style>
