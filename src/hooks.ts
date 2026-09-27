import type { Reroute } from '@sveltejs/kit';

// Subdomain → internal route prefix. On docs.luna.ai a request for
// `/overview/introduction` is routed to `/docs/overview/introduction`, and
// app.luna.ai/settings → /app/settings. This runs on both the server and
// during client-side navigation, so clean subdomain URLs resolve everywhere.
// "Prepend only if missing" keeps already-prefixed paths working as a safety net.
export const reroute: Reroute = ({ url }) => {
	const host = url.hostname;
	const path = url.pathname;

	// Rutas legadas: la configuración vive SOLO en el modal de /app. Los paths
	// viejos (inglés y español) venían en builds de escritorio, marcadores e
	// índices de búsqueda — van a /app, que abre el modal (deep link por hash).
	if (path.startsWith('/app/settings') || path.startsWith('/app/ajustes')) {
		return '/app' + (path.includes('#') ? path.slice(path.indexOf('#')) : '#ajustes');
	}

	if (path.startsWith('/docs') || path.startsWith('/download')) {
		const mapped = path.replace('/docs', '/documentacion').replace('/download', '/descargar');
		return mapped;
	}

	if (host.startsWith('docs.')) {
		if (!path.startsWith('/documentacion') && !path.startsWith('/api')) {
			return path === '/' ? '/documentacion' : `/documentacion${path}`;
		}
	} else if (host.startsWith('app.')) {
		if (!path.startsWith('/app') && !path.startsWith('/api')) {
			return path === '/' ? '/app' : `/app${path}`;
		}
	}

	// Main domain / localhost: leave the path untouched.
};
