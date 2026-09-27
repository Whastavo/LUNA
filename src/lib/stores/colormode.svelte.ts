import { browser } from '$app/environment';
import { getColorMode, setColorMode, type ColorMode } from '$lib/utils/color-mode';

// Wrapper reactivo mínimo sobre color-mode.ts para que las vistas lean y
// cambien el tema con reactividad real (el original es imperativo).
function createColorModeStore() {
	let mode = $state<ColorMode>('system');

	if (browser) {
		mode = getColorMode();
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
			if (mode === 'system') apply();
		});
	}

	function apply() {
		// applyColorMode vive en color-mode.ts; setColorMode lo llama ya.
	}

	return {
		get mode() {
			return mode;
		},
		set(next: ColorMode) {
			mode = next;
			setColorMode(next);
		}
	};
}

export const colorModeStore = createColorModeStore();
