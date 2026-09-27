/**
 * Warm-up de assets protegidos EN SEGUNDO PLANO.
 *
 * El usuario pidió exactamente esto: si ya descargó los VRMs y las
 * animaciones, la próxima carga debe ser instantánea ("altoque") — y los
 * assets que falten deben irse descargando UNO POR UNO en segundo plano,
 * nunca todos de un solo golpe (una ráfaga de 15MB+ compite con el modelo
 * activo y malogra la experiencia).
 *
 * Cómo funciona: los assets viven cifrados (.lcx) y se sirven con cabeceras
 * HTTP cacheables (immutable), así que basta con FETCHEAR los bytes una vez
 * — el navegador los guarda en su cache HTTP y el descifrador posterior los
 * relee de disco/memoria sin red. Este módulo hace ese "calentamiento":
 *
 *   1. Prioridad: el asset que la página está usando YA está siendo
 *      descargado por su consumidor — no se duplica (fetch coalesced por el
 *      propio HTTP cache).
 *   2. El resto entra en una COLA SECUENCIAL: cada descarga espera a que la
 *      anterior termine (background, paso a paso).
 *   3. Cada trabajo se cede a requestIdleCallback (fallback setTimeout):
 *      nada compite con el render ni con la interacción del usuario.
 *   4. Un error de red no cancela la cola: el asset fallido simplemente
 *      queda para la próxima sesión.
 */

import { browser } from '$app/environment';

interface WarmJob {
	url: string;
}

let queue: WarmJob[] = [];
let queued = new Set<string>();
let running = false;

const idle = (cb: () => void) => {
	if (typeof requestIdleCallback === 'function') {
		requestIdleCallback(cb, { timeout: 4000 });
	} else {
		setTimeout(cb, 120);
	}
};

async function pump() {
	if (running) return;
	running = true;
	try {
		while (queue.length > 0) {
			const job = queue.shift()!;
			queued.delete(job.url);
			try {
				// fetchProtectedAsset descifra; aquí solo nos importa que los
				// bytes pasen por el cache HTTP. El descifrado de calentamiento
				// también valida que el asset sea usable.
				const { fetchProtectedAsset } = await import('./asset-guard');
				await fetchProtectedAsset(job.url);
			} catch {
				/* sin red / asset ausente: la cola sigue, se reintenta otra sesión */
			}
			// Ceder el hilo entre descargas: nunca dos en vuelo de este módulo.
			if (queue.length > 0) await new Promise<void>((r) => idle(() => r()));
		}
	} finally {
		running = false;
	}
}

/**
 * Encola assets para calentar el cache HTTP en segundo plano, uno por uno.
 * Los duplicados y los blob: (customs, ya locales) se ignoran.
 */
export function warmAssets(urls: string[]) {
	if (!browser) return;
	for (const url of urls) {
		if (!url || url.startsWith('blob:') || queued.has(url)) continue;
		queued.add(url);
		queue.push({ url });
	}
	if (queue.length > 0) idle(() => void pump());
}
