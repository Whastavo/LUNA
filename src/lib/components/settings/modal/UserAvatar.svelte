<script lang="ts">
	import { marketingImage } from '$lib/utils/marketing-images';
	// Avatar del USUARIO (no de Luna). Fuente de la foto: localStorage
	// ('luna-user-photo', escrita por el selector de cámara); si no hay,
	// usa la foto por defecto de Gustavo y como última instancia sus
	// iniciales sobre el vidrio.
	let { size = 64 }: { size?: number } = $props();
	// La foto por defecto es una URL de maestro migrado a assets-src/: nunca
	// existirá en el servidor; resuélvela a su derivado generado.
	const defaultPhoto = $derived(marketingImage('/luna/visuals/gustavo.png', `${size}px`).src as string);

	const KEY = 'luna-user-photo';

	let persisted: string | null = $state(null);

	function readStored(): string | null {
		if (typeof localStorage === 'undefined') return null;
		try {
			return localStorage.getItem(KEY);
		} catch {
			return null;
		}
	}

	persisted = readStored();

	// Reacción a cambios hechos por el selector de cámara en esta pestaña.
	$effect(() => {
		if (typeof window === 'undefined') return;
		const sync = () => (persisted = readStored());
		window.addEventListener('luna-user-photo', sync);
		window.addEventListener('storage', sync);
		return () => {
			window.removeEventListener('luna-user-photo', sync);
			window.removeEventListener('storage', sync);
		};
	});

	const photo = $derived(persisted ?? defaultPhoto);

	// Iniciales para el fallback sin imagen.
	const initials = $derived('G');
</script>

<span
	class="user-avatar"
	style={`width: ${size}px; height: ${size}px; font-size: ${Math.round(size * 0.38)}px`}
	role="img"
	aria-label="Tu perfil"
>
	<img src={photo} alt="" draggable="false" />
</span>

<style>
	.user-avatar {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: var(--radius-full);
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		font-weight: 600;
		letter-spacing: 0.02em;
		flex-shrink: 0;
		user-select: none;
	}

	.user-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center top;
	}
</style>
