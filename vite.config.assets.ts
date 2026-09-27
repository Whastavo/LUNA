// Keeps optimized assets in sync during `pnpm dev` and `pnpm build`.
//
// The heavy lifting lives in scripts/optimize-assets.mjs; this plugin just
// drives it at the right moments:
//   - buildStart: full incremental sync before dev/build reads anything, so
//     adding an image outside the app is picked up on the next boot.
//   - dev: Vite's own watcher (extended to the source directories) re-syncs on
//     add/change/unlink and triggers a page reload so the new manifest is
//     served immediately.
// Originals are never modified, unchanged files are skipped via content hashes,
// and new asset kinds plug into the same engine in scripts/optimize-assets.mjs.
import { relative, resolve, sep } from 'node:path';
import { runAssetSync } from './scripts/optimize-assets.mjs';

const repoRoot = resolve(import.meta.dirname);

// Keep in sync with KINDS.*.globs in scripts/optimize-assets.mjs.
const WATCHED_DIRS = [
	'assets-src',
	'assets-private/luna/forms',
	'static/blog',
	'static/marketing',
	'static/luna/visuals'
].map((dir) => resolve(repoRoot, dir));

function isWatchedAsset(filePath: string) {
	return WATCHED_DIRS.some((dir: string) => filePath.startsWith(dir + sep));
}

/** @returns {import('vite').Plugin} */
export function devAssetOptimizer(): import('vite').Plugin {
	let devServer: import('vite').ViteDevServer | null = null;
	let pending: Promise<unknown> | null = null;
	let debounce: ReturnType<typeof setTimeout> | null = null;

	const sync = (reason: string) => {
		// Serialize syncs: watcher bursts must never run concurrently.
		const run = async () => {
			const result = await runAssetSync({
				log: (message) => devServer?.config.logger.info(`assets: ${message}`)
			});
			if (result.changed) {
				devServer?.config.logger.info(`assets: re-synced (${reason}) — reloading manifest consumers`);
				// The manifest is imported by the app; a full reload picks it up.
				devServer?.ws.send({ type: 'full-reload' });
			} else if (reason !== 'boot') {
				devServer?.config.logger.info(`assets: up to date (${reason})`);
			}
		};
		pending = (pending ?? Promise.resolve()).then(run, run);
		return pending;
	};

	const scheduleSync = (reason: string) => {
		if (debounce) clearTimeout(debounce);
		debounce = setTimeout(() => {
			void sync(reason);
		}, 150);
	};

	return {
		name: 'luna-asset-optimizer',
		apply: 'serve',
		async buildStart() {
			await sync('boot');
		},
		configureServer(server) {
			devServer = server;
			// Reuse Vite's chokidar watcher: adding static/ dirs is enough — Vite
			// already ignores only node_modules/.git in the project root.
			for (const dir of WATCHED_DIRS) server.watcher.add(dir);
			for (const event of ['add', 'change', 'unlink']) {
				server.watcher.on(event, (filePath: string) => {
					if (isWatchedAsset(filePath)) scheduleSync(`file ${event}`);
				});
			}
			// Unlinking a source orphans its derivatives; the sync cleans them up.
		}
	};
}

/** @returns {import('vite').Plugin} */
export function buildAssetOptimizer(): import('vite').Plugin {
	return {
		name: 'luna-asset-optimizer-build',
		apply: 'build',
		async buildStart() {
			const started = Date.now();
			const result = await runAssetSync();
			if (result.changed) {
				console.log(`assets: synced ${result.regenerated}/${result.sources} in ${Date.now() - started}ms`);
			}
		}
	};
}
