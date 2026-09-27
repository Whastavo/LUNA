export type ChatSurfaceView = 'chat' | 'estado' | 'formas' | 'memoria' | 'tablero' | 'camara';

function createChatSurfaceStore() {
	let open = $state(false);
	let view = $state<ChatSurfaceView>('chat');

	function openView(next: ChatSurfaceView) {
		view = next;
		open = true;
	}

	function toggleView(next: ChatSurfaceView) {
		if (open && view === next) {
			open = false;
			view = 'chat';
		} else {
			openView(next);
		}
	}

	function close() {
		open = false;
	}

	return {
		get open() {
			return open;
		},
		get view() {
			return view;
		},
		openView,
		toggleView,
		close
	};
}

export const chatSurface = createChatSurfaceStore();
