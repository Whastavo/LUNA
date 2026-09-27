<script lang="ts">
	import { personaStore } from '$lib/stores/persona.svelte';
	import { marketingImage } from '$lib/utils/marketing-images';

	const name = $derived(personaStore.activeCard.name);
</script>

<!-- Home link: the brand badge doubles as the way back to the landing page
     (in the desktop build the global listener opens it in the browser). -->
<a href="/" class="brand-header" aria-label="Ir a la página principal de Luna">
	<img {...marketingImage('/luna/visuals/luna-avatar.webp', '40px')} alt={name} class="brand-avatar" />
	<div class="brand-text">
		<span class="brand-name">{name.toUpperCase().replaceAll('A', 'Λ').split('').join(' ')}</span>
		<span class="brand-status"><span class="status-dot" aria-hidden="true"></span>En línea</span>
	</div>
</a>

<style>
	.brand-header {
		position: fixed;
		/* Shared top band with the icon row: same width, content pinned left */
		top: calc(1.25rem + env(safe-area-inset-top, 0));
		left: 50%;
		transform: translateX(-50%);
		/* Wider than the chat column: 450px max, fluid on small screens */
		width: clamp(300px, calc(100vw - 2rem), 450px);
		z-index: 40;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.45rem 1rem 0.45rem 0.45rem;
		border-radius: var(--radius-full);
		text-decoration: none;
		cursor: pointer;
		/* Opacity only — any transform here shifts the centered bar on press */
		transition: opacity 0.15s ease;
	}

	.brand-header:hover {
		opacity: 0.85;
	}

	.brand-avatar {
		width: 46px;
		height: 46px;
		border-radius: var(--radius-full);
		object-fit: cover;
		object-position: 50% 20%;
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.22),
			0 4px 14px rgba(0, 0, 0, 0.45);
	}

	.brand-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		line-height: 1.2;
	}

	.brand-name {
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		/* Floating over any scene: ALWAYS white + legibility halo (theme-proof) */
		color: rgba(255, 255, 255, 0.96);
		text-shadow:
			0 1px 3px rgba(0, 0, 0, 0.45),
			0 0 10px rgba(0, 0, 0, 0.25);
	}

	.brand-status {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.72rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.78);
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
	}

	.status-dot {
		width: 7px;
		height: 7px;
		border-radius: var(--radius-full);
		background: #3ecf6f;
		box-shadow: 0 0 6px rgba(62, 207, 111, 0.8);
	}
</style>
