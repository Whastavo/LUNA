<script lang="ts">
	import { Icon, ShimmerLabel } from '$lib/components/ui';
	import { characterStore } from '$lib/stores/character.svelte';
	import { vrmStore } from '$lib/stores/vrm.svelte';
	import { chatStore } from '$lib/stores/chat.svelte';
	import { sttStore } from '$lib/stores/stt.svelte';
	import { ttsStore } from '$lib/stores/tts.svelte';
	import { displayStore } from '$lib/stores/display.svelte';
	import { chatHintStore } from '$lib/stores/chat-hint.svelte';
	import { settingsModal } from '$lib/stores/settings-modal.svelte';
	import { chatSurface, type ChatSurfaceView } from '$lib/stores/chat-surface.svelte';
	import { isTauri } from '$lib/services/platform/platform';
	import { queueFiles, imageMimeFromPath } from './attach-files';
	import { chatDraftStore } from '$lib/stores/chat-draft.svelte';
	import { type PreparedImage } from '$lib/services/storage/keepsakes';
	import ChatInput from './ChatInput.svelte';
	import { renderMarkdown } from './render-markdown';
	import { wrapWordsInHtml } from './reveal-markup';
	import { phaseLabel, type ThinkingPhase } from '$lib/services/chat/chat-phase';
	import { BACKGROUND_PRESETS, presetSwatch } from '$lib/services/scene-backgrounds';
	import {
		REVEAL_SPEED_MS,
		CAMERA_DEFAULTS,
		CAMERA_LIMITS
	} from '$lib/stores/display.svelte';
	import { PHYSICS_INTENSITY_MIN, PHYSICS_INTENSITY_MAX, PHYSICS_INTENSITY_DEFAULT } from '$lib/engine/spring-physics';
	import type { Fact, FactCategory } from '$lib/types/memory';
	import { categoryColors } from '$lib/services/memory-graph';
	import { pop, fadeFast } from '$lib/utils/motion';

	interface Props {
		onSend: (content: string, images?: PreparedImage[]) => void;
		disabled?: boolean;
		visionCapable?: boolean;
		providerLabel?: string;
		providerIsLocal?: boolean;
		/** Overlay window: image-showing is disabled (no native file dialog / drop). */
		overlay?: boolean;
		/** Thinking indicator shown inside the embedded chat view. */
		isTyping?: boolean;
		/** What she's doing this turn, for the shimmer label. */
		phase?: ThinkingPhase;
	}

	let {
		onSend,
		disabled = false,
		visionCapable = true,
		providerLabel = 'tu proveedor de IA',
		providerIsLocal = false,
		overlay = false,
		isTyping = false,
		phase = 'thinking'
	}: Props = $props();

	// Companion mood + stats, shown in the Estado view.
	const moodInfo = $derived(characterStore.moodInfo);
	const charState = $derived(characterStore.state);
	const affectionPercent = $derived(characterStore.affectionPercent);
	const isCompanionMode = $derived(characterStore.appMode === 'companion');

	const datingStats = $derived([
		{ key: 'affection', label: 'Amor', icon: 'heart', value: affectionPercent, color: 'var(--stat-affection)' },
		{ key: 'trust', label: 'Confianza', icon: 'shield', value: charState.trust, color: 'var(--stat-trust)' },
		{ key: 'intimacy', label: 'Intimidad', icon: 'sparkles', value: charState.intimacy, color: 'var(--stat-intimacy)' },
		{ key: 'comfort', label: 'Comodidad', icon: 'home', value: charState.comfort, color: 'var(--stat-comfort)' },
		{ key: 'energy', label: 'Energía', icon: 'zap', value: charState.energy, color: 'var(--stat-energy)' },
		{ key: 'respect', label: 'Respeto', icon: 'award', value: charState.respect, color: 'var(--stat-respect)' }
	]);
	const companionStats = $derived([
		{ key: 'energy', label: 'Energía', icon: 'zap', value: charState.energy, color: 'var(--stat-energy)' },
		{ key: 'chats', label: 'Chats', icon: 'message-circle', value: Math.min(charState.totalInteractions, 100), color: 'var(--stat-trust)' }
	]);
	const stats = $derived(isCompanionMode ? companionStats : datingStats);

	// ── Expandable surface: rail picks the view, the composer row never moves ──
	// Shared store: the messages button in the header opens the chat view here.
	const surfaceOpen = $derived(chatSurface.open);
	const activeView = $derived(chatSurface.view);
	// UNA sola altura abierta: cambiar de vista NUNCA redimensiona la
	// superficie — el panel se siente estable y el contenido se adapta.
	const SURFACE_OPEN_HEIGHT = 360;
	const surfaceHeight = $derived(surfaceOpen ? SURFACE_OPEN_HEIGHT : 64);

	const railItems: { id: ChatSurfaceView; icon: string; tip: string }[] = [
		{ id: 'chat', icon: 'message', tip: 'Chat' },
		{ id: 'estado', icon: 'heart', tip: 'Estado de conexión' },
		{ id: 'formas', icon: 'layers', tip: 'Formas de Luna' },
		{ id: 'memoria', icon: 'brain', tip: 'Memoria' },
		{ id: 'tablero', icon: 'image', tip: 'Cosas que le has mostrado' },
		{ id: 'camara', icon: 'camera', tip: 'Cámara' }
	];

	function toggleView(id: ChatSurfaceView) {
		chatSurface.toggleView(id);
	}

	function closeSurface() {
		chatSurface.close();
	}

	// ── Chat view ──
	let messagesEl: HTMLDivElement | null = $state(null);
	let scrollRaf: number | null = null;

	// Auto-scroll on new messages/typing, collapsed into one rAF like ChatWindow.
	$effect(() => {
		const _msgs = chatStore.messages.length;
		const _typing = isTyping;
		if (surfaceOpen && activeView === 'chat' && messagesEl) {
			if (scrollRaf) cancelAnimationFrame(scrollRaf);
			scrollRaf = requestAnimationFrame(() => {
				scrollRaf = null;
				messagesEl!.scrollTop = messagesEl!.scrollHeight;
			});
		}
		return () => {
			if (scrollRaf) {
				cancelAnimationFrame(scrollRaf);
				scrollRaf = null;
			}
		};
	});

	const lastAssistantId = $derived(
		[...chatStore.messages].reverse().find((m) => m.role === 'assistant')?.id ?? null
	);
	const visibleMessages = $derived(chatStore.messages.filter((m) => m.role !== 'system'));
	const revealCadenceMs = $derived(REVEAL_SPEED_MS[displayStore.textRevealSpeed]);

	function handleClearHistory() {
		if (!confirm('¿Empezar una conversación nueva? Se eliminarán los mensajes de este chat.')) return;
		chatStore.clearMessages();
	}

	// ── Formas view ──
	let formInput = $state<HTMLInputElement | null>(null);

	async function pickForm(id: string) {
		if (vrmStore.activeModelId === id) return;
		await vrmStore.setActiveModel(id);
	}

	async function importForm(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		await vrmStore.addModel(file);
		(e.currentTarget as HTMLInputElement).value = '';
	}

	async function removeForm(id: string) {
		await vrmStore.removeModel(id);
	}

	// ── Tablero view (embedded photoboard) ──
	type BoardItem = { id: string; url: string; isBlobUrl: boolean; createdAt: number; note?: string };
	let boardItems = $state<BoardItem[]>([]);
	let boardLoading = $state(false);

	$effect(() => {
		if (!(surfaceOpen && activeView === 'tablero')) return;
		let cancelled = false;
		let urls: string[] = [];
		boardLoading = true;
		(async () => {
			const { listKeepsakes, getKeepsakeImageUrl } = await import('$lib/services/storage/keepsakes');
			const records = (await listKeepsakes()).filter(
				(r) => r.kind !== 'photo' && r.note !== 'Photo mode'
			);
			const result: BoardItem[] = [];
			for (const r of records) {
				if (r.thumb) {
					result.push({ id: r.id, url: r.thumb, isBlobUrl: false, createdAt: r.createdAt, note: r.note });
				} else {
					const url = await getKeepsakeImageUrl(r.id);
					if (url) {
						urls.push(url);
						result.push({ id: r.id, url, isBlobUrl: true, createdAt: r.createdAt, note: r.note });
					}
				}
			}
			if (cancelled) {
				result.forEach((i) => i.isBlobUrl && URL.revokeObjectURL(i.url));
				return;
			}
			boardItems = result;
			boardLoading = false;
		})();
		return () => {
			cancelled = true;
			boardLoading = false;
			urls.forEach((u) => URL.revokeObjectURL(u));
			urls = [];
			boardItems = [];
		};
	});

	async function forgetKeepsake(id: string) {
		const item = boardItems.find((i) => i.id === id);
		if (item?.isBlobUrl) URL.revokeObjectURL(item.url);
		boardItems = boardItems.filter((i) => i.id !== id);
		const { forgetKeepsakeImage } = await import('$lib/services/storage/keepsakes');
		await forgetKeepsakeImage(id);
	}

	const MONTHS_SHORT_UTC = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;
	function shortDate(ms: number): string {
		const d = new Date(ms);
		return `${d.getUTCDate()} ${MONTHS_SHORT_UTC[d.getUTCMonth()]}`;
	}

	// ── Memoria view: lista compacta propia del panel (no el grafo de
	// settings — ese vive en el modal; aquí solo un vistazo navegable) ──
	const MEM_CATEGORIES: { id: FactCategory; label: string }[] = [
		{ id: 'user', label: 'Usuario' },
		{ id: 'relationship', label: 'Relación' },
		{ id: 'shared_experience', label: 'Compartido' }
	];
	let memoryFacts = $state<Fact[]>([]);
	let memoryLoading = $state(true);
	let memCategory = $state<'all' | FactCategory>('all');

	// Carga perezosa SOLO al abrir la vista; sin tocar el grafo (embeddings
	// ni física) — el listado sale directo de la base local.
	$effect(() => {
		if (!(surfaceOpen && activeView === 'memoria')) return;
		let cancelled = false;
		memoryLoading = true;
		(async () => {
			try {
				const { memoryApi } = await import('$lib/engine/memory');
				const facts = await memoryApi.getFacts(40);
				if (!cancelled) memoryFacts = facts;
			} catch {
				if (!cancelled) memoryFacts = [];
			} finally {
				if (!cancelled) memoryLoading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	const memCounts = $derived.by(() => {
		const counts: Record<string, number> = {
			all: memoryFacts.length,
			user: 0,
			relationship: 0,
			shared_experience: 0
		};
		for (const f of memoryFacts) counts[f.category] = (counts[f.category] ?? 0) + 1;
		return counts;
	});

	// Recientes primero (el orden por importancia del storage sirve para
		// recuperación; para HOJEAR manda la frescura).
	const filteredMemories = $derived.by(() => {
		const list = memCategory === 'all' ? memoryFacts : memoryFacts.filter((f) => f.category === memCategory);
		return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	});

	function toggleMemCategory(id: FactCategory) {
		memCategory = memCategory === id ? 'all' : id;
	}

	// ── Cámara view (embedded camera panel) ──
	let camSection = $state<'encuadre' | 'estilo'>('encuadre');
	const cam = $derived(displayStore.camera);
	const camIsDefault = $derived(
		cam.fov === CAMERA_DEFAULTS.fov &&
			cam.zoom === CAMERA_DEFAULTS.zoom &&
			cam.height === CAMERA_DEFAULTS.height &&
			(cam.panX ?? 0) === CAMERA_DEFAULTS.panX
	);
	// Transparent is a photo-capture concept; the scene picker skips it
	const SCENE_PRESETS = BACKGROUND_PRESETS.filter((p) => !p.photoOnly);

	function toggleMute() {
		if (ttsStore.isSpeaking) ttsStore.stop();
	}

	// Surface voice playback failures; without this a TTS misconfiguration
	// (like a stale voice id after switching providers) looks like she simply
	// chose not to speak.
	$effect(() => {
		if (ttsStore.lastError) chatHintStore.showHint(ttsStore.lastError);
	});

	$effect(() => {
		return () => chatHintStore.destroy();
	});

	// Drag-to-show: the whole window is a drop target. The active flag lives in
	// the draft store so whichever surface is visible shows the affordance.
	let dragDepth = 0;

	function dragHasFiles(e: DragEvent): boolean {
		return !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
	}

	function handleDragEnter(e: DragEvent) {
		if (overlay || !dragHasFiles(e)) return;
		dragDepth++;
		chatDraftStore.setDropActive(true);
	}

	function handleDragOver(e: DragEvent) {
		if (dragHasFiles(e)) e.preventDefault();
	}

	function handleDragLeave(e: DragEvent) {
		if (!dragHasFiles(e)) return;
		dragDepth--;
		if (dragDepth <= 0) {
			dragDepth = 0;
			chatDraftStore.setDropActive(false);
		}
	}

	function handleDrop(e: DragEvent) {
		if (!dragHasFiles(e)) return;
		e.preventDefault();
		dragDepth = 0;
		chatDraftStore.setDropActive(false);
		if (!overlay) queueFiles(e.dataTransfer?.files ?? null, visionCapable);
	}

	// On desktop, Tauri's webview intercepts drag-and-drop so dataTransfer.files
	// is empty (native drag-drop stays on for VRM upload). Read dropped image
	// files via Tauri's own event + the fs plugin, mirroring VrmUploader.
	$effect(() => {
		if (!isTauri() || overlay) return;
		let cancelled = false;
		let unlisten: (() => void) | undefined;
		(async () => {
			const { getCurrentWindow } = await import('@tauri-apps/api/window');
			if (cancelled) return;
			unlisten = await getCurrentWindow().onDragDropEvent(async (event) => {
				if (event.payload.type === 'over') {
					chatDraftStore.setDropActive(true);
				} else if (event.payload.type === 'leave') {
					chatDraftStore.setDropActive(false);
					dragDepth = 0;
				} else if (event.payload.type === 'drop') {
					chatDraftStore.setDropActive(false);
					dragDepth = 0;
					const imagePaths = event.payload.paths.filter((p) => imageMimeFromPath(p));
					if (imagePaths.length === 0) return; // not images (VrmUploader etc. handle those)
					const { readFile } = await import('@tauri-apps/plugin-fs');
					const files: File[] = [];
					for (const path of imagePaths) {
						try {
							const contents = await readFile(path);
							const name = path.split(/[/\\]/).pop() || 'image';
							files.push(new File([contents], name, { type: imageMimeFromPath(path)! }));
						} catch {
							chatHintStore.showHint('No se pudo leer esa imagen. Prueba con otra.');
						}
					}
					if (files.length) await queueFiles(files, visionCapable);
				}
			});
		})();
		return () => {
			cancelled = true;
			unlisten?.();
		};
	});
</script>

{#if sttStore.error}
	<div
		class="stt-error"
		out:pop={{ base: 'translateX(-50%)', y: -10, duration: 200 }}
		onclick={() => sttStore.clearError()}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				sttStore.clearError();
			}
		}}
		role="button"
		tabindex="0"
	>
		<Icon name="alert" size={16} />
		<span>{sttStore.error}</span>
		<button type="button" class="dismiss-btn" aria-label="Descartar">
			<Icon name="x" size={14} />
		</button>
	</div>
{/if}

{#if chatHintStore.hint}
	<div
		class="vision-hint glass-chip"
		role="status"
		aria-live="polite"
		out:pop={{ base: 'translateX(-50%)', y: -10, duration: 200 }}
	>
		<Icon name="camera" size={16} />
		<span>{chatHintStore.hint}</span>
	</div>
{/if}

{#if chatHintStore.showPrivacy}
	<div
		class="privacy-notice"
		out:pop={{ base: 'translateX(-50%)', y: -10, duration: 200 }}
		role="dialog"
		aria-label="Privacidad de fotos"
	>
		<Icon name="camera" size={16} />
		<span>
			{#if providerIsLocal}
				Las fotos que le muestres se quedan en tu máquina — nunca salen de este dispositivo.
			{:else}
				Las fotos que le muestres se envían a {providerLabel} para que pueda verlas. También
				se guardan en este dispositivo; elimínalas cuando quieras desde el tablero.
			{/if}
		</span>
		<button type="button" class="privacy-ack" onclick={() => chatHintStore.ackPrivacy()}>Entendido</button>
	</div>
{/if}

<svelte:window
	ondragenter={handleDragEnter}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
/>

<div
	class="bottom-chat-bar"
	class:dragging={chatDraftStore.dropActive}
	class:align-left={displayStore.chatBarAlignment === 'left'}
	class:align-right={displayStore.chatBarAlignment === 'right'}
>
		{#if chatDraftStore.dropActive}
			<div class="drop-zone" out:fadeFast={{ duration: 120 }}>
				<Icon name="camera" size={22} />
				<span>Suelta una foto para mostrársela</span>
			</div>
		{/if}

		{#if !overlay}
			<div class="surface glass-chip" class:open={surfaceOpen} style:height="{surfaceHeight}px">
				<div class="expansion" aria-hidden={!surfaceOpen}>
					<div class="grid">
						<aside class="rail">
							{#each railItems as item (item.id)}
								<button
									type="button"
									class="rail-btn"
									class:active={activeView === item.id}
									data-tip={item.tip}
									onclick={() => toggleView(item.id)}
									aria-label={item.tip}
									aria-expanded={activeView === item.id}
									tabindex={surfaceOpen ? 0 : -1}
								>
									<Icon name={item.icon} size={19} />
								</button>
							{/each}
						</aside>							<section class="panel">
								<header class="view-head">
									<h2>{activeView === 'chat' ? 'Nueva conversación' : railItems.find((i) => i.id === activeView)?.tip ?? 'Luna'}</h2>
									<div class="head-actions">
										{#if activeView === 'chat'}
											<button
												type="button"
												class="head-btn"
												onclick={handleClearHistory}
												aria-label="Nueva conversación"
												title="Nueva conversación"
												disabled={visibleMessages.length === 0}
											>
												<Icon name="plus" size={14} />
											</button>
										{/if}
									<button type="button" class="head-btn" onclick={closeSurface} aria-label="Cerrar panel">
										<Icon name="x" size={16} />
									</button>
								</div>
							</header>

							{#if surfaceOpen && activeView === 'chat'}
								<div class="view chat-view" bind:this={messagesEl}>
									{#if visibleMessages.length === 0 && !isTyping}
										<div class="chat-empty">
											<span class="chat-empty-icon"><Icon name="message" size={18} /></span>
											<span>Escríbele a Luna — responde aquí.</span>
										</div>
									{:else}
										{#each visibleMessages as msg (msg.id)}
											{@const isLastAssistant = msg.id === lastAssistantId}
											<!-- While she's typing, the shimmer bubble below stands in for the
											     streaming message; rendering partial content would restart the
											     reveal animation on every delta -->
											{#if !(isLastAssistant && isTyping)}
												<div class="msg" class:user={msg.role === 'user'} class:assistant={msg.role === 'assistant'}>
													<div class="bubble">
														{#if isLastAssistant && revealCadenceMs > 0 && msg.content}
															<p style="--reveal-cadence: {revealCadenceMs}ms">
																{@html wrapWordsInHtml(renderMarkdown(msg.content)).html}
															</p>
														{:else}
															<p>{@html renderMarkdown(msg.content)}</p>
														{/if}
													</div>
												</div>
											{/if}
										{/each}
										{#if isTyping}
											<div class="msg assistant">
												<div class="bubble thinking">
													<ShimmerLabel label={phaseLabel(phase)} />
												</div>
											</div>
										{/if}
									{/if}
								</div>
							{:else if surfaceOpen && activeView === 'estado'}
								<div class="view scroll">
									<div class="stat-list">
										{#each stats as stat (stat.key)}
											<div class="stat-row">
												<span class="s-icon" style="color: {stat.color}"><Icon name={stat.icon} size={15} /></span>
												<span class="s-label">{stat.label}</span>
												<span class="s-track"><span class="s-fill" style="width: {stat.value}%; background: {stat.color}"></span></span>
												<span class="s-val">{Math.round(stat.value)}</span>
											</div>
										{/each}
									</div>
									<footer class="stat-foot">
										<span class="foot-stat"><Icon name="calendar" size={12} />{charState.daysKnown}d</span>
										<span class="foot-stat"><Icon name="message-circle" size={12} />{charState.totalInteractions}</span>
										{#if charState.currentStreak > 1}
											<span class="foot-stat streak"><Icon name="flame" size={12} />{charState.currentStreak}</span>
										{/if}
										<button type="button" class="foot-link" onclick={() => settingsModal.show('luna')}>Perfil <Icon name="arrow-right" size={12} /></button>
									</footer>
								</div>
							{:else if surfaceOpen && activeView === 'formas'}
								<div class="view scroll">
									<ul class="form-grid">
										{#each vrmStore.models as model (model.id)}
											<li>
												<button
													type="button"
													class="form-item"
													class:active={vrmStore.activeModelId === model.id}
													onclick={() => pickForm(model.id)}
													aria-label="Activar {model.name}"
												>
													<span class="form-face">
														{#if vrmStore.getModelPortrait(model.id, 'bust')}
															<img src={vrmStore.getModelPortrait(model.id, 'bust')} alt={model.name} />
														{:else}
															<Icon name="user" size={16} />
														{/if}
													</span>
													<span class="form-name">{model.name}</span>
													{#if vrmStore.activeModelId === model.id}
														<span class="form-check"><Icon name="check" size={11} strokeWidth={2.5} /></span>
													{/if}
												</button>
												{#if !model.isDefault}
													<button type="button" class="form-remove" aria-label="Eliminar {model.name}" onclick={() => removeForm(model.id)}>
														<Icon name="x" size={10} />
													</button>
												{/if}
											</li>
										{/each}
										<li>
											<button type="button" class="form-item add" onclick={() => formInput?.click()}>
												<span class="form-face dashed"><Icon name="upload" size={16} /></span>
												<span class="form-name muted">Importar</span>
											</button>
										<input bind:this={formInput} type="file" accept=".vrm,model/gltf-binary" onchange={importForm} hidden />
									</li>
								</ul>
								<p class="form-hint">Importa un archivo .vrm — aparecerá aquí.</p>
								</div>
							{:else if surfaceOpen && activeView === 'memoria'}
								<div class="view mem-view">
									<div class="mem-chips" role="group" aria-label="Filtrar recuerdos">
										<button
											type="button"
											class="mem-chip"
											class:active={memCategory === 'all'}
											onclick={() => (memCategory = 'all')}
										>
											Todos
											<span class="mem-chip-count">{memCounts.all}</span>
										</button>
										{#each MEM_CATEGORIES as cat (cat.id)}
											<button
												type="button"
												class="mem-dot-btn"
												class:active={memCategory === cat.id}
												style:--cat-color={categoryColors[cat.id]}
												title="{cat.label} · {memCounts[cat.id] ?? 0}"
												aria-label="Filtrar por {cat.label} ({memCounts[cat.id] ?? 0})"
												aria-pressed={memCategory === cat.id}
												onclick={() => toggleMemCategory(cat.id)}
											>
												<span class="mem-dot" aria-hidden="true"></span>
											</button>
										{/each}
									</div>

									{#if memoryLoading}
										<div class="mem-empty"><ShimmerLabel label="Recordando…" /></div>
									{:else if filteredMemories.length === 0}
										<div class="mem-empty">
											<Icon name={memCategory === 'all' ? 'brain' : 'sparkles'} size={20} />
											<p class="mem-empty-title">
												{memCategory === 'all' ? 'Todavía no guarda recuerdos' : 'Nada en esta categoría'}
											</p>
											<p class="mem-empty-sub">
												Lo que vivan juntos quedará aquí. Puedes administrarlo todo en Recuerdos.
											</p>
											<button type="button" class="mem-open-settings" onclick={() => settingsModal.show('memoria')}>
												Abrir Recuerdos <Icon name="arrow-right" size={12} />
											</button>
										</div>
									{:else}
										<ul class="mem-list">
											{#each filteredMemories as fact (fact.id)}
												<li class="mem-item">
													<span class="mem-dot" style:--cat-color={categoryColors[fact.category]} aria-hidden="true"></span>
													<span class="mem-content">{fact.content}</span>
													<span class="mem-date">{shortDate(new Date(fact.createdAt).getTime())}</span>
												</li>
											{/each}
										</ul>
									{/if}
								</div>
							{:else if surfaceOpen && activeView === 'tablero'}
								<div class="view board-view scroll">
									{#if boardLoading}
										<div class="board-empty"><span>Cargando…</span></div>
									{:else if boardItems.length === 0}
										<div class="board-empty">
											<Icon name="camera" size={28} />
											<span>Nada en el tablero todavía.</span>
										</div>
									{:else}
										<div class="board-wall">
											{#each boardItems as item (item.id)}
												<div class="board-card" title={item.note ?? ''}>
													<img src={item.url} alt="" loading="lazy" />
													<button type="button" class="board-forget" aria-label="Olvidar esto" onclick={() => forgetKeepsake(item.id)}>
														<Icon name="x" size={11} />
													</button>
													<span class="board-date">{shortDate(item.createdAt)}</span>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{:else if surfaceOpen && activeView === 'camara'}
								<div class="view cam-view">
									<div class="seg-row" role="tablist" aria-label="Secciones de cámara">
										<button type="button" class="seg-btn" class:active={camSection === 'encuadre'} role="tab" aria-selected={camSection === 'encuadre'} onclick={() => (camSection = 'encuadre')}>Encuadre</button>
										<button type="button" class="seg-btn" class:active={camSection === 'estilo'} role="tab" aria-selected={camSection === 'estilo'} onclick={() => (camSection = 'estilo')}>Estilo</button>
										<button type="button" class="cam-reset" onclick={() => displayStore.resetCamera('main')} disabled={camIsDefault} aria-label="Restablecer cámara" title="Restablecer cámara">
											<Icon name="rotate-ccw" size={14} />
										</button>
									</div>
									<div class="cam-group" class:hidden={camSection !== 'encuadre'}>
									<label class="control">
										<span class="control-label">
											Zoom
											<span class="control-value">{cam.zoom.toFixed(2)}×</span>
										</span>
										<input
											type="range"
											min={CAMERA_LIMITS.zoom.min}
											max={CAMERA_LIMITS.zoom.max}
											step="0.05"
											value={cam.zoom}
											oninput={(e) => displayStore.setCamera({ zoom: parseFloat(e.currentTarget.value) })}
										/>
									</label>

									<label class="control">
										<span class="control-label">
											Altura
											<span class="control-value">{cam.height > 0 ? '+' : ''}{(cam.height * 100).toFixed(0)} cm</span>
										</span>
										<input
											type="range"
											min={CAMERA_LIMITS.height.min}
											max={CAMERA_LIMITS.height.max}
											step="0.01"
											value={cam.height}
											oninput={(e) => displayStore.setCamera({ height: parseFloat(e.currentTarget.value) })}
										/>
									</label>

									<label class="control">
										<span class="control-label">
											Lateral
											<span class="control-value">{cam.panX > 0 ? '+' : ''}{(cam.panX * 100).toFixed(0)} cm</span>
										</span>
										<input
											type="range"
											min={CAMERA_LIMITS.panX.min}
											max={CAMERA_LIMITS.panX.max}
											step="0.01"
											value={cam.panX ?? 0}
											oninput={(e) => displayStore.setCamera({ panX: parseFloat(e.currentTarget.value) })}
										/>
									</label>

									<label class="control">
										<span class="control-label">
											Campo de visión
											<span class="control-value">{cam.fov.toFixed(0)}°</span>
										</span>
										<input
											type="range"
											min={CAMERA_LIMITS.fov.min}
											max={CAMERA_LIMITS.fov.max}
											step="1"
											value={cam.fov}
											oninput={(e) => displayStore.setCamera({ fov: parseFloat(e.currentTarget.value) })}
										/>
									</label>

									</div>

									<div class="cam-group" class:hidden={camSection !== 'estilo'}>
									<div class="cam-divider"><span>Fondo</span></div>
									<div class="swatch-row">
										{#each SCENE_PRESETS as preset (preset.id)}
											<button
												class="swatch"
												class:selected={displayStore.sceneBackground.type === preset.bg.type &&
													displayStore.sceneBackground.value === preset.bg.value}
												style:background={presetSwatch(preset)}
												title={preset.label}
												aria-label={`Background: ${preset.label}`}
												onclick={() => displayStore.setSceneBackground(preset.bg)}
											></button>
										{/each}
									</div>

									<div class="cam-divider"><span>Física</span></div>
									<label class="control">
										<span class="control-label">
											Intensidad de movimiento
											<span class="control-value">
												{displayStore.physicsIntensity === PHYSICS_INTENSITY_DEFAULT
													? 'Predeterminada'
													: `${displayStore.physicsIntensity.toFixed(2)}x`}
											</span>
										</span>
										<input
											type="range"
											min={PHYSICS_INTENSITY_MIN}
											max={PHYSICS_INTENSITY_MAX}
											step="0.05"
											value={displayStore.physicsIntensity}
											oninput={(e) => displayStore.setPhysicsIntensity(parseFloat(e.currentTarget.value))}
										/>
										<span class="range-ends" aria-hidden="true">
											<span>Sutil</span>
											<span>Vivo</span>
										</span>
									</label>
									</div>
								</div>
							{/if}
						</section>
					</div>
				</div>

				<div class="composer">
					<button
						type="button"
						class="core"
						class:open={surfaceOpen}
						onclick={() => toggleView(activeView)}
						aria-label={surfaceOpen ? 'Cerrar panel' : 'Abrir panel'}
						aria-expanded={surfaceOpen}
					>
						<Icon name="plus" size={20} />
					</button>
					<ChatInput {onSend} {disabled} {visionCapable} {overlay} embedded />
				</div>
			</div>

			<p class="brand-line">LUNA · WHIZZEND</p>
		{/if}
	</div>

<style>
	.vision-hint {
		position: fixed;
		top: calc(1.25rem + env(safe-area-inset-top, 0));
		left: 50%;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.7rem 1rem;
		max-width: min(420px, 90vw);
		background: var(--chrome-wash-strong);
		color: var(--chrome-text);
		border-radius: var(--radius-lg);
		font-size: 0.82rem;
		font-weight: 600;
		line-height: 1.35;
		z-index: 50;
		box-shadow: var(--shadow-lg);
		animation: hintDrop 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
	}
	.vision-hint :global(svg) { flex-shrink: 0; }
	@keyframes hintDrop {
		from { transform: translate(-50%, -16px) scale(0.96); opacity: 0; }
		to { transform: translate(-50%, 0) scale(1); opacity: 1; }
	}
	/* One-time photo-privacy disclosure (dismissable, light informational card). */
	.privacy-notice {
		position: fixed;
		top: calc(1.25rem + env(safe-area-inset-top, 0));
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 0.75rem 0.7rem 1rem;
		max-width: min(460px, 92vw);
		color: var(--chrome-text);
		border-radius: var(--radius-lg);
		font-size: 0.8rem;
		font-weight: 500;
		line-height: 1.35;
		z-index: 60;
		box-shadow: var(--shadow-lg);
		animation: hintDrop 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
	}
	.privacy-notice :global(svg) { flex-shrink: 0; opacity: 0.65; }
	@media (prefers-reduced-motion: reduce) {
		.vision-hint,
		.privacy-notice {
			animation: none;
		}
	}
	.privacy-ack {
		flex-shrink: 0;
		border: none;
		border-radius: var(--radius-full);
		padding: 0.35rem 0.85rem;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--chrome-text);
		background: var(--chrome-wash-strong);
		cursor: pointer;
		transition: background 0.15s ease;
	}
	.privacy-ack:hover { background: var(--chrome-wash); color: var(--chrome-text); }
	.drop-zone {
		position: absolute;
		left: 1rem;
		right: 1rem;
		top: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		min-height: 52px;
		border-radius: var(--radius-full);
		background: var(--accent-subtle);
		border: 2px dashed var(--accent);
		color: var(--accent);
		font-size: 0.95rem;
		font-weight: 600;
		box-shadow: var(--shadow-sm);
		z-index: 5;
		pointer-events: none;
		overflow: hidden;
		animation: dropPop 0.34s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	.drop-zone :global(svg) {
		animation: dropIcon 0.9s ease-in-out infinite;
	}
	@keyframes dropPop {
		0% { transform: scale(0.8); opacity: 0; }
		100% { transform: scale(1); opacity: 1; }
	}
	@keyframes dropIcon {
		0%, 100% { transform: translateY(0) rotate(0deg); }
		50% { transform: translateY(-4px) rotate(-6deg); }
	}
	.bottom-chat-bar {
		position: fixed;
		bottom: calc(1.25rem + env(safe-area-inset-bottom, 0));
		left: 50%;
		transform: translateX(-50%);
		/* Responsive column: 360px max, fluid down to 280px on small phones */
		width: clamp(280px, calc(100vw - 2rem), 360px);
		z-index: 40;
		display: flex;
		flex-direction: column;
	}

	/* Alignment: pin the bar toward an edge instead of centered */
	.bottom-chat-bar.align-left {
		left: 0;
		transform: none;
	}

	.bottom-chat-bar.align-right {
		left: auto;
		right: 0;
		transform: none;
	}

	/* ── Expandable surface: composer row folded, panel unfolds above it ── */
	.surface {
		position: relative;
		width: 100%;
		height: 64px;
		border-radius: 26px;
		overflow: clip;
		color: var(--chrome-text);
		transition: height 0.34s cubic-bezier(0.18, 0.88, 0.26, 1),
			border-radius 0.34s cubic-bezier(0.18, 0.88, 0.26, 1);
	}

	.surface.open {
		border-radius: 30px;
	}

	.expansion {
		position: absolute;
		inset: 0 0 64px 0;
		opacity: 0;
		visibility: hidden;
		transform: translateY(10px);
		pointer-events: none;
		transition: opacity 0.12s ease, transform 0.22s ease, visibility 0s linear 0.13s;
	}

	.surface.open .expansion {
		opacity: 1;
		visibility: visible;
		transform: none;
		pointer-events: auto;
		transition: opacity 0.18s ease 0.07s, transform 0.27s cubic-bezier(0.16, 1, 0.3, 1) 0.03s,
			visibility 0s;
	}

	.grid {
		display: grid;
		grid-template-columns: 52px 1fr;
		height: 100%;
	}

	.rail {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 10px 7px;
		border-right: 1px solid var(--chrome-border);
		overflow-y: auto;
		scrollbar-width: none;
	}

	/* Con 6 botones el grupo centra; si algún día no cupiera, el padding
	   superior gana (justify-content: safe center en flex moderno) */
	@supports (justify-content: safe center) {
		.rail {
			justify-content: safe center;
		}
	}

	.rail::-webkit-scrollbar {
		display: none;
	}

	.rail::before {
		content: '';
		position: absolute;
		left: 50%;
		top: 14px;
		bottom: 14px;
		width: 1px;
		background: linear-gradient(transparent, var(--chrome-border) 15%, var(--chrome-border) 85%, transparent);
		pointer-events: none;
	}

	.rail-btn {
		position: relative;
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		flex-shrink: 0;
		padding: 0;
		border: none;
		border-radius: 13px;
		background: transparent;
		color: var(--chrome-text-dim);
		cursor: pointer;
		transition: color 0.16s ease, background 0.16s ease;
	}

	.rail-btn:hover,
	.rail-btn:focus-visible {
		color: var(--chrome-text);
		background: var(--chrome-wash);
	}

	.rail-btn:focus-visible {
		outline: none;
	}

	.rail-btn.active {
		color: var(--chrome-text);
		background: var(--chrome-wash-strong);
	}

	.rail-btn.active::before {
		content: '';
		position: absolute;
		left: -7px;
		top: 9px;
		bottom: 9px;
		width: 2px;
		border-radius: 4px;
		background: var(--accent);
	}

	.rail-btn::after {
		content: attr(data-tip);
		position: absolute;
		left: calc(100% + 12px);
		top: 50%;
		transform: translateY(-50%) translateX(-6px);
		opacity: 0;
		pointer-events: none;
		white-space: nowrap;
		padding: 7px 11px;
		border-radius: 11px;
		background: var(--chrome-wash-strong);
		color: var(--chrome-text);
		border: 1px solid var(--chrome-border);
		box-shadow: var(--shadow-lg);
		font-size: 0.65rem;
		font-weight: 650;
		letter-spacing: 0.02em;
		transition: opacity 0.16s ease, transform 0.16s ease;
		z-index: 30;
	}

	.rail-btn:hover::after,
	.rail-btn:focus-visible::after {
		opacity: 1;
		transform: translateY(-50%) translateX(0);
	}

	.panel {
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
	}

	.view-head {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 10px 14px 9px;
		border-bottom: 1px solid var(--chrome-border);
		flex-shrink: 0;
	}

	.view-head h2 {
		margin: 0;
		font-size: 0.92rem;
		font-weight: 700;
		color: var(--chrome-text);
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.head-actions {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex-shrink: 0;
	}

	.head-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		padding: 0;
		border: none;
		border-radius: 10px;
		background: transparent;
		color: var(--chrome-text-dim);
		cursor: pointer;
		transition: color 0.15s ease, background 0.15s ease;
	}

	.head-btn:hover:not(:disabled) {
		color: var(--chrome-text);
		background: var(--chrome-wash);
	}

	.head-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.view {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		padding: 12px 14px 14px;
	}

	.view.scroll {
		overflow-y: auto;
		scrollbar-width: none;
	}

	.view.scroll::-webkit-scrollbar {
		display: none;
	}

	/* ── Chat view ── */
	.chat-view {
		gap: 0.5rem;
		overflow-y: auto;
		scrollbar-width: none;
	}

	.chat-view::-webkit-scrollbar {
		display: none;
	}

	.chat-empty {
		margin: auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.8rem;
		color: var(--chrome-text-dim);
		text-align: center;
	}

	.chat-empty-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
		background: var(--chrome-wash);
		color: var(--chrome-text-dim);
	}

	.msg {
		display: flex;
	}

	.msg.user {
		justify-content: flex-end;
	}

	.msg.assistant {
		justify-content: flex-start;
	}

	.bubble {
		max-width: 85%;
		padding: 0.45rem 0.7rem;
		border-radius: 15px;
		font-size: 0.8125rem;
		line-height: 1.5;
		word-wrap: break-word;
	}

	.msg.user .bubble {
		background: var(--accent);
		color: var(--accent-contrast, white);
		border-bottom-right-radius: 5px;
	}

	.msg.assistant .bubble {
		background: var(--chrome-wash);
		color: var(--chrome-text);
		border-bottom-left-radius: 5px;
	}

	.bubble.thinking {
		padding: 0.5rem 0.8rem;
	}

	.bubble p {
		margin: 0;
	}

	.bubble :global(strong) {
		font-weight: 600;
	}

	.bubble :global(em) {
		font-style: italic;
	}

	.bubble :global(code) {
		font-family: var(--font-mono);
		font-size: 0.875em;
		padding: 0.125rem 0.375rem;
		border-radius: 6px;
		background: color-mix(in srgb, var(--chrome-text), transparent 88%);
	}

	.bubble :global(.reveal-word) {
		opacity: 0;
		animation: word-in 0.24s ease-out forwards;
		animation-delay: calc(var(--word-index) * var(--reveal-cadence, 60ms));
	}

	@keyframes word-in {
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.bubble :global(.reveal-word) {
			animation: none;
			opacity: 1;
		}
	}

	/* ── Estado view ── */
	.stat-list {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.5rem 1.25rem;
	}

	.stat-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.s-icon {
		display: flex;
		flex-shrink: 0;
	}

	.s-label {
		font-size: 0.78rem;
		color: var(--chrome-text);
		width: 4.5rem;
		flex-shrink: 0;
	}

	.s-track {
		flex: 1;
		height: 6px;
		background: var(--chrome-border);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.s-fill {
		display: block;
		height: 100%;
		border-radius: var(--radius-full);
		transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.s-val {
		font-size: 0.72rem;
		color: var(--chrome-text);
		font-variant-numeric: tabular-nums;
		width: 1.75rem;
		text-align: right;
		flex-shrink: 0;
	}

	.stat-foot {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.7rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--chrome-border);
	}

	.foot-stat {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.75rem;
		color: var(--chrome-text-dim);
	}

	.foot-stat.streak {
		color: var(--color-warning);
	}

	.foot-link {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-left: auto;
		border: none;
		background: none;
		padding: 0;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--chrome-text);
		cursor: pointer;
	}

	.foot-link:hover {
		opacity: 0.8;
	}

	/* ── Formas view ── */
	.form-grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
	}

	.form-grid li {
		position: relative;
	}

	.form-item {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		width: 100%;
		padding: 0.35rem 0.3rem 0.4rem;
		border: 1px solid transparent;
		border-radius: 14px;
		background: transparent;
		color: var(--chrome-text);
		cursor: pointer;
		text-align: center;
		transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
	}

	.form-item:hover {
		background: var(--chrome-wash);
	}

	.form-item.active {
		border-color: var(--accent);
		background: var(--chrome-wash);
	}

	.form-item.add:hover .form-face {
		border-color: var(--accent);
		color: var(--accent);
	}

	.form-face {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 52px;
		height: 52px;
		border-radius: var(--radius-full);
		overflow: hidden;
		background: var(--chrome-wash);
		color: var(--chrome-text-dim);
		flex-shrink: 0;
	}

	.form-face.dashed {
		border: 1.5px dashed rgba(255, 255, 255, 0.38);
		background: var(--chrome-wash);
	}

	.form-face img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.form-name {
		font-size: 0.7rem;
		font-weight: 600;
		max-width: 100%;
		/* Reserva de una línea: TODOS los tiles miden igual pase lo que
		   pase con el nombre (Luna, un custom largo, Importar) */
		min-height: 1em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.form-name.muted {
		color: var(--chrome-text-dim);
	}

	.form-hint {
		margin: 0.55rem 0 0;
		text-align: center;
		font-size: 0.68rem;
		color: var(--chrome-text-dim);
	}

	.form-check {
		position: absolute;
		top: 2px;
		right: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 17px;
		height: 17px;
		border-radius: var(--radius-full);
		background: var(--accent);
		color: var(--accent-contrast, #fff);
	}

	.form-remove {
		position: absolute;
		top: -3px;
		right: -3px;
		width: 18px;
		height: 18px;
		padding: 0;
		border: 2px solid var(--chrome-surface, #222);
		border-radius: var(--radius-full);
		background: var(--color-error);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: var(--shadow-sm);
	}

	/* ── Memoria view: lista compacta propia del panel ── */
	.mem-view {
		gap: 0.55rem;
		padding: 10px 12px 12px;
	}

	.mem-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		flex-shrink: 0;
	}

	.mem-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.28rem 0.6rem;
		border: 1px solid var(--chrome-border);
		border-radius: var(--radius-full);
		background: transparent;
		color: var(--chrome-text-dim);
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
		transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
	}

	.mem-chip:hover {
		color: var(--chrome-text);
		background: var(--chrome-wash);
	}

	.mem-chip.active {
		color: var(--chrome-text);
		background: var(--chrome-wash-strong);
		border-color: transparent;
	}

	.mem-dot {
		width: 7px;
		height: 7px;
		border-radius: var(--radius-full);
		background: var(--cat-color, var(--chrome-text-dim));
		flex-shrink: 0;
	}

	.mem-chip-count {
		font-size: 0.64rem;
		font-variant-numeric: tabular-nums;
		opacity: 0.65;
	}

	/* Filtros de categoría: SOLO puntos de color — el color YA es la
	   etiqueta (igual que el grafo); el texto repetido era ruido. */
	.mem-dot-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		padding: 0;
		border: none;
		border-radius: var(--radius-full);
		background: transparent;
		cursor: pointer;
		transition: background 0.15s ease, box-shadow 0.15s ease;
	}

	.mem-dot-btn .mem-dot {
		width: 9px;
		height: 9px;
		opacity: 0.45;
		transition: opacity 0.15s ease, transform 0.15s ease;
	}

	.mem-dot-btn:hover {
		background: var(--chrome-wash);
	}

	.mem-dot-btn:hover .mem-dot {
		opacity: 0.8;
	}

	.mem-dot-btn.active {
		background: var(--chrome-wash-strong);
	}

	.mem-dot-btn.active .mem-dot {
		opacity: 1;
		transform: scale(1.15);
	}

	.mem-list {
		list-style: none;
		margin: 0;
		padding: 2px 2px 2px 0;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		scrollbar-width: none;
		border-top: 1px solid var(--chrome-border);
	}

	.mem-list::-webkit-scrollbar {
		display: none;
	}

	.mem-item {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		padding: 0.48rem 0.3rem;
		border-bottom: 1px solid var(--chrome-border);
		font-size: 0.78rem;
		line-height: 1.4;
		color: var(--chrome-text);
	}

	.mem-item .mem-dot {
		align-self: center;
	}

	.mem-content {
		flex: 1;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.mem-date {
		flex-shrink: 0;
		font-size: 0.64rem;
		color: var(--chrome-text-dim);
		font-variant-numeric: tabular-nums;
	}

	.mem-empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		color: var(--chrome-text-dim);
		text-align: center;
		padding: 0 1rem 0.5rem;
	}

	.mem-empty :global(svg) {
		opacity: 0.55;
		margin-bottom: 0.2rem;
	}

	.mem-empty-title {
		margin: 0;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--chrome-text);
	}

	.mem-empty-sub {
		margin: 0;
		font-size: 0.72rem;
		line-height: 1.45;
		max-width: 240px;
	}

	.mem-open-settings {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin-top: 0.45rem;
		padding: 0.38rem 0.8rem;
		border: none;
		border-radius: var(--radius-full);
		background: var(--chrome-wash-strong);
		color: var(--chrome-text);
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease;
	}

	.mem-open-settings:hover {
		background: var(--chrome-wash);
		color: var(--chrome-text);
	}

	/* ── Tablero view ── */
	.board-view {
		gap: 0.5rem;
	}

	.board-empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		color: var(--chrome-text-dim);
		font-size: 0.8rem;
		text-align: center;
	}

	.board-wall {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
		gap: 0.6rem 0.5rem;
	}

	.board-card {
		position: relative;
	}

	.board-card img {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 10px;
		border: 1px solid var(--chrome-border);
	}

	.board-date {
		display: block;
		margin-top: 0.2rem;
		text-align: center;
		font-size: 0.62rem;
		color: var(--chrome-text-dim);
	}

	.board-forget {
		position: absolute;
		top: -5px;
		right: -5px;
		width: 18px;
		height: 18px;
		padding: 0;
		border: 2px solid var(--chrome-surface, #222);
		border-radius: var(--radius-full);
		background: var(--color-error);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		opacity: 0;
		transform: scale(0.6);
		transition: opacity 0.15s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.board-card:hover .board-forget,
	.board-forget:focus-visible {
		opacity: 1;
		transform: scale(1);
	}

	/* ── Cámara view: segmented + grupos ── */
	.cam-view {
		gap: 0.65rem;
		overflow-y: auto;
		scrollbar-width: none;
	}

	.cam-view::-webkit-scrollbar {
		display: none;
	}

	.seg-row {
		display: grid;
		grid-template-columns: 1fr 1fr 34px;
		gap: 3px;
		padding: 3px;
		border-radius: 12px;
		background: var(--chrome-wash);
		flex-shrink: 0;
		align-items: center;
	}

	.seg-btn {
		padding: 0.38rem 0.5rem;
		border: none;
		border-radius: 9px;
		background: transparent;
		color: var(--chrome-text-dim);
		font-size: 0.74rem;
		font-weight: 600;
		cursor: pointer;
		transition: color 0.15s ease, background 0.15s ease;
	}

	.seg-btn:hover {
		color: var(--chrome-text);
	}

	.seg-btn.active {
		color: var(--chrome-text);
		background: var(--chrome-wash-strong);
	}

	.cam-group {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.cam-group.hidden {
		display: none;
	}

	.control {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		flex-shrink: 0;
	}

	.control-label {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--chrome-text-dim);
	}

	.control-value {
		color: var(--chrome-text);
		font-variant-numeric: tabular-nums;
	}

	.control input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 4px;
		border-radius: 2px;
		/* La LÍNEA del slider: un valor literal, no var() — el track es
		   pintado por el engine y un token inválido lo deja invisible. */
		background: rgba(255, 255, 255, 0.28);
		box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.18);
		outline: none;
		cursor: pointer;
	}

	.control input[type='range']::-moz-range-track {
		height: 4px;
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.28);
	}

	.control input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 15px;
		height: 15px;
		border-radius: 50%;
		/* White thumb on glass — the slider knob is light, never ink */
		background: rgba(255, 255, 255, 0.92);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
		border: none;
		cursor: pointer;
		transition: transform 0.15s ease;
	}

	.control input[type='range']::-webkit-slider-thumb:hover {
		transform: scale(1.15);
	}

	.control input[type='range']::-moz-range-thumb {
		width: 15px;
		height: 15px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.92);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
		border: none;
	}

	.cam-reset {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		padding: 0;
		border: none;
		border-radius: var(--radius-full);
		background: transparent;
		color: var(--chrome-text-dim);
		cursor: pointer;
		transition: color 0.15s ease, background 0.15s ease;
	}

	.cam-reset:hover:not(:disabled) {
		color: var(--chrome-text);
		background: var(--chrome-wash);
	}

	.cam-reset:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.cam-divider {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--chrome-text-dim);
	}

	.cam-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--chrome-border);
	}

	.range-ends {
		display: flex;
		justify-content: space-between;
		font-size: 0.6875rem;
		color: var(--chrome-text-dim);
	}

	.swatch-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.swatch {
		width: 24px;
		height: 24px;
		border-radius: var(--radius-full);
		/* White ring that reads on glass — never a dark halo */
		border: 2px solid rgba(255, 255, 255, 0.28);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
		cursor: pointer;
		transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.swatch:hover {
		transform: scale(1.1);
	}

	.swatch.selected {
		border-color: rgba(255, 255, 255, 0.85);
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.2),
			0 1px 4px rgba(0, 0, 0, 0.18);
	}

	.composer {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 64px;
		padding: 0 10px 0 8px;
		display: flex;
		align-items: center;
		gap: 8px;
		border-top: 1px solid transparent;
		transition: border-color 0.2s ease;
	}

	.surface.open .composer {
		border-top-color: var(--chrome-border);
	}

	.core {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		flex-shrink: 0;
		padding: 0;
		border: none;
		border-radius: var(--radius-full);
		background: transparent;
		color: var(--chrome-text-dim);
		cursor: pointer;
		transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), color 0.15s ease, background 0.15s ease;
	}

	.core:hover {
		color: var(--chrome-text);
		background: var(--chrome-wash);
	}

	/* Un solo icono: el '+' gira 45° y se lee como '×' — morf limpio, sin cambio de glifo */
	.core.open {
		color: var(--chrome-text);
		transform: rotate(45deg);
	}

	.composer :global(.chat-input) {
		height: 100%;
	}

	.brand-line {
		margin: 0.85rem 0 0;
		text-align: center;
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.35em;
		color: var(--chrome-text-dim);
		user-select: none;
	}

	@media (max-width: 640px) {
		.bottom-chat-bar {
			bottom: 0.9rem;
		}

		.surface.open {
			border-radius: 30px;
		}

		.stat-list {
			grid-template-columns: 1fr;
		}
	}

	.stt-error {
		position: fixed;
		top: 4.5rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		width: fit-content;
		max-width: 600px;
		background: var(--color-error);
		border: 1px solid transparent;
		border-radius: var(--radius-lg);
		color: #fff;
		font-size: 0.875rem;
		cursor: pointer;
		z-index: 50;
		animation: slideDownShake 0.5s ease-out;
		box-shadow: var(--shadow-lg);
	}

	@keyframes slideDownShake {
		0% {
			opacity: 0;
			transform: translateX(-50%) translateY(-8px);
		}
		30% {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
		45% {
			transform: translateX(calc(-50% + 6px)) translateY(0);
		}
		60% {
			transform: translateX(calc(-50% - 5px)) translateY(0);
		}
		75% {
			transform: translateX(calc(-50% + 3px)) translateY(0);
		}
		90% {
			transform: translateX(calc(-50% - 2px)) translateY(0);
		}
		100% {
			transform: translateX(-50%) translateY(0);
		}
	}

	.stt-error span {
		flex: 1;
		word-wrap: break-word;
	}

	.dismiss-btn {
		background: rgba(255, 255, 255, 0.2);
		border: none;
		padding: 0.25rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		color: white;
		opacity: 0.9;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
	}

	.dismiss-btn:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.3);
	}
</style>
