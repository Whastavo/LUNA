import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { buildAssetOptimizer, devAssetOptimizer } from './vite.config.assets.js';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
	// Auto-optimizes images (and future VRM/audio/video kinds) into
	// static/optimized derivatives on every dev boot, file change and build.
	plugins: [devAssetOptimizer(), buildAssetOptimizer(), sveltekit(), tailwindcss()],
	define: {
		'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
		// True only when the frontend is built by the Tauri CLI (which sets
		// TAURI_ENV_PLATFORM). Baked in at build time so routing decisions never
		// depend on the Tauri globals being injected at runtime.
		__IS_DESKTOP__: JSON.stringify(!!process.env.TAURI_ENV_PLATFORM)
	},
	ssr: {
		noExternal: ['bits-ui']
	}
});
