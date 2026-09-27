export interface CameraSettings {
	/** Vertical field of view in degrees */
	fov: number;
	/** Multiplier on the auto-fitted distance: >1 is closer, <1 is farther */
	zoom: number;
	/** Vertical offset in meters added to the auto-fitted look-at target */
	height: number;
	/** Horizontal offset in meters applied to the camera position and target (utsuwa 0.15.0) */
	panX: number;
}

export type CameraProfile = 'main' | 'overlay';
export type ChatDisplayMode = 'bubble' | 'sidebar' | 'both' | 'off';
export type SidebarPosition = 'left' | 'right' | 'center';
export type TextRevealSpeed = 'off' | 'slow' | 'normal' | 'fast';
export type ChatBarAlignment = 'left' | 'center' | 'right';

export const CAMERA_DEFAULTS: CameraSettings = { fov: 35, zoom: 0.85, height: -0.01, panX: 0 };
export const DEFAULT_CHAT_DISPLAY_MODE: ChatDisplayMode = 'bubble';
/* The floating chat window starts CENTERED on desktop — an edge-docked panel
   reads as broken layout ("buttons to the right") unless the user chooses it.
   The snap buttons in its header still allow left/right docking. */
export const DEFAULT_SIDEBAR_POSITION: SidebarPosition = 'center';
export const DEFAULT_WAIT_TONE_ENABLED = false;
export const DEFAULT_TYPING_INDICATOR_DELAY_MS = 0;
export const DEFAULT_TEXT_REVEAL_SPEED: TextRevealSpeed = 'normal';
export const DEFAULT_CHAT_BAR_ALIGNMENT: ChatBarAlignment = 'center';
/** Keep the screen awake while the app is visible (utsuwa 0.15.0). Off by
 * default: it is a battery trade the user must opt into. */
export const DEFAULT_SCREEN_WAKE_LOCK = false;

/** Per-word reveal cadence for each speed; 0 disables the effect. */
export const REVEAL_SPEED_MS: Record<TextRevealSpeed, number> = {
	off: 0,
	slow: 110,
	normal: 60,
	fast: 30
};

export const CAMERA_LIMITS = {
	fov: { min: 20, max: 60 },
	zoom: { min: 0.5, max: 2.5 },
	height: { min: -0.5, max: 0.5 },
	panX: { min: -1.5, max: 1.5 }
} as const;
