// Plugin rehype para mdsvex: resuelve <img> de contenido a través del
// manifest del Asset Optimizer. Los posts escriben la URL original
// (/blog/x.png) y el plugin inyecta src/srcset del manifest — el contenido
// nunca cita derivados, así cambiar perfiles no rompe posts.
//
// Uso en svelte.config.js: rehypePlugins: [rehypeSlug, rehypeManifestImages()]
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const manifestPath = resolve(repoRoot, 'src/lib/data/marketing-images.json');

function readManifest() {
	try {
		return JSON.parse(readFileSync(manifestPath, 'utf8'));
	} catch {
		return {};
	}
}

/** @returns {import('unified').Plugin<[], import('hast').Root>} */
export function rehypeManifestImages() {
	const manifest = readManifest();
	return (tree) => {
		const visit = (/** @type {any} */ node) => {
			if (!node || typeof node !== 'object') return;
			if (node.type === 'element' && node.tagName === 'img') {
				const props = node.properties ?? {};
				const src = typeof props.src === 'string' ? props.src : '';
				const entry = manifest[src];
				if (entry) {
					props.src = entry.src;
					props.srcset = entry.srcset || undefined;
					if (!props.sizes) props.sizes = '(max-width: 768px) calc(100vw - 40px), 736px';
					props.width = entry.width;
					props.height = entry.height;
					props.loading = props.loading ?? 'lazy';
					props.decoding = props.decoding ?? 'async';
					node.properties = props;
				}
			}
			for (const child of node.children ?? []) {
				if (child && typeof child === 'object') visit(child);
			}
		};
		visit(tree);
	};
}
