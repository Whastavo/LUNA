/**
 * Screen Wake Lock (funcionalidad de utsuwa 0.15.0). Cuando el usuario lo
 * activa, la pantalla no se suspende mientras la app esté visible. Opt-in:
 * es un costo de batería que el usuario elige. Reporta estado real
 * (unsupported/off/active) para que la UI sea veraz como en 0.15.0.
 */
import { browser } from '$app/environment';

export type WakeStatus = 'unsupported' | 'off' | 'requesting' | 'active';

type WakeLockSentinelLike = {
	release: () => Promise<void>;
	addEventListener: (type: 'release', listener: () => void) => void;
};

type WakeLockApi = {
	request: (type: 'screen') => Promise<WakeLockSentinelLike>;
};

function getWakeLockApi(): WakeLockApi | null {
	if (!browser) return null;
	const nav = navigator as Navigator & { wakeLock?: WakeLockApi };
	return nav.wakeLock ?? null;
}

let sentinel: WakeLockSentinelLike | null = null;
let wanted = false;

/** Last reported status for plain-TS consumers (non-reactive). */
let lastStatus: WakeStatus = 'off';

function setStatus(next: WakeStatus): void {
	lastStatus = next;
	statusListeners.forEach((fn) => fn(next));
}

type StatusListener = (status: WakeStatus) => void;
const statusListeners = new Set<StatusListener>();

/** Subscribe to wake-lock status changes (used by the settings UI). */
export function onWakeStatus(fn: StatusListener): () => void {
	statusListeners.add(fn);
	fn(lastStatus);
	return () => statusListeners.delete(fn);
}

export function getWakeStatus(): WakeStatus {
	return lastStatus;
}

async function acquire(): Promise<void> {
	if (sentinel || !wanted) return;
	const api = getWakeLockApi();
	if (!api) {
		setStatus('unsupported');
		return;
	}
	setStatus('requesting');
	try {
		sentinel = await api.request('screen');
		// The browser releases the lock on tab hide; re-request on return.
		sentinel.addEventListener('release', () => {
			sentinel = null;
			// The browser dropped the lock (tab hidden): honest state, the
			// reapply listener will re-acquire when it returns.
			setStatus('off');
		});
		setStatus('active');
	} catch {
		// Denied or unsupported: surface it honestly, like 0.15.0.
		sentinel = null;
		setStatus('unsupported');
	}
}

function release(): void {
	const current = sentinel;
	sentinel = null;
	setStatus('off');
	if (current) {
		current.release().catch(() => {
			// Already released by the browser.
		});
	}
}

/** Apply the user's preference; safe to call on every change and page show. */
export async function applyScreenWakeLock(enabled: boolean): Promise<void> {
	wanted = enabled;
	if (enabled) {
		await acquire();
	} else {
		release();
	}
}

/** Re-acquire after the page becomes visible again (locks do not survive hide). */
export function reapplyScreenWakeLockIfVisible(): void {
	if (!browser) return;
	if (wanted && document.visibilityState === 'visible' && !sentinel) {
		void acquire();
	}
}
