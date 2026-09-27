import { browser } from '$app/environment';
import type { VRM } from '@pixiv/three-vrm';
import localforage from 'localforage';
import { isTauri } from '$lib/services/platform/platform';
import { createTempVrmStoreIntegration } from '$lib/utils/temp-vrm-store';
import type { TouchZone } from '$lib/engine/photo-reactions';

export interface VrmModel {
	id: string;
	name: string;
	url: string;
	previewUrl?: string;
	/** Retrato vertical de alta resolución para el rail de Cuenta. Si no
	 *  existe (Nova/Vela/customs), la captura de sesión del canvas lo suple. */
	portraitUrl?: string;
	isDefault: boolean;
	createdAt: number;
}

// Luna's visual forms bundled with the app (first one is loaded by default).
// Each form is the same character: the id is the stable technical identity and
// `name` es el nombre visible. Las licencias de cada forma viven en
// assets-private/luna/forms/README.md (los originales nunca se despliegan).
const DEFAULT_MODELS: VrmModel[] = [
	{
		id: 'luna',
		name: 'Luna',
		url: '/luna/forms/luna.vrm',
		// Previews ESTÁTICOS servidos con la app: nada de auto-generación en
		// runtime (costo de GPU al arrancar y dependencia de WebGL). El
		// preview es el BUSTO oficial (misma composición que Nova/Vela): es
		// el respaldo de avatares y miniaturas. Los renders viven en
		// assets-private/luna/renders como fuente.
		previewUrl: '/luna/faces/luna.png',
		// Retrato del rail: el render de figura completa (upscaled a
		// 1096x2532) — su composición oficial para el panel de Cuenta.
		portraitUrl: '/luna/visuals/luna-grace.png',
		isDefault: true,
		createdAt: 0
	},
	{
		id: 'luna-nova',
		name: 'Nova',
		url: '/luna/forms/luna-nova.vrm',
		previewUrl: '/luna/faces/luna-nova.png',
		isDefault: true,
		createdAt: 0
	},
	{
		id: 'luna-vela',
		name: 'Vela',
		url: '/luna/forms/luna-vela.vrm',
		previewUrl: '/luna/faces/luna-vela.png',
		isDefault: true,
		createdAt: 0
	}
];

// Bumped when thumbnail generation changes so stale previews regenerate
const PREVIEW_KEY_PREFIX = 'model-preview-v2-';

// Retratos persistidos (busto + figura completa) por modelo. Versión v4:
// composición final (fondo + pecho) — cambiarla invalida las guardadas y
// fuerza UNA recaptura fresca.
const PORTRAIT_KEY_PREFIX = 'model-portrait-v4-';

// Configure localforage for VRM storage
const vrmStorage = browser
	? localforage.createInstance({
			name: 'luna-vrm',
			storeName: 'models'
		})
	: null;

function createVrmStore() {
	// Current model state. OPTIMISTIC BOOT: assume the default form is active
	// SYNCHRONOUSLY, so the viewer starts fetching/streaming the 18MB VRM in
	// the very first module-evaluation frame — the browser serves it from the
	// HTTP cache warmed by app.html's preload. initFromStorage corrects this
	// moments later ONLY if the user's saved active model differs (a rare
	// swap; the loader's invalidation handles it cleanly).
	let modelUrl = $state<string | null>(DEFAULT_MODELS[0].url);

	// Retratos de SESIÓN: la foto capturada del personaje activo al activar
	// una forma — las TRES se capturan igual (Luna incluida: nada de imagen
	// fija de bundle como retrato del rail). SOLO memoria — no persisten: la
	// captura se regenera gratis en cada carga (copia 2D del frame vivo).
	// Los portraitUrl/previewUrl servidos quedan como respaldo de los
	// primeros instantes, antes de que aterrice la captura.
	// DOS composiciones por forma, recortes del MISMO frame: 'bust' (primer
	// plano hombro-arriba, anclado a la cabeza proyectada) y 'full' (figura
	// completa del encuadre vivo — la del rail de Cuenta).
	let sessionPortraits = $state<Record<string, string>>({});
	let sessionFullPortraits = $state<Record<string, string>>({});
	// Huella (hash muestreado) del VRM del que proviene cada retrato: si el
	// archivo del modelo cambia, el retrato viejo se invalida y se recaptura.
	let sessionPortraitHashes = $state<Record<string, string>>({});
	let vrm = $state<VRM | null>(null);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let errorTimeout: ReturnType<typeof setTimeout> | null = null;

	// Gallery state
	let models = $state<VrmModel[]>([...DEFAULT_MODELS]);
	let activeModelId = $state<string | null>(DEFAULT_MODELS[0].id);

	// Available expressions on current model (persists across navigation)
	let availableExpressions = $state<string[]>([]);

	// ── Temporary model (for Developer Tools preview) ──
	// Kept in memory only; never persisted to storage.
	const tempVrm = createTempVrmStoreIntegration();
	let tempModelActive = $state(false);
	let tempModelLoading = $state(false);
	let tempModelLoadError = $state(false);

	// Reactive bridge between the integration helper and the store's $state.
	const tempState = {
		get modelUrl() {
			return modelUrl;
		},
		set modelUrl(value: string | null) {
			modelUrl = value;
		},
		get activeModelId() {
			return activeModelId;
		},
		set activeModelId(value: string | null) {
			activeModelId = value;
		},
		get availableExpressions() {
			return availableExpressions;
		},
		set availableExpressions(value: string[]) {
			availableExpressions = value;
		},
		get tempModelActive() {
			return tempModelActive;
		},
		set tempModelActive(value: boolean) {
			tempModelActive = value;
		},
		get tempModelLoading() {
			return tempModelLoading;
		},
		set tempModelLoading(value: boolean) {
			tempModelLoading = value;
		},
		get tempModelLoadError() {
			return tempModelLoadError;
		},
		set tempModelLoadError(value: boolean) {
			tempModelLoadError = value;
		}
	};

	// Animation state
	let currentAnimation = $state<string | null>(null);

	// Talking animation state (triggered by text output)
	let isTalking = $state(false);
	let talkingTimeout: ReturnType<typeof setTimeout> | null = null;

	// Tap reactions: the scene raycasts a tap into a touch zone and the model
	// component applies the staged reaction. Universal, not photo-mode-only.
	let reactionRequest = $state<{ zone: TouchZone; seq: number } | null>(null);
	let reactionSeq = 0;
	function requestReaction(zone: TouchZone) {
		reactionRequest = { zone, seq: ++reactionSeq };
	}

	// Head position for 3D speech bubble positioning
	let headPosition = $state<[number, number, number]>([0, 1.6, 0]);
	// Screen-space position (x, y as percentages 0-100)
	let headScreenPosition = $state<{ x: number; y: number } | null>(null);
	// Default motion clips
	const idleAnimationUrl = '/luna/motion/luna-rest.vrma';
	const talkingAnimationUrl = '/luna/motion/luna-speak.vrma';

	// All idle motions for random cycling
	const idleAnimationUrls = [
		'/luna/motion/luna-rest.vrma',
		'/luna/motion/luna-drift.vrma',
		'/luna/motion/luna-breathe.vrma',
		'/luna/motion/luna-sway.vrma',
		'/luna/motion/luna-flow.vrma'
	];

	// Selectable one-shot emotes (played via the developer tools). These are the
	// VRMA clips shipped in static/luna/motion/ that aren't part of the idle cycle
	// or the talking loop.
	const availableAnimations: { id: string; name: string; url: string }[] = [
		{ id: 'luna-present', name: 'Presentar', url: '/luna/motion/luna-present.vrma' },
		{ id: 'luna-wave', name: 'Saludar', url: '/luna/motion/luna-wave.vrma' },
		{ id: 'luna-peace', name: 'Paz', url: '/luna/motion/luna-peace.vrma' },
		{ id: 'luna-point', name: 'Señalar', url: '/luna/motion/luna-point.vrma' },
		{ id: 'luna-glow', name: 'Brillo', url: '/luna/motion/luna-glow.vrma' },
		{ id: 'luna-pulse', name: 'Pulso', url: '/luna/motion/luna-pulse.vrma' },
		{ id: 'luna-spark', name: 'Chispa', url: '/luna/motion/luna-spark.vrma' }
	];

	// Guard against saveToStorage running before init completes
	let storageReady = false;
	// Lets consumers wait for init so they don't act on pre-restore state
	let readyResolve: (() => void) | null = null;
	const ready = new Promise<void>((resolve) => {
		readyResolve = resolve;
	});
	// Prevents re-emitting sync events when handling incoming ones
	let isSyncing = false;
	// Held so the handler can be released (HMR re-runs this module in dev;
	// without it each run would stack another duplicate listener)
	let modelChangedUnlisten: Promise<(() => void) | undefined> | null = null;

	// Initialize from storage (may override defaults with saved values)
	if (browser) {
		initFromStorage();

		// Sync model changes from other Tauri windows
		if (isTauri()) {
			modelChangedUnlisten = import('@tauri-apps/api/event').then(({ listen }) =>
				listen('vrm:model-changed', async () => {
					// Drop events that arrive while a sync is already running
					if (isSyncing) return;
					isSyncing = true;
					try {
						await syncActiveModel();
					} finally {
						isSyncing = false;
					}
				})
			);
		}

		if (import.meta.hot) {
			import.meta.hot.dispose(() => {
				modelChangedUnlisten?.then((unlisten) => unlisten?.());
				modelChangedUnlisten = null;
			});
		}
	}

	async function initFromStorage() {
		try {
			// FAST PATH: resolve the active model URL with ONE storage round-trip
			// when it's a default (static URL) — the avatar starts streaming
			// immediately. Gallery metadata below enriches the picker afterward
			// and must never gate the model's first frame.
			const savedActiveId = await vrmStorage?.getItem<string>('active-model-id');
			if (savedActiveId && DEFAULT_MODELS.some((m) => m.id === savedActiveId)) {
				activeModelId = savedActiveId;
				modelUrl = DEFAULT_MODELS.find((m) => m.id === savedActiveId)!.url;
			}

			// Load saved models list
			const savedModels = await vrmStorage?.getItem<VrmModel[]>('model-list');
			if (savedModels && savedModels.length > 0) {
				const customModels = savedModels.filter((m) => !m.isDefault);

				// Load all blobs concurrently; users with several custom models were
				// paying one storage round-trip per model at boot
				const blobs = await Promise.all(
					customModels.map((model) => vrmStorage?.getItem<Blob>(`model-blob-${model.id}`))
				);
				const restored: VrmModel[] = [];
				customModels.forEach((model, i) => {
					const blob = blobs[i];
					// Regenerate blob URL from stored blob data
					if (blob) {
						restored.push({
							...model,
							url: URL.createObjectURL(blob)
						});
					}
					// If blob is missing, skip this model (unrecoverable)
				});

				models = [...DEFAULT_MODELS, ...restored];
			}					// Restore preview thumbnails for all models (also concurrent).
					// Los default SIEMPRE arrancan con su render estático servido con
					// la app — solo los customs restauran su preview persistido.
					const previews = await Promise.all(
						models.map((model) => vrmStorage?.getItem<string>(`${PREVIEW_KEY_PREFIX}${model.id}`))
					);
					const isDefault = (id: string) => DEFAULT_MODELS.some((d) => d.id === id);
					models = models.map((model, i) =>
						previews[i] && !isDefault(model.id) ? { ...model, previewUrl: previews[i]! } : model
					);

					// Retratos persistidos (busto + figura completa) de TODAS las
					// formas: reviven como retratos de sesión. Así el arranque NO
					// muestra el respaldo del bundle y luego cambia (el flash que
					// se veía al abrir perfiles), y VrmModel NO recaptura (cero
					// costo de GPU al cargar). Restore concurrente, tolerante a
					// claves ausentes.
					const [busts, fulls, hashes] = await Promise.all([
						Promise.all(
							models.map((model) =>
								vrmStorage?.getItem<string>(`${PORTRAIT_KEY_PREFIX}${model.id}`)
							)
						),
						Promise.all(
							models.map((model) =>
								vrmStorage?.getItem<string>(`${PORTRAIT_KEY_PREFIX}full-${model.id}`)
							)
						),
						Promise.all(
							models.map((model) =>
								vrmStorage?.getItem<string>(`${PORTRAIT_KEY_PREFIX}hash-${model.id}`)
							)
						)
					]);
					const bustsRestaurados: Record<string, string> = {};
					const fullsRestaurados: Record<string, string> = {};
					const hashesRestaurados: Record<string, string> = {};
					models.forEach((model, i) => {
						if (busts[i]) bustsRestaurados[model.id] = busts[i]!;
						if (fulls[i]) fullsRestaurados[model.id] = fulls[i]!;
						if (hashes[i]) hashesRestaurados[model.id] = hashes[i]!;
					});
					sessionPortraits = bustsRestaurados;
					sessionFullPortraits = fullsRestaurados;
					sessionPortraitHashes = hashesRestaurados;

					// Migración: purga de retratos de versiones anteriores (sus
					// composiciones ya no aplican y solo ocupan storage).
					try {
						const todas = await vrmStorage?.keys();
						await Promise.all(
							(todas ?? [])
								.filter((k) => k.startsWith('model-portrait-v') && !k.startsWith(PORTRAIT_KEY_PREFIX))
								.map((k) => vrmStorage?.removeItem(k))
						);
					} catch {
						// La purga es higiénica, nunca crítica
					}

			// Slow path: custom active model (or no saved id) — resolve from the
			// now-loaded gallery. The fast path above already handled defaults.
			if (!modelUrl) {
				if (savedActiveId) {
					const activeModel = models.find((m) => m.id === savedActiveId);
					if (activeModel) {
						activeModelId = savedActiveId;
						modelUrl = activeModel.url;
					} else {
						activeModelId = DEFAULT_MODELS[0].id;
						modelUrl = DEFAULT_MODELS[0].url;
						await vrmStorage?.removeItem('active-model-id');
					}
				} else {
					activeModelId = DEFAULT_MODELS[0].id;
					modelUrl = DEFAULT_MODELS[0].url;
				}
			}
		} catch (e) {
			console.error('Failed to load VRM storage:', e);
			activeModelId = DEFAULT_MODELS[0].id;
			modelUrl = DEFAULT_MODELS[0].url;
		}
		storageReady = true;
		readyResolve?.();
		// Flush any saves that were blocked during init
		await saveToStorage();
		// Background warm-up (user request): once the ACTIVE model is on
		// screen, warm the rest ONE BY ONE on idle slots — other forms and
		// the motion pool. Next sessions/forms/emotes are instant (HTTP
		// cache), and nothing downloads as a burst competing with the live
		// model. The landing warms its own cast separately.
		try {
			const { warmAssets } = await import('$lib/services/asset-warmup');
			warmAssets([
				...models.filter((m) => m.url !== modelUrl).map((m) => m.url),
				...idleAnimationUrls,
				talkingAnimationUrl
			]);
		} catch {
			/* warm-up es best-effort: sin red la cola simplemente no rinde */
		}
	}

	async function saveToStorage() {
		if (!vrmStorage || !storageReady || !tempVrm.canSave(tempState)) return;
		try {
			// Save custom models (not defaults) — strip blob URLs since they're ephemeral
			const customModels = models
				.filter((m) => !m.isDefault)
				.map(({ url, previewUrl, ...rest }) => rest);
			await vrmStorage.setItem('model-list', customModels);
			await vrmStorage.setItem('active-model-id', activeModelId);
		} catch (e) {
			console.error('Failed to save VRM storage:', e);
		}
	}

	function setModelUrl(url: string | null) {
		modelUrl = url;
		error = null;
	}

	function setVrm(instance: VRM | null) {
		vrm = instance;
		// Store available expressions when VRM is set
		if (instance?.expressionManager) {
			availableExpressions = instance.expressionManager.expressions.map((e) => e.expressionName);
		}
	}

	function setLoading(loading: boolean) {
		isLoading = loading;
		if (!loading) {
			// The temporary model has finished parsing (or gave up).
			tempVrm.onLoadingFinished(tempState);
		}
	}

	function clearError() {
		if (errorTimeout) {
			clearTimeout(errorTimeout);
			errorTimeout = null;
		}
		error = null;
	}

	function setError(err: string | null) {
		clearError();
		// Track temp-load failures separately from other errors so the Developer
		// page can restore the original avatar without catching unrelated errors.
		if (err) {
			tempVrm.onError(tempState);
		}
		error = err;
		isLoading = false;
		// Auto-dismiss after 5 seconds if error is set
		if (err) {
			errorTimeout = setTimeout(() => {
				error = null;
				errorTimeout = null;
			}, 5000);
		}
	}

	async function setActiveModel(id: string) {
		const model = models.find((m) => m.id === id);
		if (model) {
			activeModelId = id;
			modelUrl = model.url;
			await saveToStorage();
			broadcastModelChange();
		}
	}

	async function broadcastModelChange() {
		if (!isTauri() || isSyncing) return;
		const { emit } = await import('@tauri-apps/api/event');
		emit('vrm:model-changed');
	}

	async function syncActiveModel() {
		if (!storageReady || tempModelActive) return;
		const savedActiveId = await vrmStorage?.getItem<string>('active-model-id');
		if (!savedActiveId || savedActiveId === activeModelId) return;

		// Check if model exists in our list already
		const model = models.find((m) => m.id === savedActiveId);
		if (model) {
			activeModelId = savedActiveId;
			modelUrl = model.url;
		} else {
			// New custom model added in another window — full re-init
			await initFromStorage();
		}
	}

	// These run every frame from the render loop. Skip the reactive write when the
	// value hasn't meaningfully moved, so a near-still model doesn't churn every
	// $derived bound to head position 60×/sec.
	function setHeadPosition(pos: [number, number, number]) {
		const p = headPosition;
		if (Math.abs(p[0] - pos[0]) < 0.001 && Math.abs(p[1] - pos[1]) < 0.001 && Math.abs(p[2] - pos[2]) < 0.001) {
			return;
		}
		headPosition = pos;
	}

	function setHeadScreenPosition(pos: { x: number; y: number } | null) {
		const p = headScreenPosition;
		if (pos && p && Math.abs(p.x - pos.x) < 0.05 && Math.abs(p.y - pos.y) < 0.05) {
			return;
		}
		headScreenPosition = pos;
	}

	function setCurrentAnimation(animationIdOrPath: string | null) {
		// Accept either an animation ID or a direct path
		// If it's a path (starts with /), use it directly
		// Otherwise, look up the animation by ID
		if (animationIdOrPath === null || animationIdOrPath === 'none') {
			currentAnimation = null;
		} else if (animationIdOrPath.startsWith('/')) {
			// Direct path - use as-is
			currentAnimation = animationIdOrPath;
		} else {
			// Look up by ID in availableAnimations
			const anim = availableAnimations.find((a) => a.id === animationIdOrPath);
			currentAnimation = anim?.url || null;
		}
	}

	// Start talking animation based on text length
	// Estimates ~15 characters per second of speaking
	function startTalking(text: string) {
		// Clear any existing timeout
		if (talkingTimeout) {
			clearTimeout(talkingTimeout);
		}

		// Calculate duration: ~15 chars/sec, minimum 1 second
		const charsPerSecond = 15;
		const duration = Math.max(1, text.length / charsPerSecond) * 1000;

		isTalking = true;

		// Auto-stop after estimated duration
		talkingTimeout = setTimeout(() => {
			isTalking = false;
			talkingTimeout = null;
		}, duration);
	}

	// Stop talking animation immediately
	function stopTalking() {
		if (talkingTimeout) {
			clearTimeout(talkingTimeout);
			talkingTimeout = null;
		}
		isTalking = false;
	}

	function loadTempModel(file: File): void {
		tempVrm.load(tempState, file);
	}

	function restoreOriginalModel(): void {
		// Clear any earlier temp-load error so a successful restore does not
		// keep a stale "Failed to parse VRM" message on screen.
		clearError();
		tempVrm.restore(tempState, models, DEFAULT_MODELS);
		// Defensive: if neither the original nor any default could be restored,
		// surface an error instead of leaving the viewport blank silently.
		if (!tempModelActive && activeModelId === null && modelUrl === null) {
			setError('No hay ningún modelo VRM disponible para restaurar.');
		}
	}

	async function addModel(file: File, previewDataUrl?: string): Promise<void> {
		const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const name = file.name.replace(/\.vrm$/i, '');

		// Store the file blob
		const blob = new Blob([await file.arrayBuffer()], { type: 'model/vrm' });
		await vrmStorage?.setItem(`model-blob-${id}`, blob);

		// Create blob URL for immediate use
		const url = URL.createObjectURL(blob);

		const newModel: VrmModel = {
			id,
			name,
			url,
			previewUrl: previewDataUrl,
			isDefault: false,
			createdAt: Date.now()
		};

		models = [...models, newModel];
		await saveToStorage();

		// Store preview if provided
		if (previewDataUrl) {
			await vrmStorage?.setItem(`${PREVIEW_KEY_PREFIX}${id}`, previewDataUrl);
		}
	}

	async function removeModel(id: string): Promise<void> {
		const model = models.find((m) => m.id === id);
		if (!model || model.isDefault) return;

		// Revoke blob URL to free memory
		if (model.url.startsWith('blob:')) {
			URL.revokeObjectURL(model.url);
		}

		// Remove from storage
		await vrmStorage?.removeItem(`model-blob-${id}`);
		await vrmStorage?.removeItem(`${PREVIEW_KEY_PREFIX}${id}`);
		await vrmStorage?.removeItem(`${PORTRAIT_KEY_PREFIX}${id}`);
		await vrmStorage?.removeItem(`${PORTRAIT_KEY_PREFIX}full-${id}`);
		await vrmStorage?.removeItem(`${PORTRAIT_KEY_PREFIX}hash-${id}`);
		const { [id]: _hashLiberado, ...restoHashes } = sessionPortraitHashes;
		sessionPortraitHashes = restoHashes;
		const { [id]: _liberado, ...resto } = sessionPortraits;
		sessionPortraits = resto;
		const { [id]: _liberadoFull, ...restoFull } = sessionFullPortraits;
		sessionFullPortraits = restoFull;

		// Remove from list
		models = models.filter((m) => m.id !== id);

		// If this was the active model, switch to default
		if (activeModelId === id) {
			setActiveModel(DEFAULT_MODELS[0].id);
		}

		await saveToStorage();
	}

	function getActiveModel(): VrmModel | null {
		return models.find((m) => m.id === activeModelId) || null;
	}

	async function setModelPreview(
		modelId: string | null,
		previewDataUrl: string,
		fullDataUrl?: string,
		hash?: string
	): Promise<void> {
		if (!modelId) return;

		// El retrato capturado SIEMPRE vive en memoria y manda para TODAS las
		// formas (getModelPortrait lo consulta primero) — el rail y los
		// avatares muestran al personaje activo al instante, con la MISMA
		// composición para Luna, Nova y Vela. PERSISTE también: la captura no
		// se repite en cada arranque (cero costo de GPU al cargar; la foto
		// vieja solo se reemplaza si la composición cambia de versión).
		sessionPortraits = { ...sessionPortraits, [modelId]: previewDataUrl };
		if (fullDataUrl) sessionFullPortraits = { ...sessionFullPortraits, [modelId]: fullDataUrl };

		try {
			await vrmStorage?.setItem(`${PORTRAIT_KEY_PREFIX}${modelId}`, previewDataUrl);
			if (fullDataUrl) {
				await vrmStorage?.setItem(`${PORTRAIT_KEY_PREFIX}full-${modelId}`, fullDataUrl);
			}
			if (hash) {
				sessionPortraitHashes = { ...sessionPortraitHashes, [modelId]: hash };
				await vrmStorage?.setItem(`${PORTRAIT_KEY_PREFIX}hash-${modelId}`, hash);
			}
		} catch {
			// Storage lleno o no disponible: los retratos de sesión siguen
			// vivos en memoria; la próxima carga los regenera.
			return;
		}

		const modelIndex = models.findIndex((m) => m.id === modelId);
		if (modelIndex === -1) return;
		const model = models[modelIndex];
		if (!model.isDefault && !model.previewUrl) {
			models[modelIndex] = { ...model, previewUrl: previewDataUrl };
			models = [...models];
			const key = `${PREVIEW_KEY_PREFIX}${modelId}`;
			const existing = await vrmStorage?.getItem<string>(key);
			if (!existing) {
				await vrmStorage?.setItem(key, previewDataUrl);
			}
		}
	}

	/** Retrato a mostrar de un modelo. DOS composiciones, ambas desde la
	 *  MISMA captura de sesión (un solo frame, dos recortes): 'full' es la
	 *  figura completa (rail de Cuenta) y 'bust' el primer plano hombro-
	 *  arriba (avatares de perfil y miniaturas). Orden de respaldo: la
	 *  cara servida del bundle (busto oficial de fábrica), el retrato
	 *  servido y el preview de galería. */
	function getModelPortrait(modelId: string, kind: 'bust' | 'full' = 'bust'): string | undefined {
		const model = models.find((m) => m.id === modelId);
		if (kind === 'full') {
			return sessionFullPortraits[modelId] ?? model?.portraitUrl ?? sessionPortraits[modelId] ?? model?.previewUrl;
		}
		return sessionPortraits[modelId] ?? model?.previewUrl ?? model?.portraitUrl;
	}

	/** ¿Ya aterrizó la captura de sesión de este modelo? El rail la usa para
	 *  distinguir "captura viva" de "respaldo del bundle" y no vestir a un
	 *  custom recién importado con la forma default. */
	function hasSessionPortrait(modelId: string): boolean {
		return Boolean(sessionPortraits[modelId]);
	}

	/** Huella del VRM del que proviene el retrato persistido (undefined si
	 *  no la hay: retratos capturados antes de que existiera la huella —
	 *  siguen VÁLIDOS; solo una huella DISTINTA invalida y recaptura). */
	function getPortraitHash(modelId: string): string | undefined {
		return sessionPortraitHashes[modelId];
	}

	return {
		get modelUrl() {
			return modelUrl;
		},
		get vrm() {
			return vrm;
		},
		get isLoading() {
			return isLoading;
		},
		get error() {
			return error;
		},
		get models() {
			return models;
		},
		get activeModelId() {
			return activeModelId;
		},
		get availableExpressions() {
			return availableExpressions;
		},
		get currentAnimation() {
			return currentAnimation;
		},
		get availableAnimations() {
			return availableAnimations;
		},
		get idleAnimationUrl() {
			return idleAnimationUrl;
		},
		get idleAnimationUrls() {
			return idleAnimationUrls;
		},
		get talkingAnimationUrl() {
			return talkingAnimationUrl;
		},
		get isTalking() {
			return isTalking;
		},
		get reactionRequest() {
			return reactionRequest;
		},
		requestReaction,
		get headPosition() {
			return headPosition;
		},
		get headScreenPosition() {
			return headScreenPosition;
		},
		get tempModelActive() {
			return tempModelActive;
		},
		get tempModelLoading() {
			return tempModelLoading;
		},
		get tempModelLoadError() {
			return tempModelLoadError;
		},
		setModelUrl,
		setHeadPosition,
		setHeadScreenPosition,
		setVrm,
		setLoading,
		setError,
		setActiveModel,
		setCurrentAnimation,
		startTalking,
		stopTalking,
		addModel,
		removeModel,
		getActiveModel,
		setModelPreview,
		getModelPortrait,
		hasSessionPortrait,
		getPortraitHash,
		loadTempModel,
		restoreOriginalModel,
		whenReady: () => ready
	};
}

export const vrmStore = createVrmStore();
