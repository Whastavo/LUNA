/**
 * Blindaje de assets: los modelos y animaciones de Luna SON el producto, así
 * que no se sirven como archivos legibles. En reposo viven cifrados (AES-256-GCM
 * vía WebCrypto) y el navegador los reconstruye ÚNICAMENTE en memoria: nunca
 * tocan el disco como .vrm, no aparecen como descarga y un `curl` directo
 * recibe bytes ilegibles.
 *
 * Protocolo: cada asset protegido vive como <nombre>.lcx (Luna Ciphered eXtension):
 *   [4 bytes: longitud del IV][IV][resto: ciphertext AES-256-GCM]
 * La clave no vive entera en ninguna parte: se trocea en 4 fragmentos que solo
 * se reensamblan en memoria al vuelo. No es DRM absoluto —nada en un navegador
 * lo es— pero elimina el hotlink, la descarga directa y el scraper trivial:
 * el archivo público por sí solo no sirve para nada.
 */
import { browser } from '$app/environment';

/** Extensión de los assets cifrados servidos desde /luna/. */
export const CIPHER_EXT = '.lcx';

/** Ruta pública de un asset protegido a partir de su ruta original. */
export function cipheredUrl(url: string): string {
	return url.replace(/\.vrm(a)?$/, CIPHER_EXT);
}

// Clave troceada: cada fragmento es inútil sin los demás; el ensamblado
// ocurre solo en memoria y nunca se persiste.
const K0 = 'de29773cb71247e2';
const K1 = '1920d9616c58aaf2';
const K2 = 'b580993cf8c88215';
const K3 = '0f3b3f44a0bd8e24';

let keyPromise: Promise<CryptoKey> | null = null;

function getKey(): Promise<CryptoKey> {
	if (!keyPromise) {
		keyPromise = (async () => {
			const raw = Uint8Array.from(
				(K0 + K1 + K2 + K3).match(/.{2}/g)!.map((h) => parseInt(h, 16))
			);
			const k = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
			raw.fill(0); // la copia de bytes crudos muere al importar
			return k;
		})();
	}
	return keyPromise;
}

/** Descifra un ArrayBuffer de formato .lcx a los bytes originales del asset. */
async function decipher(buffer: ArrayBuffer): Promise<ArrayBuffer> {
	const view = new DataView(buffer);
	const ivLen = view.getUint32(0, true);
	const iv = new Uint8Array(buffer, 4, ivLen);
	const data = new Uint8Array(buffer, 4 + ivLen);
	const key = await getKey();
	return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
}

/**
 * Descarga y descifra un asset protegido, devolviendo los bytes originales.
 * Solo en cliente: en SSR lanza — los assets se consumen desde efectos de
 * browser, nunca del servidor.
 */
export async function fetchProtectedAsset(url: string): Promise<ArrayBuffer> {
	if (!browser) throw new Error('Asset protegido solicitado en SSR');
	// Los customs importados viven como blob: EN CLARO (el usuario ya tiene
	// su .vrm — no viajan cifrados). Descifrarlos corrompería el parse: el
	// descifrador leería la cabecera glTF como longitud de IV y el loader
	// moriría con "error de VRM". Pasan tal cual.
	if (url.startsWith('blob:')) {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`Asset local ${res.status}: ${url}`);
		return res.arrayBuffer();
	}
	const res = await fetch(cipheredUrl(url));
	if (!res.ok) throw new Error(`Asset cifrado ${res.status}: ${cipheredUrl(url)}`);
	return decipher(await res.arrayBuffer());
}

/**
 * Configura un GLTFLoader para consumir assets cifrados: intercepta la URL y
 * la resuelve desde memoria (parseAsync) en vez de red. Mantiene el registro
 * de plugins que el llamante pase.
 */
export function protectLoader(
	loader: { load: (url: string, onLoad: (d: unknown) => void, onProgress?: unknown, onError?: (e: unknown) => void) => void; parseAsync: (data: ArrayBuffer, path?: string) => Promise<unknown> },
	onData?: (data: ArrayBuffer, url: string) => Promise<unknown>
): { load: (url: string, onLoad: (d: unknown) => void, onProgress?: unknown, onError?: (e: unknown) => void) => void } {
	return {
		load(url, onLoad, onProgress, onError) {
			fetchProtectedAsset(url)
				.then(async (data) => {
					if (onData) {
						const parsed = await onData(data, url);
						onLoad(parsed);
					} else {
						const parsed = await loader.parseAsync(data);
						onLoad(parsed);
					}
				})
				.catch(onError);
		}
	};
}
