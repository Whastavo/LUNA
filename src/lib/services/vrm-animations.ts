import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMAnimationLoaderPlugin, type VRMAnimation } from '@pixiv/three-vrm-animation';

// Los archivos de animación son pequeños, fijos y se piden una y otra vez: el
// ciclo de idle solo refetchaba los mismos cinco .vrma miles de veces al día
// (cifrados: .lcx). Se cachea la VRMAnimation parseada por URL. Los clips no
// se cachean porque createVRMAnimationClip los ata a un VRM específico: cada
// llamador construye el suyo contra el modelo que tenga cargado.
//
// Deliberadamente NO usamos THREE.Cache: es global y también fijaría cada
// modelo de 15MB en memoria por la vida de la página.

export type VrmAnimationFetcher = (url: string) => Promise<VRMAnimation>;

const cache = new Map<string, Promise<VRMAnimation>>();

async function loadFromNetwork(url: string): Promise<VRMAnimation> {
	// Import dinámico: el descifrado (y su dependencia $app/environment) solo
	// se materializa en cliente; los tests Node inyectan su propio fetcher y
	// nunca tocan esta ruta.
	const { fetchProtectedAsset } = await import('./asset-guard');
	const data = await fetchProtectedAsset(url);
	const loader = new GLTFLoader();
	loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
	const gltf = (await loader.parseAsync(data, '')) as {
		userData: { vrmAnimations?: VRMAnimation[] };
	};
	const anims = gltf.userData.vrmAnimations;
	if (anims && anims.length > 0) return anims[0];
	throw new Error(`Sin animación VRM en ${url}`);
}

/**
 * Load a .vrma and reuse it for every later request of the same URL.
 * `fetcher` exists so tests can run without a real loader.
 */
export function loadVrmAnimation(
	url: string,
	fetcher: VrmAnimationFetcher = loadFromNetwork
): Promise<VRMAnimation> {
	let cached = cache.get(url);
	if (!cached) {
		cached = fetcher(url);
		// A transient failure must not poison the URL for the rest of the session.
		// The no-op catch also keeps a fire-and-forget caller from tripping an
		// unhandled rejection warning.
		cached.catch(() => cache.delete(url));
		cache.set(url, cached);
	}
	return cached;
}

/** Drop every cached animation. Used by tests. */
export function clearVrmAnimationCache(): void {
	cache.clear();
}
