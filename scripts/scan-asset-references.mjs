// Escanea el código fuente buscando referencias a assets de static/ y lista
// los archivos sin ninguna referencia detectada. Módulo compartido por el
// Asset Optimizer: la limpieza automática NUNCA borra sin este escaneo (y lo
// que no pueda demostrarse, se reporta en vez de borrarse).
//
//   node scripts/scan-asset-references.mjs            # lista huérfanos candidatos
//   node scripts/scan-asset-references.mjs --json     # { referenced: [...], orphans: [...] }
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname, extname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const staticDir = join(repoRoot, 'static');

// Directorios cuyos archivos se referencian por convención, no por URL
// literal: los modelos (.vrm/.glb/.gltf) y animaciones (.vrma) se citan en
// manifests y se cifran a .lcx al vuelo, y las escenas se guardan por ruta
// en datos de usuario (sanitizeSceneBackground acepta cualquier ruta bajo
// /luna/scenes/). Todo lo de ahí se considera en uso.
const CONVENTION_PREFIXES = ['/luna/forms/', '/luna/motion/', '/luna/scenes/', '/luna/poses/'];
const CONVENTION_FILES = new Set(['/robots.txt']);

const TEXT_EXTENSIONS = new Set(['.svelte', '.ts', '.js', '.mjs', '.md', '.json', '.html', '.css', '.svx']);
const SCAN_ROOTS = ['src', 'app.html', 'error.html', 'static', 'README.md', 'DESIGN.md', 'CHANGELOG.md', 'docs', 'tools'];
const ASSET_EXTENSION = /\.(png|jpe?g|webp|avif|svg|gif|ico|woff2?|css|js|json|vrm|vrma|glb|gltf|mp3|ogg|wav|m4a|mp4|webm)$/i;

function* walk(path) {
	const stats = statSync(path);
	if (stats.isFile()) yield path;
	else for (const name of readdirSync(path)) yield* walk(join(path, name));
}

function collectSourceFiles() {
	const files = [];
	for (const entry of SCAN_ROOTS) {
		const absolute = join(repoRoot, entry);
		if (!existsSync(absolute)) continue;
		for (const path of walk(absolute)) {
			if (TEXT_EXTENSIONS.has(extname(path).toLowerCase())) files.push(path);
		}
	}
	return files;
}

/** @returns {Set<string>} URLs de static/ referenciadas en el código. */
export function findReferencedAssetUrls() {
	const referenced = new Set();
	// Sin ancla de comillas: captura también template literals (`${SITE_URL}/...`)
	// y URLs absolutas (https://luna.ai/brand-assets/...). El cruce contra los
	// archivos reales de static/ filtra el ruido.
	const pattern = /\/(?:[a-zA-Z0-9_@-]+\/)*[a-zA-Z0-9_@-]+\.(?:png|jpe?g|webp|avif|svg|gif|ico|woff2?|css|js|json|vrm|vrma|glb|gltf|mp3|ogg|wav|m4a|mp4|webm)/g;
	for (const file of collectSourceFiles()) {
		const text = readFileSync(file, 'utf8');
		for (const match of text.matchAll(pattern)) {
			referenced.add(match[0]);
		}
		// El CSS de static/ usa rutas relativas a su propio directorio
		// (static/fonts/inter.css → inter-latin.woff2 = /fonts/...).
		if (file.startsWith(staticDir)) {
			const dirUrl = '/' + relative(staticDir, dirname(file)).split('\\').join('/');
			const relativeUrlPattern = /url\(\s*['"]?([^'")]+)['"]?\s*\)|['"]([^'"]+\.(?:png|jpe?g|webp|avif|svg|woff2?|gif))['"]/g;
			for (const match of text.matchAll(relativeUrlPattern)) {
				const raw = (match[1] ?? match[2] ?? '').split('?')[0].split('#')[0];
				if (!raw || raw.startsWith('data:') || raw.includes('://') || raw.startsWith('/')) continue;
				referenced.add(posix.normalize(posix.join(dirUrl, raw)));
			}
		}
	}
	// Añade los manifest: claves (URLs originales) y todos sus src/srcset/poster.
	const manifestPath = join(repoRoot, 'src/lib/data/marketing-images.json');
	if (existsSync(manifestPath)) {
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
		const addEntry = (/** @type {Record<string, unknown>} */ entry) => {
			for (const field of ['src', 'srcset']) {
				for (const part of String(entry[field] ?? '').split(',')) {
					const url = part.trim().split(' ')[0];
					if (url.startsWith('/')) referenced.add(url);
				}
			}
			if (entry.poster) addEntry(/** @type {Record<string, unknown>} */ (entry.poster));
		};
		for (const [key, entry] of Object.entries(manifest)) {
			referenced.add(key);
			addEntry(/** @type {Record<string, unknown>} */ (entry));
		}
	}
	return referenced;
}

function listStaticFiles() {
	const files = [];
	if (existsSync(staticDir)) {
		for (const path of walk(staticDir)) {
			if (!path.endsWith('.DS_Store')) files.push('/' + relative(staticDir, path).split('\\').join('/'));
		}
	}
	return files.sort();
}

/** @returns {{ referenced: string[], orphanCandidates: string[], conventionManaged: string[] }} */
export function auditAssetUsage() {
	const referenced = findReferencedAssetUrls();
	const files = listStaticFiles();
	const isConventionManaged = (/** @type {string} */ url) =>
		CONVENTION_PREFIXES.some((p) => url.startsWith(p)) ||
		CONVENTION_FILES.has(url) ||
		url.startsWith('/generated/');
	const orphanCandidates = files.filter((f) => !referenced.has(f) && !isConventionManaged(f));
	const conventionManaged = files.filter(isConventionManaged);
	return { referenced: [...referenced].sort(), orphanCandidates, conventionManaged };
}

// CLI
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const result = auditAssetUsage();
	if (process.argv.includes('--json')) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		console.log(`referenciadas: ${result.referenced.length}`);
		console.log(`gestionadas por convención (VRM/VRMA/escenas): ${result.conventionManaged.length}`);
		console.log(`\nHUÉRFANOS CANDIDATOS (${result.orphanCandidates.length}):`);
		for (const f of result.orphanCandidates) console.log('  ' + f);
	}
}
