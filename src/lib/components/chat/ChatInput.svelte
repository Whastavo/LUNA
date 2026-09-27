<script lang="ts">
	import { Icon } from '$lib/components/ui';
	import { sttStore } from '$lib/stores/stt.svelte';
	import { chatDraftStore } from '$lib/stores/chat-draft.svelte';
	import { queueFiles, showVisionHint } from './attach-files';
	import { unlockAudioContext } from '$lib/services/tts';
	import { type PreparedImage } from '$lib/services/storage/keepsakes';
	import AudioVisualizer from './AudioVisualizer.svelte';
	import { pop, fadeFast } from '$lib/utils/motion';

	interface Props {
		onSend: (content: string, images?: PreparedImage[]) => void;
		disabled?: boolean;
		visionCapable?: boolean;
		/** Overlay window: image-showing is disabled (no native file dialog / drop). */
		overlay?: boolean;
		/** Flat row inside the chat window instead of the floating pill. */
		docked?: boolean;
		/** Naked input inside a host surface (the expandable command bar):
		 *  no own glass, full height; pending chips float above the surface. */
		embedded?: boolean;
	}

	let {
		onSend,
		disabled = false,
		visionCapable = true,
		overlay = false,
		docked = false,
		embedded = false
	}: Props = $props();

	let textareaRef = $state<HTMLTextAreaElement | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);

	const isListening = $derived(sttStore.isListening);
	const isTranscribing = $derived(sttStore.isTranscribing);
	const audioLevel = $derived(sttStore.audioLevel);
	const displayTranscript = $derived(sttStore.displayTranscript);

	const hasContent = $derived(
		chatDraftStore.draft.trim().length > 0 ||
			displayTranscript.trim().length > 0 ||
			chatDraftStore.pending.length > 0
	);

	function openPicker() {
		if (overlay) return;
		if (!visionCapable) {
			showVisionHint();
			return;
		}
		fileInput?.click();
	}

	async function handlePicked(files: FileList | null) {
		await queueFiles(files, visionCapable);
		if (fileInput) fileInput.value = '';
	}

	// Single send path: text plus any queued images
	function doSend() {
		if (disabled) return;
		// Inside the gesture, before any await: iOS Safari refuses later
		unlockAudioContext();
		const { text, images } = chatDraftStore.takeAll();
		if (!text && images.length === 0) return;
		onSend(text, images);
		if (textareaRef) textareaRef.scrollLeft = 0;
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		doSend();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			doSend();
		}
	}

	function handleMicClick() {
		unlockAudioContext();
		if (!sttStore.isSupported()) {
			sttStore.showUnsupportedError();
			return;
		}
		if (isListening) {
			sttStore.stopListening();
		} else {
			sttStore.startListening((text) => {
				onSend(text);
			});
		}
	}
</script>

<div class="chat-input" class:docked class:embedded>
	{#if chatDraftStore.pending.length > 0}
		<div class="pending-row" out:fadeFast={{ duration: 150 }}>
			{#each chatDraftStore.pending as p (p.image.id)}
				<div class="pending-chip" in:pop={{ duration: 200, y: 6, scale: 0.9 }} out:fadeFast={{ duration: 120 }}>
					<img src={p.url} alt="Para mostrarle" />
					<button
						type="button"
						class="remove-chip"
						aria-label="Quitar imagen"
						onclick={() => chatDraftStore.removePending(p.image.id)}
					>
						<Icon name="x" size={12} />
					</button>
				</div>
			{/each}
		</div>
	{/if}
	<form class="chat-form" onsubmit={handleSubmit}>
		{#if !overlay}
			<input
				bind:this={fileInput}
				type="file"
				accept="image/*"
				multiple
				style="display:none"
				onchange={(e) => handlePicked(e.currentTarget.files)}
			/>
		{/if}
		<div
			class="input-wrapper glass-chip"
			class:recording={isListening}
			class:transcribing={isTranscribing}
			class:focused={hasContent}
		>
			{#if isTranscribing}
				<div class="transcribing-label">Transcribiendo…</div>
				<button type="button" class="mic-btn recording" disabled aria-label="Transcribiendo">
					<Icon name="loader" size={20} />
				</button>
			{:else if isListening}
				<AudioVisualizer {audioLevel} transcript={displayTranscript} />
				<button
					type="button"
					class="mic-btn recording"
					onclick={() => sttStore.stopListening()}							aria-label="Detener grabación"
							title="Detener grabación"
					>
					<Icon name="stop" size={16} />
				</button>
			{:else}
				{#if !overlay}
					<button
						type="button"
						class="mic-btn"
						class:vision-off={!visionCapable}
						onclick={openPicker}
						aria-label="Adjuntar una imagen"
						title={visionCapable ? 'Adjuntar una imagen' : 'Este modelo no puede ver imágenes'}
					>
						<Icon name="paperclip" size={20} />
					</button>
				{/if}
				<!-- wrap="off" keeps long messages trailing forward on one line
				     instead of stacking; pasted newlines are preserved, just not
				     shown as extra rows -->
				<textarea
					bind:this={textareaRef}
					bind:value={chatDraftStore.draft}
					onkeydown={handleKeydown}
					placeholder="Escríbele a Luna…"
					rows="1"
					wrap="off"
					{disabled}
				></textarea>
				{#if embedded}
					<!-- Primary action: voice while empty, send the moment there is
					     content (text or pending images) — one button, no layout swap -->
					<button
						type="button"
						class="mic-btn primary"
						onclick={() => (hasContent ? doSend() : handleMicClick())}
						aria-label={hasContent ? 'Enviar' : 'Entrada de voz'}
						title={hasContent ? 'Enviar' : 'Entrada de voz'}
					>
						<Icon name={hasContent ? 'send' : 'mic'} size={20} />
					</button>
				{:else}
					<button
						type="button"
						class="mic-btn"
						onclick={handleMicClick}
						aria-label="Entrada de voz"
						title="Entrada de voz"
					>
						<Icon name="mic" size={20} />
					</button>
				{/if}
			{/if}
		</div>
	</form>
</div>

<style>
	/* Fill the bar's flex row; without this the pill collapses to the
	   textarea's intrinsic width */
	.chat-input {
		flex: 1;
		min-width: 0;
	}

	.chat-form {
		flex: 1;
		min-width: 0;
	}

	.pending-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		padding: 0 0.5rem;
	}

	.pending-chip {
		position: relative;
		width: 56px;
		height: 56px;
		cursor: pointer;
		transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.pending-chip:hover {
		transform: scale(1.12) translateY(-3px) rotate(-3deg);
		z-index: 2;
	}

	.pending-chip img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-light);
		box-shadow: var(--shadow-sm);
		transition: box-shadow 0.2s ease, border-color 0.2s ease;
	}

	.pending-chip:hover img {
		border-color: var(--accent);
		box-shadow: var(--shadow-glow);
	}

	.remove-chip {
		position: absolute;
		top: -5px;
		right: -5px;
		width: 19px;
		height: 19px;
		border: 2px solid var(--bg-primary);
		border-radius: var(--radius-full);
		background: var(--color-error);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		box-shadow: var(--shadow-sm);
		opacity: 0;
		transform: scale(0.4);
		transition: opacity 0.16s ease, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.pending-chip:hover .remove-chip {
		opacity: 1;
		transform: scale(1);
	}

	.remove-chip:hover {
		transform: scale(1.2);
	}

	/* Gray input surface, shared by both variants. Fixed height so swapping
	   between typing, listening, and transcribing never resizes the pill */
	.input-wrapper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: var(--radius-full);
		padding: 0.5rem;
		/* 44px buttons + 0.5rem padding either side: the pill's original stature */
		height: 60px;
		transition: box-shadow 0.2s;
		color: var(--chrome-text);
	}

	.input-wrapper:focus-within,
	.input-wrapper.focused {
		box-shadow: 0 0 0 3px var(--chrome-wash-strong), var(--shadow-glow);
	}

	.input-wrapper.recording {
		box-shadow: 0 0 0 3px var(--chrome-wash-strong), var(--shadow-glow);
	}

	.input-wrapper.transcribing {
		box-shadow: 0 0 0 3px var(--chrome-wash-strong), var(--shadow-md);
	}	/* Docked: flat compact row that reads as part of the chat window and
   keeps shrinking gracefully as the window narrows */
	.docked .input-wrapper {
		background: var(--chrome-wash);
		border: none;
		border-radius: var(--radius-md);
		box-shadow: none;
		height: 42px;
		min-width: 0;
		gap: 0.25rem;
		padding: 0.25rem 0.35rem;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
	}

	.docked .input-wrapper:focus-within,
	.docked .input-wrapper.focused,
	.docked .input-wrapper.recording,
	.docked .input-wrapper.transcribing {
		box-shadow: inset 0 0 0 2px var(--chrome-wash-strong);
	}

	.docked .pending-row {
		margin-bottom: 0.35rem;
		padding: 0 0.25rem;
	}

	.transcribing-label {
		flex: 1;
		/* Misma caja que el textarea: sin saltos al entrar/salir del estado */
		display: flex;
		align-items: center;
		align-self: stretch;
		padding: 0 0.5rem;
		font-size: 0.9rem;
		color: var(--text-tertiary);
		font-style: italic;
	}

	textarea {
		flex: 1;
		min-width: 0;
		padding: 0.625rem 0.5rem;
		border: none;
		background: transparent;
		color: var(--chrome-text);
		font-size: 1rem;
		resize: none;
		outline: none;
		font-family: inherit;
		line-height: 1.5;
		height: calc(1.5em + 1rem);
		white-space: nowrap;
		overflow-x: auto;
		overflow-y: hidden;
		scrollbar-width: none;
	}

	textarea::-webkit-scrollbar {
		display: none;
	}

	.docked textarea {
		font-size: 0.875rem;
		padding: 0.375rem 0.4rem;
		height: calc(1.5em + 0.75rem);
	}

	textarea::placeholder {
		color: var(--chrome-text-dim);
	}

	/* Docked inside the chat window: revert to the theme surface */
	.docked .input-wrapper {
		color: var(--text-primary);
	}

	/* Embedded in the expandable surface: the input sits on its OWN subtle
	   surface (wash + rim) so the field reads clearly on top of the host's
	   glass — the clip, placeholder and buttons never dissolve into it. */
	.embedded {
		position: relative;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.embedded .chat-form {
		display: flex;
		align-items: center;
	}

	.embedded .input-wrapper {
		background: transparent;
		border: none;
		box-shadow: none;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
		height: 100%;
		gap: 0.25rem;
		padding: 0.25rem 0.25rem 0.25rem 0;
	}

	.embedded .input-wrapper:focus-within,
	.embedded .input-wrapper.focused,
	.embedded .input-wrapper.recording,
	.embedded .input-wrapper.transcribing {
		box-shadow: none;
	}

	/* Compacto: menos aire entre clip y texto, placeholder alineado con
	   los botones — el composer se lee como UNA fila, no como campos sueltos */
	.embedded textarea {
		font-size: 15px;
		padding: 0.25rem 0.3rem;
	}

	.embedded textarea {
		font-size: 15.5px;
		padding: 0.25rem 0.25rem;
	}

	.embedded textarea::placeholder {
		color: rgba(255, 255, 255, 0.72);
	}

	.embedded .pending-row {
		position: absolute;
		bottom: calc(100% + 10px);
		left: 0;
		right: 0;
		margin: 0;
		padding: 0;
		z-index: 5;
	}

	.docked textarea {
		color: var(--text-primary);
	}

	.docked textarea::placeholder {
		color: var(--text-tertiary);
	}

	textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.mic-btn {
		width: 44px;
		height: 44px;
		border: none;
		border-radius: var(--radius-full);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s, color 0.2s, box-shadow 0.2s, transform 0.15s;
		flex-shrink: 0;
		position: relative;
		background: transparent;
		/* Actionable icons read brighter than the placeholder text */
		color: var(--chrome-text);
	}

	/* Docked inside the chat window: back to theme colors */
	.docked .mic-btn {
		color: var(--text-primary);
	}

	.docked .mic-btn {
		width: 34px;
		height: 34px;
	}

	.docked .pending-chip {
		width: 44px;
		height: 44px;
	}

	.mic-btn:hover:not(:disabled) {
		color: var(--chrome-text);
		background: var(--chrome-wash);
	}

	.mic-btn:active:not(:disabled) {
		transform: scale(0.94);
	}

	.mic-btn.vision-off {
		/* Muted but legible: 0.6 over chrome-text keeps the icon readable
		   in both themes while still reading as unavailable */
		opacity: 0.6;
	}

	.mic-btn.recording {
		background: var(--chrome-wash-strong);
		color: var(--chrome-text);
		animation: recording-pulse 1.6s ease-in-out infinite;
	}

	.mic-btn.recording:hover {
		background: var(--chrome-wash-strong);
		color: var(--chrome-text);
	}

	.mic-btn.recording:disabled {
		opacity: 0.7;
		cursor: wait;
		animation: none;
	}

	/* Filled primary circle: mic when empty, send arrow with content */
	.mic-btn.primary {
		background: var(--accent);
		color: var(--accent-contrast, #fff);
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
	}

	.mic-btn.primary:hover:not(:disabled) {
		background: var(--accent);
		color: var(--accent-contrast, #fff);
		filter: brightness(1.08);
	}

	@keyframes recording-pulse {
		0%, 100% {
			box-shadow: 0 0 0 0 var(--chrome-wash-strong);
		}
		50% {
			box-shadow: 0 0 0 6px transparent;
		}
	}
</style>
