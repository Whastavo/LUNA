<script lang="ts">
	import { vrmStore } from '$lib/stores/vrm.svelte';
	import { marketingImage } from '$lib/utils/marketing-images';

	// Sin `size`: llena al contenedor (el rail).
	// Retrato del personaje ACTIVO, con la MISMA composición para las tres
	// formas: captura de sesión si ya aterrizó; si no, el respaldo servido
	// (portrait/preview). Un custom recién importado NO se viste con el
	// render de Luna: espera su propia captura (~1s) sobre el fondo neutro.
	const activeModel = $derived(vrmStore.models.find((m) => m.id === vrmStore.activeModelId));
	// El rail de Cuenta usa la FIGURA COMPLETA ('full'): la composición
	// vertical del retrato grande. Los bustos ('bust') son para avatares y
	// miniaturas — mezclarlos aquí achicaba la figura del rail.
	const retrato = $derived(
		vrmStore.activeModelId ? vrmStore.getModelPortrait(vrmStore.activeModelId, 'full') : undefined
	);
	// El respaldo del bundle solo vale para las formas de fábrica (es su
	// propia imagen); para customs es un flash de otra personaje — peor que
	// un instante vacío mientras llega su captura.
	const fallbackValid = $derived(
		!activeModel || activeModel.isDefault || vrmStore.hasSessionPortrait(activeModel.id)
	);
	const dynamicShot = $derived.by(() => {
		if (!retrato) return null;
		// Las capturas de sesión son dataURL y pasan tal cual; las URLs de
		// bundle pueden apuntar a maestros migrados fuera de static/ (p. ej.
		// luna-grace.png), así que se resuelven a su derivado generado.
		if (retrato.startsWith('data:')) return retrato;
		return fallbackValid ? (marketingImage(retrato, '320px').src as string) : null;
	});
</script>

<span class="rail-shot" role="img" aria-label="Luna">
	{#if dynamicShot}
		<img src={dynamicShot} alt="Luna" draggable="false" />
	{:else if fallbackValid}
		<img {...marketingImage('/luna/visuals/luna-grace.png', '320px')} alt="Luna" draggable="false" />
	{/if}
</span>

<style>
	.rail-shot {
		position: absolute;
		inset: 0;
		display: block;
		overflow: hidden;
	}

	.rail-shot img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center top;
		user-select: none;
		pointer-events: none;
		background: rgba(10, 10, 14, 0.35); /* respaldo para retratos con transparencia */
	}
</style>
