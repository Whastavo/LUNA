import { page } from '$app/state';

/**
 * Constructor de enlace consciente del host para la división de subdominio (docs.luna.ai, app.luna.ai).
 *
 * - En el verdadero luna.ai (ápice o cualquier subdominio): los enlaces se resuelven al derecho
 *   subdominio mediante URL absolutas. Los enlaces del mismo origen permanecen en el lado del cliente (SPA) nav,
 *   los enlaces entre subdominios hacen una navegación completa normal.
 * - En desarrollo local (localhost) y en despliegues de vista previa *.vercel.app: todo
 *   permanece basado en rutas (/docs, /app), por lo que no hay nada que configurar para probar.
 *
 * El gancho reroute (src/hooks.ts) asigna las rutas de subdominio limpias a
 * las rutas reales /docs y /app.
 */

type Section = 'docs' | 'app';
const APEX = 'luna.ai';

function hostname(): string {
	return page.url?.hostname ?? '';
}

// Solo el dominio de producción real usa la división de subdominio. localhost y
// los despliegues de vista previa (por ejemplo, *.vercel.app) recurren al enrutamiento basado en rutas.
function usesSubdomains(): boolean {
	return hostname().endsWith(APEX);
}

function norm(path: string): string {
	if (!path) return '';
	return path.startsWith('/') ? path : `/${path}`;
}

/** Link to a page inside a section (docs or app). */
export function sectionUrl(section: Section, path = ''): string {
	const clean = norm(path);
	return usesSubdomains() ? `https://${section}.${APEX}${clean}` : `/${section}${clean}`;
}

/** Link to a page on the main marketing site (the apex domain). */
export function mainUrl(path = ''): string {
	const clean = norm(path);
	return usesSubdomains() ? `https://${APEX}${clean}` : clean || '/';
}

/**
 * La ruta *relativa* del navegador para una página de sección en el host actual — limpia
 * ("/overview") cuando ya está en el subdominio de esa sección, con prefijo
 * ("/docs/overview") de lo contrario. Utiliza para enlaces dentro de la sección y para comparar
 * contra `page.url.pathname` (estados activos), ya que deben coincidir.
 */
export function localPath(section: Section, path = ''): string {
	const clean = norm(path);
	const onThisSubdomain = usesSubdomains() && hostname().startsWith(`${section}.`);
	return onThisSubdomain ? clean || '/' : `/${section}${clean}`;
}

/** Si la página actual pertenece a una sección (subdominio o prefijo de ruta). */
export function isSection(section: Section): boolean {
	return hostname().startsWith(`${section}.`) || (page.url?.pathname ?? '').startsWith(`/${section}`);
}
