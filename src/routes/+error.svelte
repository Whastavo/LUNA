<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { marketingImage } from '$lib/utils/marketing-images';
	import Icon from '$lib/components/ui/Icon.svelte';

	// Mensaje según el código: 404 es "no existe", 5xx es "algo se rompió".
	// El resto de códigos cae en un mensaje neutro honesto.
	const mensajes: Record<number, { titulo: string; descripcion: string }> = {
		404: {
			titulo: 'Esta página no existe',
			descripcion: 'El enlace que seguiste se perdió por el camino. Pero no te preocupes, Luna sigue aquí'
		},
		403: {
			titulo: 'Sin acceso',
			descripcion: 'No tienes permiso para ver esto. Si crees que es un error, inicia sesión de nuevo.'
		},
		500: {
			titulo: 'Algo se rompió de nuestro lado',
			descripcion: 'Ocurrió un error interno. No fue por tu culpa — reintenta en unos momentos.'
		},
		502: {
			titulo: 'Nos desconectamos un momento',
			descripcion: 'El servidor no respondió. Suele ser pasajero — reintenta en unos segundos.'
		},
		503: {
			titulo: 'Estamos en mantenimiento',
			descripcion: 'Volvemos en un momento. Luna te espera.'
		}
	};

	const codigo = $derived(page.status);
	const es404 = $derived(codigo === 404);
	const msg = $derived(mensajes[codigo] ?? {
		titulo: 'Algo salió mal',
		descripcion: `Ocurrió un error (${codigo}). Reintenta; si persiste, avísanos.`
	});
	const esCliente = $derived(codigo >= 400 && codigo < 500);

	// Volver: en la app entra directo; si no hay historial, al inicio.
	const volver = () => {
		if (typeof window === 'undefined') return;
		if (window.history.length > 1) goto('/app');
		else goto('/');
	};
</script>

<svelte:head>
	<title>{codigo} · Luna</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="error-page">
	<main class="contenido">
		<!-- En 404 la composición es el ilustrado: el render como escenario y el
		     código gigante glassy encima. En otros códigos, el retrato circular. -->
		{#if es404}
			<div class="escena" aria-hidden="true">
				<img {...marketingImage('/luna/visuals/luna-404.png', '(max-width: 480px) 84vw, 512px')} alt="" draggable="false" />
				<span class="codigo-gigante">{codigo}</span>
			</div>
		{:else}
			<div class="retrato" aria-hidden="true">
				<img src="/luna/faces/luna.png" alt="" draggable="false" />
				<span class="pulso"></span>
			</div>
			<p class="codigo">{codigo}</p>
		{/if}

		<h1>{msg.titulo}</h1>
		<p class="descripcion">{msg.descripcion}</p>

		<div class="acciones">
			<button type="button" class="primaria" onclick={volver}>
				<Icon name="message-circle" size={17} />
				Hablar con Luna
				<span class="flecha"><Icon name="arrow-right" size={16} /></span>
			</button>
			<a class="secundaria" href="/">
				<Icon name="home" size={15} />
				Ir al inicio
			</a>
		</div>

		{#if !esCliente}
			<p class="pista">
				Si el problema persiste, recarga con <kbd>Cmd</kbd>+<kbd>R</kbd> o avísanos en soporte.
			</p>
		{/if}

		{#if es404}
			<footer class="cita" aria-hidden="true">
				<p>“A veces también me pierdo… pero siempre encuentro algo bonito.”</p>
				<span>— Luna</span>
			</footer>
		{/if}
	</main>
</div>

<style>
	.error-page {
		min-height: 100vh;
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--bg-page);
		color: var(--text-primary);
		font-family: var(--font-sans);
		position: relative;
		/* Safe areas: respeta la barra de URL/notch de iPhone, Android y tablets. */
		padding: calc(3rem + env(safe-area-inset-top)) calc(1.25rem + env(safe-area-inset-right))
			calc(3rem + env(safe-area-inset-bottom)) calc(1.25rem + env(safe-area-inset-left));
		/* Nada de scroll lateral: cualquier decoración queda confinada aquí. */
		overflow-x: clip;
	}

	/* Halo de luna: la luz trasera del ilustrado. Vive a nivel de página
	   (no de escena) para que nunca desborde el viewport en pantallas chicas. */
	.error-page::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(
			circle at 50% 42%,
			color-mix(in srgb, var(--text-primary) 7%, transparent) 0%,
			transparent 46%
		);
		pointer-events: none;
	}

	.contenido {
		position: relative;
		text-align: center;
		max-width: 36rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	/* ── Composición 404: render de Luna + número glassy superpuesto ──
	   El ancho se adapta a la ALTURA disponible (no solo al ancho): así el
	   bloque completo cabe en cualquier pantalla y nunca aparece scroll. */
	.escena {
		position: relative;
		width: min(32rem, 84vw, max(12rem, (100svh - 26rem) * 1.19));
	}


	/* Fundido inferior DENTRO del recorte de la imagen: la figura se disuelve
	   hacia el fondo de la página. La imagen ya trae su propio autofundido
	   (generado por script), así que aquí no hay ningún overlay opaco que
	   pueda verse como barra o división. */
	.escena img {
		width: 100%;
		height: auto;
		user-select: none;
		animation: flotar 6.5s ease-in-out infinite;
		-webkit-mask-image: linear-gradient(to bottom, #000 62%, transparent 97%);
		mask-image: linear-gradient(to bottom, #000 62%, transparent 97%);
	}

	@keyframes flotar {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-8px); }
	}

	@media (prefers-reduced-motion: reduce) {
		.escena img { animation: none; }
	}

	/* El código gigante: tipografía glassy (relleno translúcido, borde de luz
	   y sombra interna) cruzando la figura, como en la referencia. */
	.codigo-gigante {
		position: absolute;
		left: 50%;
		bottom: 4%;
		transform: translateX(-50%);
		font-size: clamp(6.5rem, 24vw, 14rem);
		font-weight: 700;
		letter-spacing: -0.02em;
		line-height: 1;
		background: linear-gradient(
			170deg,
			color-mix(in srgb, var(--text-primary) 55%, transparent) 0%,
			color-mix(in srgb, var(--text-primary) 14%, transparent) 60%,
			color-mix(in srgb, var(--text-primary) 30%, transparent) 100%
		);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		-webkit-text-stroke: 2px color-mix(in srgb, var(--text-primary) 45%, transparent);
		filter: drop-shadow(0 10px 28px color-mix(in srgb, var(--text-primary) 18%, transparent));
		pointer-events: none;
	}

	/* ── Otros códigos: retrato circular con pulso de vida ── */
	.retrato {
		position: relative;
		width: clamp(88px, 18vw, 120px);
		aspect-ratio: 1;
		border-radius: 50%;
		padding: 3px;
		background: linear-gradient(
			165deg,
			color-mix(in srgb, var(--text-primary) 45%, transparent),
			color-mix(in srgb, var(--text-primary) 8%, transparent)
		);
		box-shadow: var(--shadow-lg);
		margin-bottom: 0.5rem;
	}

	.retrato img {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
		background: var(--bg-secondary);
		user-select: none;
	}

	.pulso {
		position: absolute;
		right: 6px;
		bottom: 6px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #30d158;
		border: 2.5px solid var(--bg-page);
	}

	.codigo {
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		color: var(--text-tertiary);
	}

	h1 {
		font-size: clamp(1.7rem, 5vw, 2.4rem);
		font-weight: 700;
		letter-spacing: -0.02em;
		line-height: 1.15;
	}

	.descripcion {
		color: var(--text-secondary);
		font-size: 1rem;
		line-height: 1.55;
		max-width: 28rem;
	}

	.acciones {
		display: flex;
		gap: 0.625rem;
		flex-wrap: wrap;
		justify-content: center;
		margin-top: 1.25rem;
	}

	.primaria,
	.secundaria {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		height: 46px;
		padding: 0 1.5rem;
		border-radius: 999px;
		font-size: 0.9375rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: transform 0.15s var(--ease-brand, ease), box-shadow 0.15s ease;
		text-decoration: none;
	}

	/* Botón principal: moneda clara con la flecha que invita a avanzar. */
	.primaria {
		background: var(--text-primary);
		color: var(--bg-page);
		border: none;
	}

	.primaria:hover {
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}

	.primaria .flecha {
		display: inline-flex;
		transition: transform 0.15s ease;
	}

	.primaria:hover .flecha {
		transform: translateX(2px);
	}

	.secundaria {
		background: transparent;
		color: var(--text-primary);
		border: 1px solid var(--border-light);
	}

	.secundaria:hover {
		background: var(--accent-subtle);
	}

	.pista {
		margin-top: 0.75rem;
		font-size: 0.8125rem;
		color: var(--text-tertiary);
	}

	kbd {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		padding: 0.1rem 0.35rem;
		border-radius: 5px;
		border: 1px solid var(--border-light);
		background: var(--bg-secondary);
	}

	/* Cita de Luna: parte del flujo, centrada bajo las acciones. */
	.cita {
		margin-top: 1.5rem;
		text-align: center;
		max-width: 26rem;
	}

	.cita p {
		font-size: 0.875rem;
		color: var(--text-secondary);
		font-style: italic;
		line-height: 1.5;
	}

	.cita span {
		display: block;
		margin-top: 0.375rem;
		font-size: 0.8125rem;
		color: var(--text-tertiary);
	}

	/* Móvil: escena compacta con el mismo tope por altura. */
	@media (max-width: 640px) {
		.escena { width: min(20rem, 88vw, max(10rem, (100svh - 25rem) * 1.19)); }
	}

	/* Móvil apaisado (o pantallas muy bajas): la altura manda — tipografía,
	   botones y espacios se compactan para que TODO quepa sin scroll. */
	@media (max-height: 520px) {
		.error-page { padding: calc(1rem + env(safe-area-inset-top)) calc(1.25rem + env(safe-area-inset-right)) calc(1rem + env(safe-area-inset-bottom)) calc(1.25rem + env(safe-area-inset-left)); }
		.contenido { gap: 0.3rem; }
		.escena { width: min(12rem, 56vw); }
		h1 { font-size: clamp(1.2rem, 3.2vh, 1.6rem); }
		.descripcion { font-size: 0.875rem; line-height: 1.4; max-width: 24rem; }
		.acciones { margin-top: 0.5rem; }
		.primaria, .secundaria { height: 40px; padding: 0 1.125rem; font-size: 0.875rem; }
		.cita { margin-top: 0.75rem; }
		.cita p { font-size: 0.78125rem; }
	}
</style>
