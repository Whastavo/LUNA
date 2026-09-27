<script lang="ts">
	interface Props {
		audioLevel: number;
		transcript: string;
	}

	let { audioLevel, transcript }: Props = $props();

	// Generate bar heights based on audio level with some variation
	const barCount = 5;
	let bars = $derived(
		Array.from({ length: barCount }, (_, i) => {
			const centerIndex = Math.floor(barCount / 2);
			const distanceFromCenter = Math.abs(i - centerIndex);
			const baseHeight = 0.2;
			const levelContribution = audioLevel * (1 - distanceFromCenter * 0.12);
			const randomFactor = 0.85 + Math.random() * 0.3;
			return Math.min(1, Math.max(baseHeight, levelContribution * randomFactor));
		})
	);
</script>

<div class="visualizer-container">
	<div class="bars">
		{#each bars as height, i}
			<div
				class="bar"
				style="height: {4 + height * 16}px; animation-delay: {i * 50}ms"
			></div>
		{/each}
	</div>
	<span class="transcript" class:placeholder={!transcript}>
		{transcript || 'Escuchando…'}
	</span>
</div>

<style>
	.visualizer-container {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		min-width: 0;
		/* Estira la MISMA caja que el textarea que reemplaza: grabar no
		   desplaza un solo pixel del composer (el textarea también ocupa
		   todo el alto flexible con su contenido centrado). */
		align-self: stretch;
		padding: 0 0.5rem;
		overflow: hidden;
	}

	.bars {
		display: flex;
		align-items: center;
		gap: 3px;
		flex-shrink: 0;
	}

	.bar {
		width: 3px;
		/* Bars live inside the glass input: white chrome, never accent ink */
		background: var(--chrome-text, rgba(255, 255, 255, 0.92));
		border-radius: 1.5px;
		transition: height 0.08s ease-out;
		animation: pulse 0.5s ease-in-out infinite alternate;
	}

	@keyframes pulse {
		from {
			opacity: 0.7;
		}
		to {
			opacity: 1;
		}
	}

	.transcript {
		flex: 1;
		min-width: 0;
		color: var(--chrome-text, rgba(255, 255, 255, 0.92));
		font-size: 1rem;
		line-height: 1.5;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.transcript.placeholder {
		color: var(--chrome-text-dim, rgba(255, 255, 255, 0.64));
	}
</style>
