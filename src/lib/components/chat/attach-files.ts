import { prepareImage, UnsupportedImageError } from '$lib/services/storage/keepsakes';
import { chatDraftStore } from '$lib/stores/chat-draft.svelte';
import { chatHintStore } from '$lib/stores/chat-hint.svelte';

export const IMAGE_MIME: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	heic: 'image/heic',
	heif: 'image/heif',
	bmp: 'image/bmp'
};

export function imageMimeFromPath(path: string): string | null {
	return IMAGE_MIME[path.split('.').pop()?.toLowerCase() ?? ''] ?? null;
}

export function showVisionHint() {
	chatHintStore.showHint(
		'Este modelo no puede ver imágenes. Elige un modelo con visión (GPT-4o, Claude, Gemini o uno local como llava) en Ajustes.'
	);
}

/**
 * Queue dropped or picked files onto the shared draft. Non-images are
 * skipped; failures surface as hints. Shared by the picker (ChatInput) and
 * both drag-drop paths (BottomChatBar).
 */
export async function queueFiles(files: FileList | File[] | null, visionCapable: boolean) {
	if (!files) return;
	if (!visionCapable) {
		showVisionHint();
		return;
	}
	for (const file of Array.from(files)) {
		if (!file.type.startsWith('image/')) continue;
		try {
			const image = await prepareImage(file);
			chatDraftStore.addPending(image, URL.createObjectURL(file));
			chatHintStore.requestPrivacyNotice();
		} catch (e) {
			chatHintStore.showHint(
				e instanceof UnsupportedImageError
					? 'Ese formato de imagen no es compatible. Prueba con JPEG, PNG, GIF o WebP (las fotos HEIC de iPhone no funcionan).'
					: 'No se pudo leer esa imagen. Prueba con otra.'
			);
		}
	}
}
