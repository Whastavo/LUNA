<script lang="ts">
	import { marketingImage } from '$lib/utils/marketing-images';
	import SiteNav from '$lib/components/marketing/SiteNav.svelte';
	import SiteFooter from '$lib/components/marketing/SiteFooter.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { reveal } from '$lib/utils/reveal';
	import { SITE_URL, GITHUB_RELEASES } from '$lib/config/site';
	import { sectionUrl } from '$lib/config/links';

	let { data } = $props();

	// Release asset URLs resolved at build time (see +page.ts). Falls back to the
	// releases page below if the API was unavailable during the build.
	const assets = $derived(data.assets ?? {});

	// Best-guess the visitor's OS so the primary button points at their build.
	let os = $state<'macOS' | 'Windows' | 'Linux'>('macOS');
	$effect(() => {
		const ua = navigator.userAgent;
		if (/Windows/i.test(ua)) os = 'Windows';
		else if (/Linux/i.test(ua) && !/Android/i.test(ua)) os = 'Linux';
		else os = 'macOS';
	});

	const downloadFor = (key: string) => assets[key] || GITHUB_RELEASES;

	const platforms = [
		{ name: 'macOS', note: 'Apple Silicon e Intel, .dmg universal', key: 'macOS' },
		{ name: 'Windows', note: 'Windows 10 y 11, instalador .exe x64', key: 'Windows' },
		{ name: 'Linux', note: '.AppImage, .deb y .rpm', key: 'Linux' }
	];

	const included = [
		{ title: 'Gratis para siempre', body: 'Sin suscripción y sin funciones de pago. La app entera es tuya.' },
		{ title: 'Sin cuenta', body: 'Nada que registrar. Ábrela y empieza.' },
		{ title: 'Tus claves', body: 'Trae las claves de tu modelo, o ejecuta un modelo local sin ninguna.' },
		{ title: 'Todo en tu dispositivo', body: 'Los personajes y las conversaciones viven en almacenamiento local, no en nuestros servidores.' }
	];
</script>

<svelte:head>
	<title>Descargar Luna | Whizzend</title>
	<meta
		name="description"
		content="Descarga Luna, la compañera IA con avatares VRM 3D, para macOS, Windows y Linux, o ejecútala en tu navegador. Privacidad primero."
	/>
	<link rel="canonical" href={`${SITE_URL}/download`} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Descargar Luna" />
	<meta
		property="og:description"
		content="Para macOS, Windows y Linux, o ejecútala en tu navegador."
	/>
	<meta property="og:url" content={`${SITE_URL}/download`} />
	<meta property="og:site_name" content="Luna" />
	<meta property="og:image" content={`${SITE_URL}/brand-assets/og-image.png`} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={`${SITE_URL}/brand-assets/og-image.png`} />
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Luna',
		applicationCategory: 'MultimediaApplication',
		operatingSystem: 'macOS, Windows, Linux, Web',
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
		url: SITE_URL,
		downloadUrl: `${SITE_URL}/download`
	})}<\/script>`}
</svelte:head>

<SiteNav />

<main class="grain dl-root">
	<section class="hero">
		<div class="hero-copy">
			<p class="eyebrow hero-kicker">Descargar</p>
			<h1 class="hero-h1 text-balance">Consigue Luna en tu escritorio.</h1>
			<p class="hero-lead text-pretty">
				La app de escritorio añade una superposición transparente que puedes anclar sobre cualquier cosa y un atajo global para invocar
				a tu compañera. En todas las plataformas.
			</p>
			<div class="hero-actions">
				<a href={downloadFor(os)} download class="btn btn-primary btn-lg">
					<Icon name="download" size={15} />
					Descargar para {os}
				</a>
				<a href={sectionUrl('app')} class="hero-textlink"
					>o abre la app web <span class="link-arrow">&rarr;</span></a
				>
			</div>
		</div>

		<div class="hero-shot">
			<img
				class="shot"
				{...marketingImage('/marketing/desktop-app.webp', '(max-width: 859px) calc(100vw - 40px), (max-width: 1280px) 48vw, 616px')}
				alt="La superposición de escritorio de Luna: una compañera VRM flotando en un escritorio de macOS"
				loading="eager"
			/>
		</div>
	</section>

	<section class="platforms">
		<h2 use:reveal class="reveal section-title">Todas las plataformas</h2>
		<ul class="platform-list">
			{#each platforms as p, i}
				<li use:reveal={i * 70} class="reveal platform-row">
					<div class="platform-meta">
						<span class="platform-name">{p.name}</span>
						<span class="platform-note">{p.note}</span>
					</div>
					<a href={downloadFor(p.key)} download class="btn btn-secondary btn-sm">
						Descargar
					</a>
				</li>
			{/each}
		</ul>
		<p use:reveal={220} class="reveal platform-foot">
			Las versiones anteriores y las notas de versión se publican junto a cada lanzamiento.
		</p>
	</section>

	<section class="included">
		<h2 use:reveal class="reveal section-title">Lo que incluye</h2>
		<div class="included-grid">
			{#each included as item, i}
				<div use:reveal={i * 80} class="reveal included-item">
					<h3 class="included-title">{item.title}</h3>
					<p class="included-body">{item.body}</p>
				</div>
			{/each}
		</div>
	</section>


</main>

<SiteFooter />

<style>
	/* Same neutral voice as the landing (its .page-root scopes a white
	   accent): ink labels, no blue. Scoped so the app keeps its accent. */
	main :global(.eyebrow),
	.dl-root :global(.eyebrow) {
		color: var(--text-primary);
		opacity: 0.55;
	}

	.dl-root :global(.btn:focus-visible) {
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--text-primary) 18%, transparent);
	}

	main {
		max-width: 80rem;
		margin: 0 auto;
		padding: 0 var(--marketing-gutter);
	}

	/* Hero: copy left, screenshot right */
	.hero {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
		padding: clamp(3rem, 8vw, 5.5rem) 0 clamp(3rem, 7vw, 4.5rem);
	}

	/* Label styling comes from the shared .eyebrow class */
	.hero-kicker {
		margin: 0 0 1rem;
	}

	.hero-h1 {
		margin: 0 0 1.25rem;
		font-size: clamp(2.25rem, 5vw, 3.5rem);
		font-weight: 500;
		line-height: 1.08;
		letter-spacing: -0.03em;
		color: var(--text-primary);
	}

	.hero-lead {
		margin: 0;
		max-width: 32rem;
		font-size: clamp(1.05rem, 1.6vw, 1.15rem);
		line-height: 1.6;
		color: var(--text-secondary);
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		margin-top: 2rem;
	}

	.hero-textlink {
		margin-left: 0;
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--text-secondary);
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.hero-textlink:hover {
		color: var(--text-primary);
	}

	.link-arrow {
		display: inline-block;
		transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.hero-textlink:hover .link-arrow {
		transform: translateX(3px);
	}

	/* Overlay-mode photo: works in both themes, so no light/dark swap needed */
	.shot {
		display: block;
		width: 100%;
		height: auto;
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-lg);
	}

	@media (min-width: 860px) {
		.hero {
			flex-direction: row;
			align-items: center;
			gap: 4rem;
		}

		.hero-copy {
			flex: 1;
		}

		.hero-shot {
			flex: 1.15;
			min-width: 0;
		}
	}

	/* Staggered load-in */
	.hero-copy {
		animation: pageRise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.hero-shot {
		animation: pageRise 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
	}

	@keyframes pageRise {
		from {
			opacity: 0;
			filter: blur(8px);
			transform: translateY(26px);
		}
		to {
			opacity: 1;
			filter: blur(0);
			transform: none;
		}
	}

	/* Scroll-reveal: same blur-fade-up language as the landing page */
	.reveal {
		opacity: 0;
		transform: translateY(20px);
		filter: blur(8px);
		transition:
			opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
			transform 0.7s cubic-bezier(0.16, 1, 0.3, 1),
			filter 0.7s cubic-bezier(0.16, 1, 0.3, 1);
		transition-delay: var(--reveal-delay, 0ms);
	}

	.reveal:global(.revealed) {
		opacity: 1;
		transform: none;
		filter: blur(0);
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-copy,
		.hero-shot {
			animation: none;
		}

		.reveal {
			opacity: 1;
			transform: none;
			filter: none;
			transition: none;
		}
	}

	/* Section shared */
	.section-title {
		margin: 0 0 1.5rem;
		font-size: clamp(1.4rem, 2.4vw, 1.75rem);
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	/* Platform list */
	.platforms {
		border-top: 1px solid var(--border-subtle);
		padding: clamp(2.5rem, 6vw, 4rem) 0;
	}

	.platform-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.platform-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.1rem 0;
		border-bottom: 1px solid var(--border-subtle);
	}

	.platform-row:first-child {
		border-top: 1px solid var(--border-subtle);
	}

	.platform-meta {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.platform-name {
		font-size: 1.0625rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.platform-note {
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.platform-foot {
		margin: 1.5rem 0 0;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.inline-link {
		color: var(--text-primary);
		font-weight: 500;
		text-decoration: none;
		border-bottom: 1px solid color-mix(in srgb, var(--text-primary) 30%, transparent);
		transition: border-color 0.15s ease, opacity 0.15s ease;
	}

	.inline-link:hover {
		opacity: 0.7;
		border-color: var(--text-primary);
	}

	/* What you get */
	.included {
		border-top: 1px solid var(--border-subtle);
		padding: clamp(2.5rem, 6vw, 4rem) 0;
	}

	.included-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.75rem 3rem;
	}

	.included-title {
		margin: 0 0 0.35rem;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.included-body {
		margin: 0;
		max-width: 26rem;
		font-size: 1rem;
		line-height: 1.6;
		color: var(--text-secondary);
	}

	@media (min-width: 700px) {
		.included-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	/* Build from source */
	.build {
		border-top: 1px solid var(--border-subtle);
		padding: clamp(2.5rem, 6vw, 4rem) 0 clamp(4rem, 9vw, 6rem);
	}

	.build-inner {
		max-width: 34rem;
	}

	.build-body {
		margin: 0 0 1.5rem;
		font-size: 1rem;
		line-height: 1.6;
		color: var(--text-secondary);
	}
</style>
