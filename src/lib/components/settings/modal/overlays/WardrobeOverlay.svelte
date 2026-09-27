<script lang="ts">
	import { fadeFast, pop } from '$lib/utils/motion';
	import { settingsModal } from '$lib/stores/settings-modal.svelte';
	import { accountStore } from '$lib/stores/account.svelte';
	import { marketingImage } from '$lib/utils/marketing-images';
	import Icon from '$lib/components/ui/Icon.svelte';
	import '../modal-kit.css';

	interface Outfit {
		id: string;
		name: string;
		/** Una línea que la describe sin jerga de videojuego. */
		line: string;
		access: 'included' | 'pro' | 'lunas' | 'limited';
		/** Precio en lunas cuando access === 'lunas'. */
		price?: number;
		/** Etiqueta corta para Edición limitada. */
		limitLabel?: string;
		preview: string;
	}

	const ACCESS_LABEL: Record<Outfit['access'], string> = {
		included: 'Incluido',
		pro: 'Pro',
		lunas: 'Lunas',
		limited: 'Edición limitada'
	};

	const outfits: Outfit[] = [
		{
			id: 'original',
			name: 'Vestuario original',
			line: 'El look con el que se conocieron.',
			access: 'included',
			preview: '/luna/visuals/luna-portrait.webp'
		},
		{
			id: 'presence',
			name: 'Presencia',
			line: 'Negro suave, detalles plateados.',
			access: 'included',
			preview: '/luna/visuals/luna-presence.webp'
		},
		{
			id: 'solea',
			name: 'Soleá',
			line: 'Ligero y luminoso para las tardes.',
			access: 'pro',
			preview: '/luna/visuals/luna-solea.webp'
		},
		{
			id: 'nocturne',
			name: 'Nocturne',
			line: 'Para las noches largas de conversación.',
			access: 'lunas',
			price: 800,
			preview: '/luna/visuals/luna-avatar.webp'
		},
		{
			id: 'aurora',
			name: 'Aurora',
			line: 'Colección de estreno, solo este mes.',
			access: 'limited',
			limitLabel: 'Hasta fin de mes',
			preview: '/luna/faces/luna.png'
		}
	];

	let selectedId = $state('original');
	const selected = $derived(outfits.find((o) => o.id === selectedId) ?? outfits[0]);
	const affordable = $derived(selected.access !== 'lunas' || accountStore.coins >= (selected.price ?? 0));

	function acquire() {
		if (selected.access === 'lunas' && affordable && selected.price) {
			accountStore.spendCoins(selected.price);
			selectedId = selected.id;
		}
	}
</script>

<div class="wardrobe" transition:fadeFast={{ duration: 150 }}>
	<header class="wardrobe-head">
		<button class="back" type="button" onclick={() => settingsModal.popOverlay()}>
			<Icon name="chevron-left" size={13} />
			Luna
		</button>
		<h2>Vestuario</h2>
		<span class="balance">{accountStore.coins.toLocaleString('es')} lunas</span>
	</header>

	<div class="wardrobe-body">
		<!-- Preview -->
		<figure class="preview" transition:pop={{ duration: 240, y: 10 }}>				<img {...marketingImage(selected.preview, '480px')} alt={selected.name} />
			<figcaption>
				<span class="preview-name">{selected.name}</span>
				<span class="preview-line">{selected.line}</span>
			</figcaption>
		</figure>

		<!-- Colección -->
		<div class="collection">
			{#each outfits as outfit (outfit.id)}
				<button
					class="outfit"
					class:active={selectedId === outfit.id}
					type="button"
					onclick={() => (selectedId = outfit.id)}
				>
					<img class="outfit-thumb" src={outfit.preview} alt="" aria-hidden="true" />
					<span class="outfit-body">
						<span class="outfit-name">{outfit.name}</span>
						<span class="outfit-line">{outfit.line}</span>
					</span>
					<span class="outfit-access access-{outfit.access}">
						{#if outfit.access === 'lunas'}
							{outfit.price} lunas
						{:else if outfit.access === 'limited'}
							{outfit.limitLabel}
						{:else}
							{ACCESS_LABEL[outfit.access]}
						{/if}
					</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Acción contextual -->
	<footer class="wardrobe-foot">
		{#if selected.access === 'included'}
			<span class="foot-note">Parte de tu colección.</span>
		{:else if selected.access === 'pro'}
			<span class="foot-note">Disponible con el plan Pro.</span>
			<button class="set-btn set-btn--ghost" type="button" onclick={() => settingsModal.goTo('plan')}>Ver planes</button>
		{:else if selected.access === 'limited'}
			<span class="foot-note">{selected.limitLabel} · Llega con el plan Pro o con lunas pronto.</span>
		{:else if affordable}
			<button class="set-btn" type="button" onclick={acquire}>Obtener por {selected.price} lunas</button>
		{:else}
			<span class="foot-note">Te faltan {((selected.price ?? 0) - accountStore.coins).toLocaleString('es')} lunas.</span>
			<button class="set-btn set-btn--ghost" type="button" onclick={() => settingsModal.goTo('lunas')}>Recargar</button>
		{/if}
	</footer>
</div>

<style>
	.wardrobe {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.wardrobe-head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem 2rem 0.875rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.055);
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.3125rem;
		padding: 0.3125rem 0.6875rem 0.3125rem 0.5rem;
		border: none;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.07);
		font-size: 0.7813rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		transition: background 0.14s ease, color 0.14s ease;
	}

	.back:hover {
		background: rgba(255, 255, 255, 0.13);
		color: #fff;
	}

	.wardrobe-head h2 {
		margin: 0;
		font-size: 1.0625rem;
		font-weight: 640;
		color: #fff;
	}

	.balance {
		margin-left: auto;
		font-size: 0.7813rem;
		color: rgba(255, 255, 255, 0.45);
	}

	.wardrobe-body {
		flex: 1;
		min-height: 0;
		display: flex;
		gap: 1.75rem;
		padding: 1.25rem 2rem;
		overflow: hidden;
	}

	/* Preview */
	.preview {
		margin: 0;
		width: 220px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.preview img {
		width: 100%;
		aspect-ratio: 3 / 4;
		object-fit: cover;
		object-position: top;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.09);
	}

	.preview figcaption {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.preview-name {
		font-size: 0.9375rem;
		font-weight: 620;
		color: #fff;
	}

	.preview-line {
		font-size: 0.7813rem;
		color: rgba(255, 255, 255, 0.45);
		line-height: 1.4;
	}

	/* Colección */
	.collection {
		flex: 1;
		min-width: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		align-self: stretch;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.14) transparent;
	}

	.outfit {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding: 0.6875rem 0.375rem;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		background: transparent;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
		transition: background 0.13s ease;
	}

	.outfit:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.outfit.active {
		background: rgba(255, 255, 255, 0.05);
	}

	.outfit-thumb {
		width: 42px;
		height: 42px;
		border-radius: 10px;
		object-fit: cover;
		object-position: top;
		border: 1px solid rgba(255, 255, 255, 0.08);
		flex-shrink: 0;
	}

	.outfit-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.0625rem;
	}

	.outfit-name {
		font-size: 0.875rem;
		font-weight: 560;
		color: rgba(255, 255, 255, 0.92);
	}

	.outfit-line {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.outfit-access {
		flex-shrink: 0;
		font-size: 0.7188rem;
		font-weight: 560;
		color: rgba(255, 255, 255, 0.55);
	}

	.access-pro {
		color: var(--stat-comfort);
	}

	.access-limited {
		color: var(--stat-energy);
	}

	/* Pie */
	.wardrobe-foot {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.875rem;
		padding: 0.875rem 2rem 1.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.055);
	}

	.foot-note {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
	}

	@media (max-width: 767px) {
		.wardrobe-body {
			flex-direction: column;
			overflow-y: auto;
			padding: 1rem 1.25rem;
		}

		.preview {
			width: 100%;
			max-width: 240px;
		}

		.wardrobe-foot {
			padding: 0.75rem 1.25rem 1rem;
		}
	}
</style>
