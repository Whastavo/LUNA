/**
 * i18n ligero sin dependencias.
 *
 * - `$locale` es un store de Svelte que persiste la preferencia en
 *   localStorage (por defecto 'es').
 * - `t(key, vars?)` resuelve claves separadas por puntos en el diccionario.
 * - `{name}` en los valores se sustituye por variables.
 */

import { writable } from 'svelte/store';

export type Locale = 'es';

export const DEFAULT_LOCALE: Locale = 'es';
const STORAGE_KEY = 'luna.locale';

const es = {
	// ── Marca y navegador ────────────────────────────────────────────────
	'brand.name': 'Luna',
	'brand.tagline': 'La compañera de IA que puedes ver y con la que puedes hablar',
	'brand.description':
		'Luna es una compañera IA con avatares VRM 3D, chat de voz, memoria semántica y soporte multi-proveedor de LLM. Privacidad primero.',
	'brand.desc.short': 'La compañera IA con avatares 3D VRM',
	'brand.luna.meaning': 'Luna significa: tu compañera, a tu manera.',

	// ── Navegación ───────────────────────────────────────────────────────
	'nav.features': 'Funciones',
	'nav.docs': 'Documentación',
	'nav.blog': 'Blog',
	'nav.github': 'GitHub',
	'nav.download': 'Descargar',
	'nav.tryLive': 'Pruébala',
	'nav.openMenu': 'Abrir menú',
	'nav.closeMenu': 'Cerrar menú',
	'nav.mainNav': 'Navegación principal',

	// ── Landing ──────────────────────────────────────────────────────────
	'home.hero.title1': 'Una compañera IA',
	'home.hero.title2': 'que puedes ver',
	'home.hero.title3': 'y con la que puedes hablar.',
	'home.hero.imageAlt': 'Colección rotativa de personajes acompañantes VRM 3D creados para Luna',
	'home.hero.body':
		'Carga un avatar VRM, conecta cualquier LLM y habla por voz con un personaje que escucha, responde y recuerda, todo en tu propia máquina.',
	'home.cta.try': 'Pruébala en vivo',
	'home.cta.download': 'Descargar',
	'home.cta.docs': 'Leer la documentación →',
	'home.section.kicker': 'TRAE TU PROPIA INTELIGENCIA',
	'home.section.anyModel': 'Conecta cualquier modelo. Usa tus propias claves.',
	'home.section.bestWay': 'La mejor forma de dar vida a una IA.',
	'home.section.desktopAlt': 'App de escritorio de Luna con compañera de avatar VRM 3D e interfaz de chat',
	'home.section.realBody': 'Un cuerpo 3D real, no una caja de chat.',
	'home.section.realBody.body':
		'Suelta cualquier modelo VRM y obsérvalo cobrar vida. Las respuestas aparecen como burbujas de diálogo 3D que siguen la cabeza de tu compañera mientras se mueve, respira y mira a su alrededor.',
	'home.section.memoryAlt': 'Grafo de memoria semántica mostrando la relación e historial de conversación de la compañera IA',
	'home.section.memory.title': 'Ella recuerda de verdad.',
	'home.section.memory.body':
		'Los embeddings de IA locales tejen tus conversaciones en una red de recuerdos que puede evocar por significado, no por palabras clave. El afecto, la confianza y el ánimo cambian con el tiempo a lo largo de ocho etapas de relación, de Desconocida a Alma gemela.',
	'home.section.own.title': 'Tú controlas cada parte.',
	'home.section.own.body':
		'Usa un modelo de frontera o mantén todo fuera de línea con Ollama y LM Studio. Mezcla y combina proveedores de chat, voz y texto-a-voz — todo con tus propias claves de API, sin que nada pase por nosotros.',
	'home.section.vessel': 'Luna',
	'home.section.vessel.meaning': 'significa',
	'home.section.vessel.body': 'Tú decides qué la llena.',
	'home.section.blog.title': 'Recién salido del blog',
	'home.section.blog.body': 'Guías, análisis profundos y notas de versión del proyecto.',
	'home.section.blog.viewAll': 'Ver todas las entradas',
	'home.section.cta.title': '¿Lista para conocer a tu compañera?',
	'home.section.cta.body':
		'Pruébala en tu navegador o descarga la app de escritorio.',
	'home.readArticle': 'Leer artículo →',

	// ── Footer ───────────────────────────────────────────────────────────
	'footer.tagline': 'La compañera de IA que puedes ver y con la que puedes hablar.',
	'footer.product': 'Producto',
	'footer.resources': 'Recursos',
	'footer.legal': 'Legal',
	'footer.features': 'Funciones',
	'footer.tryLive': 'Pruébala en vivo',
	'footer.privacy': 'Política de Privacidad',
	'footer.terms': 'Términos de Uso',
	'footer.license': 'Privacidad primero',
	'footer.copyright': '© 2026 Whizzend.',
	'footer.theme': 'Tema: Sistema',

	// ── Docs shell ───────────────────────────────────────────────────────
	'docs.overview': 'Visión general',
	'docs.guides': 'Guías',
	'docs.technology': 'Tecnología',
	'docs.community': 'Comunidad',
	'docs.item.introduction': 'Introducción',
	'docs.item.webGuide': 'Guía web',
	'docs.item.desktopGuide': 'Guía de escritorio',
	'docs.item.localLlm': 'Configurar LLM local',
	'docs.item.localTts': 'Configurar TTS local',
	'docs.item.omnivoice': 'Configurar OmniVoice',
	'docs.item.localStt': 'Configurar STT local',
	'docs.item.troubleshooting': 'Solución de problemas',
	'docs.item.architecture': 'Visión de la arquitectura',
	'docs.item.companion': 'Sistema de compañera',
	'docs.item.memoryGraph': 'Grafo de memoria',
	'docs.item.resources': 'Recursos',
	'docs.item.contributing': 'Contribuir',
	'docs.search.placeholder': 'Buscar en la documentación…',
	'docs.search.noResults': 'Sin resultados',
	'docs.search.empty': 'Escribe para buscar en la documentación',
	'docs.prev': 'Anterior',
	'docs.next': 'Siguiente',
	'docs.getStarted.title': '¿Listo para empezar?',
	'docs.getStarted.try': 'Pruébala en tu navegador',
	'docs.getStarted.download': 'Descargar para escritorio',
	'docs.editOnGithub': 'Editar esta página',
	'docs.onThisPage': 'En esta página',

	// ── Blog ─────────────────────────────────────────────────────────────
	'blog.title': 'Blog',
	'blog.subtitle': 'Guías, análisis profundos y notas de versión del proyecto.',
	'blog.back': '← Volver al blog',

	// ── Download ─────────────────────────────────────────────────────────
	'download.title': 'Descarga Luna',
	'download.subtitle': 'Privada por diseño.',

	// ── App shell / botones ──────────────────────────────────────────────
	'app.settings': 'Ajustes',
	'app.memory': 'Memoria',
	'app.photoMode': 'Modo foto',
	'app.exitPhotoMode': 'Salir del modo foto',
	'app.toggleOverlay': 'Mostrar/ocultar superposición',
	'app.closeChat': 'Cerrar chat',
	'app.openChat': 'Abrir chat',
	'app.companionStatus': 'Estado de la compañera',
	'app.deleteReminder': 'Eliminar recordatorio',
	'app.close': 'Cerrar',
	'app.save': 'Guardar',
	'app.cancel': 'Cancelar',
	'app.delete': 'Eliminar',
	'app.loading': 'Cargando…',

	// ── Chat ─────────────────────────────────────────────────────────────
	'chat.placeholder': 'Escribe un mensaje…',
	'chat.send': 'Enviar',
	'chat.mic': 'Hablar',
	'chat.thinking': 'Pensando…',
	'chat.you': 'Tú',
	'chat.clear': 'Limpiar conversación',
	'chat.export': 'Exportar conversación',

	// ── Errores comunes ──────────────────────────────────────────────────
	'error.title': 'Algo salió mal',
	'error.generic': 'Se produjo un error inesperado. Inténtalo de nuevo.',
	'error.network': 'Error de conexión. Revisa tu conexión a internet.',
	'error.apiKey': 'Falta la clave de API o no es válida.',
	'error.notFound': 'No encontrado',
	'error.pageNotFound': 'Página no encontrada',
	'error.postNotFound': 'Entrada no encontrada',
	'error.retry': 'Reintentar',

	// ── Términos de relación (régimen) ───────────────────────────────────
	'rel.stage.0': 'Desconocida',
	'rel.stage.1': 'Aliada',
	'rel.stage.2': 'Compañera',
	'rel.stage.3': 'Confidente',
	'rel.stage.4': 'Cercana',
	'rel.stage.5': 'Amor platónico',
	'rel.stage.6': 'Enamorada',
	'rel.stage.7': 'Alma gemela',

	// ── Estados de ánimo / energía ───────────────────────────────────────
	'stats.mood': 'Ánimo',
	'stats.energy': 'Energía',
	'stats.affection': 'Afecto',
	'stats.trust': 'Confianza',
	'stats.friendship': 'Amistad'
} as const;

export type MessageKey = keyof typeof es;

// Cualquier locale añadido en el futuro debe implementar todas las claves.
const dictionaries: Record<Locale, Record<MessageKey, string>> = { es };

let currentLocale: Locale = DEFAULT_LOCALE;

export const locale = writable<Locale>(DEFAULT_LOCALE);

locale.subscribe((value) => {
	currentLocale = value;
	if (typeof localStorage !== 'undefined') {
		try {
			localStorage.setItem(STORAGE_KEY, value);
		} catch {
			/* almacenamiento no disponible */
		}
	}
});

// Hidratar desde localStorage si existe (solo navegador).
if (typeof localStorage !== 'undefined') {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === 'es') locale.set(stored);
	} catch {
		/* almacenamiento no disponible */
	}
}

/**
 * Traduce una clave. Sustituye `{var}` por valores interpolados.
 * Si falta la clave, devuelve la clave misma para que sea visible en desarrollo.
 */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
	const dict = dictionaries[currentLocale];
	let text: string = dict[key] ?? key;
	if (vars) {
		for (const [name, value] of Object.entries(vars)) {
			text = text.replaceAll(`{${name}}`, String(value));
		}
	}
	return text;
}

/** Fecha en horario UTC, siempre en español (formato fijo, sin depender del reloj local). */
export function formatUTCDate(raw: string | Date): string {
	const d = raw instanceof Date ? raw : new Date(raw + 'T00:00:00Z');
	return `${d.getUTCDate()} ${MONTHS_UTC[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const MONTHS_UTC = [
	'ene', 'feb', 'mar', 'abr', 'may', 'jun',
	'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
] as const;

/** Fecha y hora en horario UTC, p.ej. "15 sep 2026, 14:30 UTC". */
export function formatUTCDateTime(raw: string | Date): string {
	const d = raw instanceof Date ? raw : new Date(raw);
	if (Number.isNaN(d.getTime())) return String(raw);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getUTCDate()} ${MONTHS_UTC[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}
