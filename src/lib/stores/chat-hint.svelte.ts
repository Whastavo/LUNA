import { browser } from '$app/environment';

const PRIVACY_ACK_KEY = 'luna-image-privacy-ack';

/**
 * Notificaciones de chat transitorias (sugerencias de imágenes, errores de TTS) más la divulgación
 * de privacidad de fotos de una sola vez. Vive en una tienda para que cualquier superficie de entrada pueda generarlas
 * mientras que BottomChatBar, que siempre está montado, las representa.
 */
function createChatHintStore() {
	let hint = $state<string | null>(null);
	let showPrivacy = $state(false);
	let hintTimer: ReturnType<typeof setTimeout> | null = null;

	function showHint(message: string) {
		hint = message;
		if (hintTimer) clearTimeout(hintTimer);
		hintTimer = setTimeout(() => (hint = null), 6000);
	}

	/** Se muestra una vez, la primera vez que se adjunta una foto, luego se recuerda. */
	function requestPrivacyNotice() {
		if (!browser || localStorage.getItem(PRIVACY_ACK_KEY) === '1') return;
		showPrivacy = true;
	}

	function ackPrivacy() {
		if (browser) localStorage.setItem(PRIVACY_ACK_KEY, '1');
		showPrivacy = false;
	}

	function destroy() {
		if (hintTimer) clearTimeout(hintTimer);
	}

	return {
		get hint() {
			return hint;
		},
		get showPrivacy() {
			return showPrivacy;
		},
		showHint,
		requestPrivacyNotice,
		ackPrivacy,
		destroy
	};
}

export const chatHintStore = createChatHintStore();
