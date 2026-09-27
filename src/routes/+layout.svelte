<script lang="ts">
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { modulesStore } from '$lib/stores/modules.svelte';
	import { moduleRegistry } from '$lib/services/modules';
	import { migrateLegacyElevenLabsVoice } from '$lib/services/tts/legacy-voice-migration';
	import { isDesktopBuild } from '$lib/services/platform/platform';
	import { SITE_URL } from '$lib/config/site';

	let { children } = $props();

	// Marketing/content routes that should never live inside the desktop app.
	const isWebOnly = (path: string) =>
		path === '/' ||
		path.startsWith('/documentacion') ||
		path.startsWith('/docs') ||
		path.startsWith('/blog') ||
		path.startsWith('/descargar') ||
		path.startsWith('/download');

	// Rutas legadas de configuración: el modal de /app las reemplazó. Cualquier
	// /app/ajustes/* o /app/settings/* salta a /app, que abre el modal (deep link).
	const esAjustesLegado = (path: string) => path.startsWith('/app/ajustes') || path.startsWith('/app/settings');

	// The desktop build must only ever show the app. The window now boots at
	// "/app" (tauri.conf.json), but this also bounces any web-only route to the
	// app as a safety net, using the build-time flag so it can't race.
	const redirecting = $derived(
		browser && (isDesktopBuild() && isWebOnly(page.url.pathname) || esAjustesLegado(page.url.pathname))
	);

	if (browser) {
		for (const mod of moduleRegistry) {
			modulesStore.registerModule(mod);
		}
		migrateLegacyElevenLabsVoice();

		// React to system theme changes in real-time when using "system" mode
		const themeQuery = window.matchMedia('(prefers-color-scheme: dark)');
		themeQuery.addEventListener('change', () => {
			const colorMode = localStorage.getItem('colorMode') || 'system';
			if (colorMode === 'system') {
				document.documentElement.classList.toggle('dark', themeQuery.matches);
			}
		});

		// In the desktop app, marketing/docs/blog links open in the system
		// browser instead of navigating the webview.
		document.addEventListener('click', (e) => {
			if (!isDesktopBuild()) return;
			const anchor = (e.target as Element).closest('a');
			if (!anchor) return;
			const href = anchor.getAttribute('href');
			if (href && isWebOnly(href)) {
				e.preventDefault();
				e.stopPropagation();
				import('@tauri-apps/plugin-opener').then(({ openUrl }) => {
					openUrl(`${SITE_URL}${href}`);
				});
			}
		}, true);
	}

	// Bounce the desktop app off the landing route into the app itself; las
	// rutas legadas de ajustes además llevan el hash que abre el modal.
	$effect(() => {
		if (!redirecting) return;
		const destino = esAjustesLegado(page.url.pathname) ? '/app#ajustes' : '/app';
		goto(destino, { replaceState: true });
	});
</script>

<svelte:head>
	<title>Luna</title>
	<meta name="description" content="Compañera IA con avatares VRM 3D, chat de voz, memoria semántica y soporte multi-proveedor de LLM. Privacidad primero." />
</svelte:head>

{#if !redirecting}
	{@render children()}
{/if}
