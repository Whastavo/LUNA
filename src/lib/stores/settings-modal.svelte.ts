import { browser } from '$app/environment';

// Vistas principales del modal (los grupos del sidebar).
export type SettingsView =
	| 'cuenta'
	| 'plan'
	| 'lunas'
	| 'luna'
	| 'personalidad'
	| 'memoria'
	| 'voz'
	| 'apariencia'
	| 'notificaciones'
	| 'privacidad'
	| 'pantalla'
	| 'llm'
	| 'tts'
	| 'stt'
	| 'datos'
	| 'mcp'
	| 'dev';

// Subvistas que se abren dentro del modal (empujan sobre la principal).
export type SettingsOverlay = 'vestuario' | null;

function createSettingsModalStore() {
	let open = $state(false);
	let view = $state<SettingsView>('cuenta');
	let overlay = $state<SettingsOverlay>(null);
	/** Sección pedida antes de que la app estuviera lista (deep link). */
	let pendingView: SettingsView | null = null;

	/** Abre el modal, opcionalmente directo a una vista. */
	function show(target?: SettingsView) {
		if (target) {
			if (open) {
				view = target;
			} else {
				pendingView = target;
			}
		}
		open = true;
		overlay = null;
	}

	function hide() {
		open = false;
		overlay = null;
	}

	function goTo(next: SettingsView) {
		view = next;
		overlay = null;
	}

	function pushOverlay(which: Exclude<SettingsOverlay, null>) {
		overlay = which;
	}

	function popOverlay() {
		overlay = null;
	}

	/** Consume una vista pendiente (llamar cuando la app ya está lista). */
	function consumePending(): SettingsView | null {
		const pending = pendingView;
		pendingView = null;
		return pending;
	}

	return {
		get open() {
			return open;
		},
		get view() {
			return view;
		},
		get overlay() {
			return overlay;
		},
		show,
		hide,
		goTo,
		pushOverlay,
		popOverlay,
		consumePending
	};
}

export const settingsModal = createSettingsModalStore();

// Escape cierra el modal desde cualquier vista (una sola vez por documento).
if (browser) {
	window.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && settingsModal.open) {
			e.stopPropagation();
			settingsModal.hide();
		}
	});
}
