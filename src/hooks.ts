import type { Reroute } from '@sveltejs/kit';

// Subdominio → prefijo de ruta interna. En docs.luna.ai una solicitud para
// `/overview/introduction` se enruta a `/docs/overview/introduction`, y
// app.luna.ai/settings → /app/settings. Esto se ejecuta tanto en el servidor como
// durante la navegación del lado del cliente, por lo que las URL de subdominio limpias se resuelven en todas partes.
// "Prepend only if missing" mantiene las rutas ya prefijadas funcionando como red de seguridad.
export const reroute: Reroute = ({ url }) => {
	const host = url.hostname;

	if (host.startsWith('docs.')) {
		if (!url.pathname.startsWith('/docs') && !url.pathname.startsWith('/api')) {
			return url.pathname === '/' ? '/docs' : `/docs${url.pathname}`;
		}
	} else if (host.startsWith('app.')) {
		if (!url.pathname.startsWith('/app') && !url.pathname.startsWith('/api')) {
			return url.pathname === '/' ? '/app' : `/app${url.pathname}`;
		}
	}

	// Dominio principal / localhost: dejar la ruta sin tocar.
};
