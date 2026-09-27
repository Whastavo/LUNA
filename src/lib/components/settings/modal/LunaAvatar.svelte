<script lang="ts">
	import { vrmStore } from '$lib/stores/vrm.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	// Avatar de Luna desde el sistema real: la foto capturada del personaje
	// activo (misma composición para las tres formas), con fallback al render
	// estático solo para las formas de fábrica — un custom recién importado
	// no se viste con la imagen de Luna mientras llega su captura.
	let { size = 64, rounded = true }: { size?: number; rounded?: boolean } = $props();

	const activeModel = $derived(vrmStore.models.find((m) => m.id === vrmStore.activeModelId));
	const fallbackValid = $derived(
		!activeModel || activeModel.isDefault || vrmStore.hasSessionPortrait(activeModel.id)
	);
	// BUSTO ('bust'): primer plano hombro-arriba — un avatar circular debe
	// mostrar el rostro, no la figura completa.
	const preview = $derived(
		(vrmStore.activeModelId ? vrmStore.getModelPortrait(vrmStore.activeModelId, 'bust') : undefined) ??
			(fallbackValid ? '/luna/faces/luna.png' : undefined)
	);
</script>

<span
	class="luna-avatar"
	class:empty={!preview}
	class:rounded
	style={`width: ${size}px; height: ${size}px`}
	role="img"
	aria-label="Luna"
>
	{#if preview}
		<img src={preview} alt="Luna" />
	{:else}
		<Icon name="persona" size={Math.round(size * 0.5)} />
	{/if}
</span>

<style>
	.luna-avatar {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: var(--radius-md);
		background: var(--bg-tertiary);
		color: var(--text-tertiary);
		flex-shrink: 0;
	}

	.luna-avatar.rounded {
		border-radius: var(--radius-full);
	}

	.luna-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top;
	}
</style>
