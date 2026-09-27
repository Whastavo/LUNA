<script lang="ts">
	import type { Fact } from '$lib/types/memory';

	/**
	 * Resumen de un hecho (0.15.0): contenido + metadatos legibles
	 * (categoría, importancia y confianza si está registrada). Lo usan
	 * el grafo y la lista de recuerdos.
	 */
	let { fact }: { fact: Pick<Fact, 'content' | 'category' | 'importance'> & Partial<Pick<Fact, 'confidence'>> } = $props();

	const labels: Record<Fact['category'], string> = {
		user: 'Sobre ti',
		relationship: 'De ustedes',
		shared_experience: 'Vivido juntos'
	};
</script>

<p class="fact-content">{fact.content}</p>
<p class="metadata">
	{labels[fact.category]} · Importancia {fact.importance}{#if fact.confidence !== undefined}
		· Confianza {Math.round(fact.confidence * 100)}%{/if}
</p>

<style>
	.fact-content {
		margin: 0 0 0.5rem;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font-size: 0.8438rem;
		color: var(--text-primary);
		line-height: 1.45;
	}

	.metadata {
		margin: 0.5rem 0;
		color: var(--text-secondary);
		font-size: 0.75rem;
	}
</style>
