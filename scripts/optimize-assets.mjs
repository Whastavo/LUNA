// Asset Optimizer — motor único para todos los tipos de asset (imágenes hoy;
// VRM/GLB, texturas, VRMA, audio y vídeo mañana) compartiendo detección, hash,
// caché, manifest, organización y limpieza.
//
//   node scripts/optimize-assets.mjs [--force]
//
// El plugin de Vite (vite.config.assets.ts) lo ejecuta en cada arranque de
// `pnpm dev` / `pnpm build` y ante cambios de archivo en dev.
//
// Organización:
//   - MAESTROS fuera del árbol servido en assets-src/ (marketing, visuals de
//     luna): jamás se despliegan, solo salen derivados de ellos. Maestros que
//     otras cosas consumen literalmente (og:image del blog, README, CSS) se
//     quedan en static/ y el pipeline solo les añade derivados.
//   - DERIVADOS en static/generated/images/<asset>/<stem>-<ancho>.webp: una
//     carpeta por asset, solo variantes planificadas, ignorados por git y
//     servidos por Vite como el resto de static/. Todo lo generado puede
//     destruirse y regenerarse desde maestros + caché.
//
// Manifest estable: las claves siguen siendo las URLs públicas históricas
// (/marketing/x.webp, /blog/y.png, /luna/visuals/z.png) aunque el maestro
// haya migrado a assets-src/, así ningún consumidor de marketingImage() ni
// ninguna constante de código cambia. Los src/srcset apuntan a /generated/.
//
// Planificación por USO: perfil por grupo de render (en px CSS reales) +
// overrides por asset; el ancho pedido se recorta al natural, así que jamás
// se generan variantes inútiles ni upscales. Cambiar perfil/override regenera
// lo nuevo y poda lo obsoleto en el siguiente arranque.
//
// Incremental: sha256 del maestro + versión del motor + hash del plan. Sin
// cambios y con derivados sanos (mtime >= fuente) se salta todo; si cambia,
// se regeneran solo sus derivados y se podan los huérfanos. Los originales
// NUNCA se modifican ni se borran.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync, rmSync } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const staticDir = join(repoRoot, 'static');
const generatedDir = join(staticDir, 'generated');
const manifestPath = join(repoRoot, 'src/lib/data/marketing-images.json');
const cachePath = join(repoRoot, 'node_modules/.cache/asset-optimizer/cache.json');

// Bump when rules/layout change: fingerprints stop matching and everything
// regenerates once into the new layout.
const ENGINE_VERSION = 2;

const IMAGE_EXTENSIONS = /\.(webp|png|jpe?g|gif)$/i;

// Entrada del manifest consumida por src/lib/utils/marketing-images.ts.
/**
 * @typedef {{
 *   src?: unknown,
 *   srcset?: unknown,
 *   poster?: { src?: unknown, srcset?: unknown } | null,
 *   width?: number
 * }} ManifestEntry
 */

// Carpetas de derivados 100% gestionadas por el motor. Si desaparecieran por
// completo se regeneran desde maestros: los originales viven en static/ o
// assets-src/ y nunca están aquí dentro.
const MANAGED_DERIVATIVE_DIRS = [generatedDir, join(staticDir, 'optimized'), join(staticDir, 'luna', 'optimized')];

const images = {
		// Maestros: dir relativo a la raíz → matcher de nombre de archivo.
		globs: {
			'assets-src/marketing': IMAGE_EXTENSIONS,
			'assets-src/luna/visuals': (/** @type {string} */ name) =>
				/^luna-.+\.(webp|png)$/i.test(name) || name === 'gustavo.png',
			// Maestros servidos (los consumen literalmente og:image/README/CSS):
			// generan derivados pero nunca se mueven.
			'static/blog': IMAGE_EXTENSIONS
		},
		// Perfil de variantes por grupo de render (px CSS reales del slot más
		// grande, no anchos naturales). Ej: hero a 550px → 480/960 bastan.
		groupProfiles: {
			luna: [480, 960],
			marketing: [768, 1440],
			blog: [96, 480, 960, 1920]
		},
		// Overrides por nombre de asset cuando su uso es excepcional.
		profileOverrides: {
			'gustavo.png': [480], // avatar de 44px en dos sitios
			'luna-avatar.webp': [250], // avatar de 40px
			'luna-404.png': [512, 960], // escena 404 a max 512px CSS
			// Hero: carrusel de poses (8 renders); slots de ~424px CSS → 2x = 848
			'luna-posehero.png': [480, 848],
			'luna-posehero-02.png': [480, 848],
			'luna-posehero-03.png': [480, 848],
			'luna-posehero-04.png': [480, 848],
			'luna-posehero-05.png': [480, 848],
			'luna-posehero-06.png': [480, 848],
			'luna-posehero-07.png': [480, 848],
			'luna-posehero-08.png': [480, 848]
		},
		// Grupo de render de cada directorio fuente.
		groupOfDir: {
			'assets-src/luna/visuals': 'luna',
			'assets-src/marketing': 'marketing',
			'static/blog': 'blog'
		},
		// URL pública histórica de cada maestro: clave del manifest. Los de
		// assets-src/ conservan la ruta que tenían cuando vivían en static/.
		publicUrlOf(/** @type {string} */ sourcePath) {
			const underAssetsSrc = sourcePath.startsWith(join(repoRoot, 'assets-src'));
			const rel = underAssetsSrc
				? relative(join(repoRoot, 'assets-src'), sourcePath)
				: relative(staticDir, sourcePath);
			return '/' + rel.split('\\').join('/');
		},
		// Guardia heredada del script Python: los PNG crudos no entran al
		// srcset (pesan 8-20x su variante q85); solo sirven como `src`.
		rawPngInSrcset: false,
		// Grupos cuyo original webp se añade al final del srcset para pantallas
		// densas (solo tiene sentido si el maestro está desplegado en static/).
		originalInSrcsetGroups: [],
		async process(/** @type {string} */ sourcePath, /** @type {import('./asset-kind').AssetProcessContext} */ ctx) {
			const sharp = (await import('sharp')).default;
			const { group, kind, meta } = ctx;
			const width = /** @type {number} */ (meta.width);
			const rawHeight = /** @type {number} */ (meta.height ?? 0);
			const pages = /** @type {number} */ (meta.pages ?? 1);
			const isAnimated = pages > 1;
			// Con `animated`, sharp concatena los frames: la altura metadata es la
			// suma de todos. El manifest quiere el aspect del frame individual
			// (attrs width/height del <img>, igual que hacía el script Python).
			const height = isAnimated ? Math.round(rawHeight / pages) : rawHeight;
			const stem = basename(sourcePath).replace(/\.[^.]+$/, '');
			const isPng = /\.png$/i.test(sourcePath);
			const publicUrl = kind.publicUrlOf(sourcePath);
			// Carpeta pública del asset: static/generated/images/<stem>/.
			const publicDirUrl = `/generated/images/${stem}`;
			const diskDir = join(generatedDir, 'images', stem);
			await mkdir(diskDir, { recursive: true });

			// Recorta lo pedido al ancho natural: variantes > natural serían
			// duplicados de la anterior o upscales: puro desperdicio.
			const widths = [...new Set(ctx.requestedWidths.filter((w) => w <= width))].sort((a, b) => a - b);

			const variants = [];
			for (const target of widths) {
				await sharp(sourcePath, { failOn: 'none' })
					.resize({ width: target, withoutEnlargement: true })
					.webp({ quality: 85, effort: 6 })
					.toFile(join(diskDir, `${stem}-${target}.webp`));
				variants.push({ width: target, path: `${publicDirUrl}/${stem}-${target}.webp` });
			}

			/** @type {Record<string, unknown>} */
			const entry = {
				src: variants.at(-1)?.path ?? publicUrl,
				srcset: variants.map((v) => `${v.path} ${v.width}w`).join(', '),
				width,
				height
			};
			const largest = /** @type {{ width: number, path: string } | undefined} */ (variants.at(-1));
			// Solo con maestro SERVIDO (static/) y grupo que se beneficia: el
			// original webp conserva detalle en pantallas densas grandes.
			if (
				kind.originalInSrcsetGroups.includes(/** @type {string} */ (group)) &&
				!kind.rawPngInSrcset &&
				!isPng &&
				sourcePath.startsWith(staticDir) &&
				largest &&
				width > largest.width
			) {
				entry.src = publicUrl;
				entry.srcset += `, ${publicUrl} ${width}w`;
			}

			if (isAnimated) {
				// Los stills de arriba son el póster; el loop es un único webp
				// animado a tamaño completo, como el script Python original.
				const loopPath = `${publicDirUrl}/${stem}-animated.webp`;
				await sharp(sourcePath, { animated: true, failOn: 'none' })
					.toColourspace('srgb')
					.webp({ quality: 80, effort: 6 })
					.toFile(join(staticDir, loopPath.slice(1)));
				entry.poster = { src: entry.src, srcset: entry.srcset };
				entry.src = loopPath;
				entry.srcset = '';
			}

			// Poda: variantes anteriores de este asset que el plan nuevo ya no
			// produce (cambio de perfil/override/anchura natural).
			try {
				for (const name of readdirSync(diskDir)) {
					if (!name.startsWith(`${stem}-`) || !name.endsWith('.webp')) continue;
					const wanted =
						widths.some((/** @type {number} */ w) => name === `${stem}-${w}.webp`) ||
					(isAnimated && name === `${stem}-animated.webp`);
					if (!wanted) unlinkSync(join(diskDir, name));
				}
			} catch {
				// nada que podar
			}

			return { url: publicUrl, entry, artifacts: [] };
		}
};

// Modelos 3D de Luna (VRM/GLB/GLTF): optimización de texturas embebidas
// (scripts/optimize-vrm.mjs, validada en navegador) + cifrado .lcx. Los
// maestros viven en assets-private/ (gitignored); el derivado público es
// static/luna/forms/<n>.lcx. No entra al manifest: /luna/forms/ se gestiona
// por convención (scan-asset-references) y la app resuelve el .lcx a partir
// de la URL .vrm/.glb/.gltf. Un .gltf con texturas externas se cifra tal cual:
// sus imágenes no viven dentro del JSON y el repack no aplica.
// VRMA (motion) viaja como está: los accessors Float32 que consume
// three-vrm-animation no tienen alternativa de cuantización segura; el
// cifrado ya está en su sitio y el beneficio medible es nulo.
const vrm = {
	globs: {
		'assets-private/luna/forms': /^.+\.(vrm|glb|gltf)$/i
	},
	groupProfiles: {},
	profileOverrides: {},
	groupOfDir: {},
	publicUrlOf(/** @type {string} */ sourcePath) {
		const name = basename(sourcePath).replace(/\.(vrm|glb|gltf)$/i, '.lcx');
		return `/luna/forms/${name}`;
	},
	rawPngInSrcset: false,
	originalInSrcsetGroups: [],
	async probe(/** @type {string} */ sourcePath) {
		const { parseGlb } = await import('./optimize-vrm.mjs');
		const bytes = readFileSync(sourcePath);
		const external = (/** @type {{ uri?: string }[]} */ json_images) =>
			json_images.filter((/** @type {{ uri?: string }} */ im) => im.uri).length;
		// .gltf es JSON plano: sus imágenes siempre viven fuera (uri o data:).
		if (bytes.subarray(0, 1).toString('ascii').trim() === '{') {
			return { skipped: true, externalTextures: external(JSON.parse(bytes.toString('utf8')).images ?? []) };
		}
		const { json, bin } = parseGlb(bytes);
		if (!bin) return { skipped: true, externalTextures: external(json.images ?? []) };
		const exprs = json.extensions?.VRMC_vrm?.expressions;
		const spring = json.extensions?.VRMC_springBone;
		return {
			images: (json.images ?? []).length,
			textures: (json.textures ?? []).length,
			materials: (json.materials ?? []).length,
			skins: (json.skins ?? []).length,
			morphs: (json.meshes ?? []).reduce(
				(/** @type {number} */ n, /** @type {{ primitives?: { targets?: unknown[] }[] }} */ m) =>
					n + (m.primitives ?? []).reduce(
						(/** @type {number} */ k, /** @type {{ targets?: unknown[] }} */ p) =>
							k + (p.targets?.length ?? 0),
						0
					),
				0
			),
			expressions: exprs
				? Object.keys(exprs.preset ?? {}).length + (exprs.custom ?? []).length
				: (json.extensions?.VRM?.blendShapeMaster?.blendShapeGroups ?? []).length,
			springbones: spring ? (spring.springs ?? []).length + (spring.colliders ?? []).length : 0,
			animations: (json.animations ?? []).length
		};
	},
	async process(
		/** @type {string} */ sourcePath,
		/** @type {import('./asset-kind').AssetProcessContext} */ ctx
	) {
		const { optimizeVrmFile, cipher, OUT_DIR } = await import('./optimize-vrm.mjs');
		const lcxDir = join(staticDir, 'luna', 'forms');
		const name = basename(sourcePath).replace(/\.(vrm|glb|gltf)$/i, '');
		const result = await optimizeVrmFile(sourcePath, { outDir: OUT_DIR, lcxDir });
		if (!result) {
			// Sin ganancia: sirve el original tal cual (misma regla que una
			// textura no optimizable).
			const lcxPath = join(lcxDir, `${name}.lcx`);
			writeFileSync(lcxPath, cipher(readFileSync(sourcePath)));
			return { url: ctx.kind.publicUrlOf(sourcePath), entry: {}, artifacts: [lcxPath] };
		}
		return {
			url: ctx.kind.publicUrlOf(sourcePath),
			entry: {},
			artifacts: [
				join(OUT_DIR, `${name}.vrm`),
				join(OUT_DIR, `${name}.manifest.json`),
				join(OUT_DIR, `${name}.size`),
				join(OUT_DIR, `${name}.sha256`),
				join(lcxDir, `${name}.lcx`)
			]
		};
	}
};

/** @type {Record<string, import('./asset-kind').AssetKind>} */
export const KINDS = { vrm, images };

/** @returns {{ path: string, kind: import('./asset-kind').AssetKind }[]} */
function collectSources() {
	const sources = [];
	for (const kind of Object.values(KINDS)) {
		for (const [dir, match] of Object.entries(kind.globs)) {
			const absolute = join(repoRoot, dir);
			if (!existsSync(absolute)) continue;
			for (const name of readdirSync(absolute)) {
				const matcher = typeof match === 'string' ? new RegExp(match) : match;
				const matched = typeof matcher === 'function' ? matcher(name) : matcher.test(name);
				if (!matched) continue;
				const path = join(absolute, name);
				try {
					if (statSync(path).isFile()) sources.push({ path, kind });
				} catch {
					// carrera con un borrado; el siguiente sync lo recoge
				}
			}
		}
	}
	return sources.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

async function imageMeta(/** @type {string} */ sourcePath) {
	const sharp = (await import('sharp')).default;
	const meta = await sharp(sourcePath, { animated: true, failOn: 'none' }).metadata();
	if (!meta.width || !meta.height) throw new Error(`unreadable image kind: ${sourcePath}`);
	return { width: meta.width, height: meta.height, pages: meta.pages ?? 1 };
}

/** @returns {Record<string, unknown>} */
function readJson(/** @type {string} */ path, /** @type {Record<string, unknown>} */ fallback) {
	try {
		return JSON.parse(readFileSync(path, 'utf8'));
	} catch {
		return fallback;
	}
}

function sha256(/** @type {Buffer} */ buffer) {
	return createHash('sha256').update(buffer).digest('hex');
}

function isManagedPath(/** @type {string} */ path) {
	return MANAGED_DERIVATIVE_DIRS.some((root) => path === root || path.startsWith(root + '/'));
}

/** URLs de derivados gestionados citadas en un entry del manifest. */
function managedDerivativePaths(/** @type {ManifestEntry} */ entry) {
	const urls = new Set();
	const collect = (/** @type {unknown} */ srcset) => {
		for (const part of String(srcset ?? '').split(',')) {
			const url = part.trim().split(' ')[0];
			if (url.startsWith('/')) urls.add(url);
		}
	};
	collect(entry.src);
	collect(entry.srcset);
	if (entry.poster) {
		collect(entry.poster.src);
		collect(entry.poster.srcset);
	}
	return [...urls]
		.map((url) => join(staticDir, url.slice(1)))
		.filter((p) => isManagedPath(p));
}

// Un entry cacheado solo es válido si todo derivado en disco es más nuevo que
// su fuente: detecta maestros revertidos/cambiados sin entrada nueva en caché.
function derivativesFresh(
	/** @type {ManifestEntry} */ entry,
	/** @type {number} */ sourceMtimeMs,
	/** @type {string[]} */ extraArtifacts
) {
	const paths = [...managedDerivativePaths(entry), ...extraArtifacts];
	if (!paths.length) return false;
	return paths.every((/** @type {string} */ p) => {
		try {
			return statSync(p).mtimeMs >= sourceMtimeMs;
		} catch {
			return false;
		}
	});
}

/**
 * Sincroniza derivados optimizados y manifest. Idempotente e incremental.
 * @param {{ force?: boolean, log?: (message: string) => void, onSynced?: () => void }} [options]
 * @returns {Promise<{ changed: boolean, regenerated: number, sources: number }>}
 */
export async function runAssetSync(options = {}) {
	const log = options.log ?? (() => {});
	const force = options.force === true;
	const cache = /** @type {{ engine: number, sources: Record<string, { engine: number, fingerprint: string, url: string, entry: object, plan: string, artifacts: string[] }> }} */ (
		readJson(cachePath, { engine: ENGINE_VERSION, sources: {} })
	);
	if (cache.engine !== ENGINE_VERSION || force) {
		cache.sources = {};
		cache.engine = ENGINE_VERSION;
	}

	const sources = collectSources();
	const manifest = readJson(manifestPath, {});
	/** @type {Record<string, object>} */
	const nextManifest = {};
	const liveSources = new Set(sources.map((s) => s.path));
	let regenerated = 0;
	let changed = false;

	for (const { path: source, kind } of sources) {
		const bytes = readFileSync(source);
		const fingerprint = sha256(bytes);
		const cached = cache.sources[source];
		const group =
			/** @type {string} */
			((kind.groupOfDir ?? {})[relative(repoRoot, dirname(source)).split('\\').join('/')]);
		const profile = (kind.profileOverrides[basename(source)] ?? kind.groupProfiles[group] ?? [480, 960])
			.slice()
			.sort((a, b) => a - b);
		const planHash = sha256(Buffer.from(JSON.stringify({ group, profile, version: ENGINE_VERSION })));
		const cachedArtifacts = cached?.artifacts ?? [];
		if (
			cached &&
			cached.fingerprint === fingerprint &&
			cached.engine === ENGINE_VERSION &&
			cached.plan === planHash &&
			derivativesFresh(cached.entry, statSync(source).mtimeMs, cachedArtifacts)
		) {
			// Rápida: maestro intacto, mismo plan y derivados sanos.
			if (Object.keys(cached.entry).length > 0) nextManifest[cached.url] = cached.entry;
			continue;
		}

		const meta = kind.probe ? await kind.probe(source) : await imageMeta(source);
		// Fuentes que el kind declara fuera de alcance (glTF con texturas
		// externas): quedan en caché para el fingerprint, sin procesar jamás.
		if (meta && (/** @type {Record<string, unknown>} */ (meta)).skipped === true) {
			cache.sources[source] = {
				engine: ENGINE_VERSION,
				fingerprint,
				url: kind.publicUrlOf(source),
				entry: {},
				plan: planHash,
				artifacts: []
			};
			continue;
		}
		const { url, entry, artifacts = [] } = await kind.process(source, { group, kind, meta, requestedWidths: profile });
		cache.sources[source] = { engine: ENGINE_VERSION, fingerprint, url, entry, plan: planHash, artifacts };
		if (Object.keys(entry).length > 0) nextManifest[url] = entry;
		regenerated++;
		changed = true;
		log(`optimized ${url} (${Math.round(bytes.length / 1024)} KiB maestro${artifacts.length ? `, ${artifacts.length} artifacts` : ''})`);
	}

	// Limpieza de manifest: entradas cuyo maestro ya no existe o salió del
	// pipeline → borra también sus derivados gestionados.
	for (const [url, rawEntry] of Object.entries(manifest)) {
		if (nextManifest[url]) continue;
		const entry = /** @type {ManifestEntry} */ (rawEntry);
		const masterCandidates = [
			join(repoRoot, 'assets-src', url.slice(1)),
			join(staticDir, url.slice(1))
		];
		if (masterCandidates.some((p) => liveSources.has(p) || existsSync(p))) continue;
		changed = true;
		log(`removed stale entry ${url}`);
		for (const p of managedDerivativePaths(entry)) await unlink(p).catch(() => {});
	}

	// Cache huérfana fuera; sus artefactos también.
	for (const key of Object.keys(cache.sources)) {
		if (!liveSources.has(key)) {
			for (const p of cache.sources[key].artifacts ?? []) await unlink(p).catch(() => {});
			delete cache.sources[key];
		}
	}

	const serialized = JSON.stringify(nextManifest, null, 2) + '\n';
	if (serialized !== readFileSync(manifestPath, 'utf8')) {
		await mkdir(dirname(manifestPath), { recursive: true });
		writeFileSync(manifestPath, serialized);
		changed = true;
		log(`manifest updated (${Object.keys(nextManifest).length} entries)`);
	}

	// Residuos de layouts anteriores: static/optimized y static/luna/optimized
	// ya no se escriben nunca; todo su contenido era derivado del script. Se
	// eliminan enteras (las nuevas viven en static/generated/, regenerables).
	for (const legacyDir of [join(staticDir, 'optimized'), join(staticDir, 'luna', 'optimized')]) {
		if (existsSync(legacyDir)) rmSync(legacyDir, { recursive: true, force: true });
	}

	// .DS_Store jamás: basura de macOS dentro del árbol servido.
	try {
		for (const name of readdirSync(staticDir)) {
			const p = join(staticDir, name);
			if (name === '.DS_Store') unlinkSync(p);
			else if (statSync(p).isDirectory()) {
				for (const sub of readdirSync(p)) if (sub === '.DS_Store') unlinkSync(join(p, sub));
			}
		}
	} catch {
		// cosmético
	}

	await mkdir(dirname(cachePath), { recursive: true });
	writeFileSync(cachePath, JSON.stringify(cache));
	options.onSynced?.();
	return { changed, regenerated, sources: sources.length };
}

// CLI: node scripts/optimize-assets.mjs [--force]
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const force = process.argv.includes('--force');
	const started = Date.now();
	const result = await runAssetSync({
		force,
		log: (message) => console.log(`[assets] ${message}`)
	});
	console.log(
		`[assets] done: ${result.sources} sources, ${result.regenerated} regenerated, ` +
			`${result.sources - result.regenerated} up to date (${Date.now() - started}ms)`
	);
}
