<script lang="ts">
	import { T, useThrelte, useTask } from '@threlte/core';
	import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
	import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
	import { VRMLoaderPlugin, VRM, VRMUtils } from '@pixiv/three-vrm';
	import { createVRMAnimationClip } from '@pixiv/three-vrm-animation';
	import { loadVrmAnimation } from '$lib/services/vrm-animations';
	import { vrmStore } from '$lib/stores/vrm.svelte';
	import { ttsStore } from '$lib/stores/tts.svelte';
	import { displayStore } from '$lib/stores/display.svelte';
	import { photomodeStore } from '$lib/stores/photomode.svelte';
	import { loadPoseAnimation, loadPoseManifest } from '$lib/services/poses';
	import { fetchProtectedAsset } from '$lib/services/asset-guard';
	import { pickReaction, stageTier, type TouchZone } from '$lib/engine/photo-reactions';
	import { characterStore } from '$lib/stores/character.svelte';
	import {
		computeSpringJointParams,
		clampFrameDelta,
		type SpringJointParams
	} from '$lib/engine/spring-physics';
	import {
		cameraAngles,
		angularVelocity,
		stepJiggle,
		createJiggleState,
		type CameraAngles
	} from '$lib/engine/camera-impulse';
	import { lipSyncAnalyzer } from '$lib/services/lipsync/analyzer';
	import { untrack } from 'svelte';
	import * as THREE from 'three';
	import { useLuna3dMetrics } from '$lib/engine/luna3d-metrics';

	// PREWARM A NIVEL DE MÓDULO: GLTFLoader+VRMLoaderPlugin se importan aquí,
	// así que lanzar la carga del formulario default cuando el módulo se evalúa
	// por PRIMERA vez significa que la descarga de 18MB (cifrada) Y el parseo
	// (~500ms) corren en paralelo con el resto del arranque (router, stores,
	// mount de Threlte). El efecto de carga del componente ADOPTA esta carga
	// en vuelo si la url coincide — misma configuración, cero doble descarga
	// (la memoria del parse prewarm la cubre; no hay cache HTTP que perder:
	// el asset viaja cifrado y se descifra en memoria).
	// Un modelo activo guardado simplemente descarta este resultado (un parse
	// desperdiciado en el primer arranque, luego es gratis).
	let prewarmGltf: Promise<GLTF> | null = null;
	// Huella (SHA-256 muestreado) de los bytes del prewarm: la comparación
	// contra el retrato persistido vive/die con el CONTENIDO del VRM, no con
	// el id — un modelo actualizado regenera su retrato solo.
	let prewarmHash: Promise<string> | null = null;
	const PREWARM_URL = '/luna/forms/luna.vrm';
	function beginPrewarm(): void {
		if (prewarmGltf) return;
		const loader = new GLTFLoader();
		loader.register((parser) => new VRMLoaderPlugin(parser));
		const bytes = fetchProtectedAsset(PREWARM_URL);
		prewarmHash = bytes.then(hashArrayBuffer);
		prewarmGltf = bytes.then((data) => loader.parseAsync(data, ''));
	}
	// Huella BARATA de un ArrayBuffer: SHA-256 sobre una muestra (primeros,
	// medios y últimos 64KB + longitud total). Detecta cualquier actualización
	// de un VRM sin hashear 18MB completos (~1ms de CPU).
	async function hashArrayBuffer(data: ArrayBuffer): Promise<string> {
		const CHUNK = 64 * 1024;
		const u8 = new Uint8Array(data);
		const mid = Math.floor(u8.length / 2);
		const parts = [u8.subarray(0, Math.min(CHUNK, u8.length))];
		if (u8.length > CHUNK * 2) parts.push(u8.subarray(mid - CHUNK / 2, mid + CHUNK / 2));
		if (u8.length > CHUNK) parts.push(u8.subarray(u8.length - CHUNK));
		const buf = new Uint8Array(parts.reduce((n, p) => n + p.length, 0) + 8);
		let off = 0;
		for (const p of parts) {
			buf.set(p, off);
			off += p.length;
		}
		new DataView(buf.buffer).setFloat64(off, u8.length);
		const digest = await crypto.subtle.digest('SHA-256', buf);
		return Array.from(new Uint8Array(digest))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');
	}
	if (typeof window !== 'undefined') {
		beginPrewarm();
		// Idle clips are tiny (~1.6MB total) but gate a natural reveal: prewarm
		// them NOW so the avatar's first visible frame is already IN MOTION —
		// never the arms-down static pose. luna-speak rides along for chat.
		try {
			[...vrmStore.idleAnimationUrls, '/luna/motion/luna-speak.vrma'].forEach((u) =>
				loadVrmAnimation(u).catch(() => {})
			);
		} catch {
			/* store not ready — animations load lazily as before */
		}
	}

	// Pose configurations for different VRM versions
	// VRM 0.x and 1.0 have different bone orientations and coordinate systems
	const VRM_POSE_CONFIG = {
		// VRM 0.x (older models like AvatarSample_A/B)
		'0': {
			sceneRotationY: Math.PI, // Rotate 180° to face camera
			leftUpperArm: { x: Math.PI * 0.05, y: 0, z: Math.PI * 0.4 },
			rightUpperArm: { x: Math.PI * 0.05, y: 0, z: -Math.PI * 0.4 },
			leftLowerArm: { x: 0, y: -Math.PI * 0.1, z: 0 },
			rightLowerArm: { x: 0, y: Math.PI * 0.1, z: 0 }
		},
		// VRM 1.0 (VRoid Studio models like Luna)
		'1': {
			sceneRotationY: 0, // Already facing camera
			leftUpperArm: { x: Math.PI * 0.05, y: 0, z: -Math.PI * 0.4 },
			rightUpperArm: { x: Math.PI * 0.05, y: 0, z: Math.PI * 0.4 },
			leftLowerArm: { x: 0, y: -Math.PI * 0.1, z: 0 }, // Same Y values as 0.x
			rightLowerArm: { x: 0, y: Math.PI * 0.1, z: 0 }
		}
	} as const;

	// Find a happy expression from available expressions (works with any model)
	function findHappyExpression(vrmInstance: VRM): string | null {
		const expressions = vrmInstance.expressionManager?.expressions;
		if (!expressions) return null;

		// Priority order of happy-like expressions to look for
		const happyKeywords = ['happy', 'joy', 'smile', 'fun', 'cheerful'];

		for (const keyword of happyKeywords) {
			const match = expressions.find((e) => e.expressionName.toLowerCase().includes(keyword));
			if (match) return match.expressionName;
		}
		return null;
	}

	interface Props {
		url: string;
	}

	let { url }: Props = $props();
	let vrm = $state<VRM | null>(null);
	let group = $state<THREE.Group | null>(null);

	// === Spring-bone physics ===
	// Authored per-joint values captured at load. The intensity setting always
	// multiplies these bases (never the current values), so re-applying is
	// idempotent and a model switch starts clean from its own rig tuning.
	let springBase: Array<{
		settings: { stiffness: number; gravityPower: number; dragForce: number };
		base: SpringJointParams;
	}> = [];

	function snapshotSpringBase(target: VRM) {
		springBase = [];
		const joints = target.springBoneManager?.joints;
		if (!joints) return;
		for (const joint of joints) {
			springBase.push({
				settings: joint.settings,
				base: {
					stiffness: joint.settings.stiffness,
					gravityPower: joint.settings.gravityPower,
					dragForce: joint.settings.dragForce
				}
			});
		}
	}

	// Applied live so slider tuning is immediate; re-runs on model switch since
	// the load path re-assigns `vrm` after rebuilding the snapshot.
	$effect(() => {
		const intensity = displayStore.physicsIntensity;
		if (!vrm) return;
		for (const { settings, base } of springBase) {
			const next = computeSpringJointParams(base, intensity);
			settings.stiffness = next.stiffness;
			settings.gravityPower = next.gravityPower;
			settings.dragForce = next.dragForce;
		}
	});

	// === Animation State ===
	let mixer = $state<THREE.AnimationMixer | null>(null);
	let idleAction = $state<THREE.AnimationAction | null>(null); // Current idle animation
	let talkingAction = $state<THREE.AnimationAction | null>(null); // Looping talking animation
	let talkingClip = $state<THREE.AnimationClip | null>(null); // Cached talking clip
	let emoteAction = $state<THREE.AnimationAction | null>(null); // One-shot emote animations
	let isEmotePlaying = $state(false); // True when an emote is playing (disables blinking)
	let lastIdleIndex = $state(-1); // Track last played idle to avoid repeats
	const currentAnimation = $derived(vrmStore.currentAnimation);
	// Talking animation plays when TTS is speaking OR when text-based talking is triggered
	const shouldTalk = $derived(ttsStore.isSpeaking || vrmStore.isTalking);

	// === Blinking State ===
	let blinkTimer = $state(0);
	let nextBlinkTime = $state(Math.random() * 4 + 2); // 2-6 seconds
	let isBlinking = $state(false);
	let blinkProgress = $state(0);

	// === Breathing State ===
	let breathTime = $state(0);
	const BREATH_SPEED = 0.8; // cycles per second
	const BREATH_INTENSITY = 0.015; // subtle movement

	// === Eye Saccade State ===
	let saccadeTime = $state(0);
	let nextSaccadeIn = $state(1 + Math.random() * 2);
	let eyeTarget = $state({ x: 0, y: 0 });
	let currentEyeTarget = $state({ x: 0, y: 0 });

	// === Idle Face Animation State ===
	let idleFaceTime = $state(0);
	let headTime = $state(0);

	const { renderer, camera } = useThrelte();
	useLuna3dMetrics(() => vrm?.scene ?? null);

	// Captura del retrato del personaje desde el canvas 3D vivo.
	// Alta resolución SIN costo: no crea canvas WebGL ni carga nada — copia
	// un rectángulo del frame ya renderizado (drawImage de GPU a canvas 2D,
	// sub-milisegundo). La copia es SIEMPRE 1:1 a los píxeles nativos del
	// canvas (que ya traen el DPR del dispositivo): re-escalar aquí arriba
	// provocaría aliasing visible; abajo el navegador hace downscale
	// suave (Lanczos del compositor), que es matemáticamente limpio.
	function generateThumbnail(modelId: string | null, hash?: string) {
		if (!renderer || !modelId) return;

		const canvas = renderer.domElement;
		if (!canvas || !canvas.width || !canvas.height) return;

		// ── FULL: figura completa — recorte vertical central (proporción del
		// rail 248/680), 1:1 a píxeles nativos. Es la composición del rail de
		// Cuenta, idéntica para las tres formas.
		const ratio = 248 / 680;
		let srcW = canvas.width;
		let srcH = Math.round(srcW / ratio);
		if (srcH > canvas.height) {
			srcH = canvas.height;
			srcW = Math.round(srcH * ratio);
		}
		const srcX = Math.round((canvas.width - srcW) / 2);
		const srcY = 0; // desde arriba: el encuadre vivo ya centra a Luna

		const fullCanvas = document.createElement('canvas');
		fullCanvas.width = srcW;
		fullCanvas.height = srcH;
		fullCanvas.getContext('2d')?.drawImage(canvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

		// ── BUST: primer plano hombro-arriba, ANCLADO a la cabeza real.
		// La posición proyectada de la cabeza (setHeadScreenPosition, en % del
		// canvas) evita adivinar dónde está el rostro: funciona con cualquier
		// encuadre vivo (chat dock, centrado, overlay). Encuadre con PECHO
		// visible: ~4% de aire sobre el pelo y margen bajo el pecho — el
		// corte no pega en el borde inferior del cuadro.
		const head = vrmStore.headScreenPosition ?? { x: 50, y: 22 };
		const bustSize = Math.round(canvas.height * 0.66);
		const bx = Math.max(
			0,
			Math.min(Math.round((head.x / 100) * canvas.width - bustSize / 2), canvas.width - bustSize)
		);
		const by = Math.max(
			0,
			Math.min(Math.round((head.y / 100) * canvas.height - bustSize * 0.11), canvas.height - bustSize)
		);

		const bustCanvas = document.createElement('canvas');
		bustCanvas.width = bustSize;
		bustCanvas.height = bustSize;
		const bctx = bustCanvas.getContext('2d');
		if (!bctx) return;
		// Fondo del retrato: tarjeta oscura con halo suave detrás de la cabeza
		// (el tratamiento del referente utsuwa). El recorte llega con alpha —
		// el canvas vivo es transparente alrededor de la figura — y este
		// gradiente es lo que se ve a través, consistente en todos los
		// consumidores (avatar, miniaturas, perfil) sin depender del tema CSS.
		const halo = bctx.createRadialGradient(
			bustSize / 2,
			bustSize * 0.36,
			bustSize * 0.06,
			bustSize / 2,
			bustSize * 0.36,
			bustSize * 0.72
		);
		halo.addColorStop(0, 'rgba(104, 110, 128, 0.92)');
		halo.addColorStop(0.55, 'rgba(52, 55, 66, 0.95)');
		halo.addColorStop(1, '#131318');
		bctx.fillStyle = halo;
		bctx.fillRect(0, 0, bustSize, bustSize);
		bctx.drawImage(canvas, bx, by, bustSize, bustSize, 0, 0, bustSize, bustSize);

		vrmStore.setModelPreview(
			modelId,
			bustCanvas.toDataURL('image/png'),
			fullCanvas.toDataURL('image/png'),
			hash
		);
	}

	/** Captura CON EL PERSONAJE ASENTADO Y PEINADO: congela el mixer y
	 *  RESETÉA las cadenas spring (pelo, faldas, accesorios) a su pose
	 *  inicial con velocidad CERO — el solver las deja colgar naturalmente
	 *  en los dos frames siguientes, sin la oscilación de la entrada al
	 *  idle que barría el pelo en el retrato. El dos-frames-rAF garantiza
	 *  que ambos frames presentados muestren la misma pose (el compositor
	 *  nunca ve mezcla). Guardía anti-carrera: si a mitad del camino se
	 *  cambió de forma, NO captura — el frame del canvas ya es del modelo
	 *  nuevo y se guardaría bajo el id del viejo. */
	function generateSettledThumbnail(modelId: string | null, hash?: string) {
		if (!renderer || !modelId) return;
		const targetVrm = vrm;
		const heldAction = idleAction;
		const wasPaused = heldAction?.paused ?? false;
		if (heldAction && !wasPaused) heldAction.paused = true;
		targetVrm?.springBoneManager?.reset();
		// Doble rAF (pose estable en dos frames presentados) con respaldo de
		// setTimeout: Chromium CONGELA rAF en ventanas ocultas/minimizadas —
		// sin respaldo, importar un custom con la ventana cubierta dejaría
		// su retrato sin capturar para siempre. El mixer ya está pausado:
		// la pose es idéntica pase lo que pase.
		let done = false;
		const capturar = () => {
			if (done) return;
			done = true;
			try {
				if (vrmStore.activeModelId === modelId) generateThumbnail(modelId, hash);
			} finally {
				// La captura es síncrona (drawImage + toDataURL); el mixer solo
				// se reanuda si el modelo sigue montado (un switch a mitad de
					// camino reemplaza idleAction — no toques el action nuevo).
				if (idleAction === heldAction && heldAction && !wasPaused) {
					heldAction.paused = false;
				}
			}
		};
		requestAnimationFrame(() => requestAnimationFrame(capturar));
		setTimeout(capturar, 250);
	}

	// Programación de la captura: cancelable en cleanup — un cambio de forma
	// no debe disparar la captura diferida del modelo que ya se fue.
	let portraitTimer: ReturnType<typeof setTimeout> | null = null;

	// Normalize model orientation and position
	function normalizeModel(loadedVrm: VRM) {
		const scene = loadedVrm.scene;
		const version = loadedVrm.meta?.metaVersion === '1' ? '1' : '0';
		const config = VRM_POSE_CONFIG[version];

		// Apply version-specific scene rotation
		scene.rotation.y = config.sceneRotationY;

		// Calculate bounding box
		const box = new THREE.Box3().setFromObject(scene);
		const center = box.getCenter(new THREE.Vector3());

		// Center model at origin (X and Z)
		scene.position.x = -center.x;
		scene.position.z = -center.z;

		// Ground the model (feet at y=0)
		scene.position.y = -box.min.y;
	}

	// Set a natural idle pose (arms relaxed at sides)
	function setIdlePose(loadedVrm: VRM) {
		const humanoid = loadedVrm.humanoid;
		const version = loadedVrm.meta?.metaVersion === '1' ? '1' : '0';
		const config = VRM_POSE_CONFIG[version];

		// Get arm bones
		const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
		const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
		const leftLowerArm = humanoid.getNormalizedBoneNode('leftLowerArm');
		const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');

		// Apply version-specific arm rotations
		if (leftUpperArm) {
			leftUpperArm.rotation.set(config.leftUpperArm.x, config.leftUpperArm.y, config.leftUpperArm.z);
		}
		if (rightUpperArm) {
			rightUpperArm.rotation.set(config.rightUpperArm.x, config.rightUpperArm.y, config.rightUpperArm.z);
		}
		if (leftLowerArm) {
			leftLowerArm.rotation.set(config.leftLowerArm.x, config.leftLowerArm.y, config.leftLowerArm.z);
		}
		if (rightLowerArm) {
			rightLowerArm.rotation.set(config.rightLowerArm.x, config.rightLowerArm.y, config.rightLowerArm.z);
		}
	}

	// Pick a random idle animation index, excluding the last played one
	function pickRandomIdleIndex(): number {
		const urls = vrmStore.idleAnimationUrls;
		if (urls.length <= 1) return 0;

		let newIndex: number;
		do {
			newIndex = Math.floor(Math.random() * urls.length);
		} while (newIndex === lastIdleIndex);

		return newIndex;
	}

	// Idle animation cycling timer
	let idleCycleTimeout: ReturnType<typeof setTimeout> | null = null;

	// Load and start the looping idle animation. Resolves when the clip is
	// PLAYING (or swallowed on failure) so the reveal can sync to motion.
	function startIdleAnimation(targetVrm: VRM, targetMixer: THREE.AnimationMixer): Promise<void> {
		const urls = vrmStore.idleAnimationUrls;
		if (!urls || urls.length === 0) return Promise.resolve();

		const index = pickRandomIdleIndex();
		lastIdleIndex = index;
		const idleUrl = urls[index];

		return loadVrmAnimation(idleUrl)
			.then((vrmAnimation) => {
				// Model was swapped or unmounted while this animation loaded
				if (mixer !== targetMixer) return;

				const clip = createVRMAnimationClip(vrmAnimation, targetVrm);
				const action = targetMixer.clipAction(clip);
				action.setLoop(THREE.LoopRepeat, Infinity);
				action.play();
				// A model that finishes loading while photo mode is already open
				// holds its stance instead of idling through the shot
				if (photomodeStore.active) action.paused = true;
				idleAction = action;

				// Schedule next animation change
				scheduleIdleCycle(targetVrm, targetMixer, clip.duration);
			})
			.catch((error) => {
				console.error('Error loading idle animation:', error);
			});
	}

	// Schedule the next idle animation switch
	function scheduleIdleCycle(targetVrm: VRM, targetMixer: THREE.AnimationMixer, duration: number) {
		if (idleCycleTimeout) {
			clearTimeout(idleCycleTimeout);
		}
		// Switch after 1-2 full loops of the current animation
		const loops = 1 + Math.random();
		const delay = duration * loops * 1000;
		idleCycleTimeout = setTimeout(() => {
			if (!shouldTalk && !isEmotePlaying && !photomodeStore.active) {
				playNextIdleAnimation(targetVrm, targetMixer);
			} else {
				// Retry later if we're busy (talking, emoting, or posing for a photo)
				scheduleIdleCycle(targetVrm, targetMixer, duration);
			}
		}, delay);
	}

	// Play the next random idle animation with smooth crossfade
	function playNextIdleAnimation(targetVrm: VRM, targetMixer: THREE.AnimationMixer) {
		const urls = vrmStore.idleAnimationUrls;
		if (!urls || urls.length === 0) return;

		const index = pickRandomIdleIndex();
		lastIdleIndex = index;
		const idleUrl = urls[index];

		loadVrmAnimation(idleUrl)
			.then((vrmAnimation) => {
				// Model was swapped or unmounted while this animation loaded
				if (mixer !== targetMixer) return;

				// Fade out current idle
				if (idleAction) {
					idleAction.fadeOut(1.2);
				}

				const clip = createVRMAnimationClip(vrmAnimation, targetVrm);
				const action = targetMixer.clipAction(clip);
				action.setLoop(THREE.LoopRepeat, Infinity);
				action.reset().fadeIn(1.2).play();
				idleAction = action;

				// Schedule next change
				scheduleIdleCycle(targetVrm, targetMixer, clip.duration);
			})
			.catch((error) => {
				console.error('Error loading idle animation:', error);
			});
	}

	// Load the talking animation clip (called once after model loads)
	function loadTalkingAnimation(targetVrm: VRM, targetMixer: THREE.AnimationMixer) {
		const talkingUrl = vrmStore.talkingAnimationUrl;
		if (!talkingUrl) return;

		loadVrmAnimation(talkingUrl)
			.then((vrmAnimation) => {
				// Model was swapped or unmounted while this animation loaded
				if (mixer !== targetMixer) return;

				talkingClip = createVRMAnimationClip(vrmAnimation, targetVrm);
			})
			.catch((error) => {
				console.error('Error loading talking animation:', error);
			});
	}

	// === Photo mode ===
	// A held pose is a single-frame clip: play, pause at t=0, and let the weight
	// crossfade do the transition. vrm.update() keeps running in the render task,
	// so spring bones and blinking stay alive while posed.
	let poseAction: THREE.AnimationAction | null = null;
	// Rapid pose taps race their async loads; only the latest application wins.
	let poseToken = 0;
	// Clips are per-model; caching them means repeat selections reuse the same
	// mixer action instead of accumulating new clips. Cleared on model switch.
	const poseClipCache = new Map<string, THREE.AnimationClip>();

	async function applyPhotoPose(poseId: string | null) {
		const targetVrm = vrm;
		const targetMixer = mixer;
		if (!targetVrm || !targetMixer) return;
		const token = ++poseToken;

		// A slower fade reads as easing into the pose rather than a hard cut
		const POSE_FADE = 0.6;

		if (poseId === null) {
			// Natural: fade any pose out and hold the idle stance
			if (poseAction) {
				poseAction.fadeOut(POSE_FADE);
				poseAction = null;
			}
			if (idleAction) {
				idleAction.reset().fadeIn(POSE_FADE).play();
				idleAction.paused = true;
			}
			return;
		}

		const manifest = await loadPoseManifest();
		const entry = manifest.find((p) => p.id === poseId);
		if (!entry) return;

		try {
			const animation = await loadPoseAnimation(entry.file);
			// Model swapped or a newer pose was requested while this one loaded
			if (mixer !== targetMixer || token !== poseToken) return;
			if (!photomodeStore.active) return;

			let clip = poseClipCache.get(poseId);
			if (!clip) {
				clip = createVRMAnimationClip(animation, targetVrm);
				poseClipCache.set(poseId, clip);
			}
			const previous = poseAction ?? idleAction;
			if (previous) previous.fadeOut(POSE_FADE);

			const action = targetMixer.clipAction(clip);
			action.reset();
			action.setLoop(THREE.LoopOnce, 1);
			action.clampWhenFinished = true;
			action.fadeIn(POSE_FADE).play();
			// Freeze at the clip's expressive moment (manifest hold, fraction of
			// duration). Frame zero is a neutral stance on most motion clips, which
			// made every placeholder pose look identical.
			action.paused = true;
			action.time = clip.duration * Math.min(Math.max(entry.hold ?? 0, 0), 0.99);
			poseAction = action;
		} catch (e) {
			console.error('[PhotoMode] Failed to apply pose:', e);
		}
	}

	// Enter/exit lifecycle: freeze the current stance on the way in, and re-run
	// the normal idle start path on the way out so cycling resumes cleanly.
	let wasPhotoActive = false;
	$effect(() => {
		const active = photomodeStore.active;
		untrack(() => {
			const targetVrm = vrm;
			const targetMixer = mixer;
			if (!targetVrm || !targetMixer) {
				wasPhotoActive = active;
				return;
			}
			if (active && !wasPhotoActive) {
				if (talkingAction) talkingAction.fadeOut(0.2);
				if (idleAction) {
					// Ensure the idle actually holds weight (entering mid-talk left it
					// faded out), then freeze it as the held stance.
					idleAction.play();
					idleAction.fadeIn(0.2);
					idleAction.paused = true;
				}
			} else if (!active && wasPhotoActive) {
				if (poseAction) {
					poseAction.fadeOut(0.6);
					poseAction = null;
				}
				// Resume the frozen idle so the crossfade has live motion to blend
				// from, then hand back to the cycler, which fades it out against a
				// fresh idle clip and reschedules cycling. Starting a second idle at
				// full weight here (the old path) blended two idles at once and made
				// the resumed animation drift strangely. When TTS is still speaking,
				// the talking-switch effect fades the talking action back in instead;
				// starting an idle at the same time would blend both at half weight.
				if (idleAction) idleAction.paused = false;
				if (!shouldTalk) {
					playNextIdleAnimation(targetVrm, targetMixer);
				}
			}
			wasPhotoActive = active;
		});
	});

	// Apply pose selections while photo mode is active
	$effect(() => {
		const active = photomodeStore.active;
		const poseId = photomodeStore.selectedPoseId;
		if (!active) return;
		untrack(() => {
			// Entering starts on Natural, which the enter lifecycle already froze,
			// but the token still bumps so an in-flight pose load can't land stale
			if (poseId === null && !poseAction) {
				poseToken++;
				return;
			}
			applyPhotoPose(poseId);
		});
	});

	// Held photo expression: applied exclusively, cleared on change and exit.
	// Tap reactions layer a transient expression on top and restore this one.
	let heldExpression: string | null = null;
	$effect(() => {
		const active = photomodeStore.active;
		const name = photomodeStore.selectedExpression;
		untrack(() => {
			const em = vrm?.expressionManager;
			if (!em) return;
			if (heldExpression && heldExpression !== name) {
				em.setValue(heldExpression, 0);
				heldExpression = null;
			}
			if (active && name) {
				em.setValue(name, 1);
				heldExpression = name;
			}
		});
	});

	// Tap reactions: an expression flash plus a decaying rotation nudge whose
	// motion the spring bones inherit. Repeat taps inside the window escalate.
	// Pulses overlap instead of replacing each other (replacement snapped the
	// active nudge to zero, which read as a jump on rapid taps), and every
	// nudge applied to a bone is explicitly undone at the start of the next
	// frame, so nothing can accumulate no matter what the mixer weights are.
	interface ReactionPulse {
		bone: THREE.Object3D;
		t: number;
		duration: number;
		magnitude: number;
		direction: number;
	}
	let activePulses: ReactionPulse[] = [];
	let appliedNudges: Array<{ bone: THREE.Object3D; z: number; x: number }> = [];
	let reactionFace: { name: string; weight: number; t: number; duration: number } | null = null;
	const recentTaps = { zone: null as TouchZone | null, at: 0, count: 0 };
	const REACTION_REPEAT_WINDOW_MS = 4000;

	$effect(() => {
		const request = vrmStore.reactionRequest;
		if (!request) return;
		untrack(() => {
			const targetVrm = vrm;
			if (!targetVrm) return;

			const now = performance.now();
			if (recentTaps.zone === request.zone && now - recentTaps.at < REACTION_REPEAT_WINDOW_MS) {
				recentTaps.count += 1;
			} else {
				recentTaps.count = 0;
			}
			recentTaps.zone = request.zone;
			recentTaps.at = now;

			const tier = stageTier(characterStore.state.relationshipStage);
			const spec = pickReaction(request.zone, tier, recentTaps.count);

			const em = targetVrm.expressionManager;
			if (em) {
				const name = spec.expressions.find((candidate) =>
					em.expressions.some((e) => e.expressionName === candidate)
				);
				if (name) {
					if (reactionFace && reactionFace.name !== name) em.setValue(reactionFace.name, 0);
					reactionFace = { name, weight: spec.weight, t: 0, duration: 1.8 };
				}
			}

			const bone =
				request.zone === 'head' || request.zone === 'face'
					? targetVrm.humanoid.getNormalizedBoneNode('head')
					: request.zone === 'shoulder'
						? (targetVrm.humanoid.getNormalizedBoneNode('upperChest') ??
							targetVrm.humanoid.getNormalizedBoneNode('chest'))
						: request.zone === 'torso'
							? targetVrm.humanoid.getNormalizedBoneNode('spine')
							: targetVrm.humanoid.getNormalizedBoneNode('hips');
			const fallback = targetVrm.humanoid.getNormalizedBoneNode('spine');
			const target = bone ?? fallback;
			if (target && activePulses.length < 4) {
				// Half strength while she is talking: the head is already moving,
				// and a full kick layered on that read as a jump
				const talkScale = shouldTalk ? 0.5 : 1;
				activePulses.push({
					bone: target,
					t: 0,
					duration: 0.9,
					magnitude: spec.impulse * talkScale,
					direction: Math.random() > 0.5 ? 1 : -1
				});
			}
		});
	});

	// Update lip-sync analyser when TTS state changes
	$effect(() => {
		lipSyncAnalyzer.setAnalyser(ttsStore.currentAnalyser);
	});

	// Switch between idle and talking animations based on speaking/talking state
	$effect(() => {
		const speaking = shouldTalk;
		const currentMixer = untrack(() => mixer);
		const currentIdleAction = untrack(() => idleAction);
		const currentTalkingClip = untrack(() => talkingClip);
		const currentEmotePlaying = untrack(() => isEmotePlaying);

		// Don't switch if emote is playing or no mixer/clips available. A held
		// photo pose must not be stomped by TTS either; exit restores the loop.
		if (!currentMixer || currentEmotePlaying || photomodeStore.active) return;

		if (speaking && currentTalkingClip) {
			// Start talking animation, fade out idle
			if (currentIdleAction) {
				currentIdleAction.fadeOut(0.3);
			}

			// Create and play talking action
			let currentTalkingAction = untrack(() => talkingAction);
			if (!currentTalkingAction) {
				currentTalkingAction = currentMixer.clipAction(currentTalkingClip);
				currentTalkingAction.setLoop(THREE.LoopRepeat, Infinity);
				talkingAction = currentTalkingAction;
			}
			currentTalkingAction.reset().fadeIn(0.3).play();

		} else if (!speaking) {
			// Stop talking, resume idle animation
			const currentTalkingAction = untrack(() => talkingAction);
			if (currentTalkingAction) {
				currentTalkingAction.fadeOut(0.3);
			}

			// Resume the current idle action
			if (currentIdleAction) {
				currentIdleAction.reset().fadeIn(0.3).play();
			}

		}
	});

	// Play emote animations when currentAnimation changes
	$effect(() => {
		const animId = currentAnimation;
		const currentVrm = untrack(() => vrm);
		const currentMixer = untrack(() => mixer);
		const currentIdleAction = untrack(() => idleAction);

		if (!currentVrm || !currentMixer) return;

		// Stop any current emote
		const prevEmote = untrack(() => emoteAction);
		if (prevEmote) {
			prevEmote.fadeOut(0.3);
		}

		// If no emote selected, just ensure idle is playing
		if (!animId) {
			isEmotePlaying = false;
			emoteAction = null;
			if (currentIdleAction && !currentIdleAction.isRunning()) {
				currentIdleAction.reset().fadeIn(0.3).play();
			}
			return;
		}

		// Find the emote animation
		const animationData = vrmStore.availableAnimations.find((a) => a.url === animId || a.id === animId);
		if (!animationData?.url) return;

		// Load emote VRMA file
		loadVrmAnimation(animationData.url)
			.then((vrmAnimation) => {
				untrack(() => {
					if (!vrm || !mixer) return;

					// Fade out idle animation
					const currentIdle = idleAction;
					if (currentIdle) {
						currentIdle.fadeOut(0.2);
					}

					// Create and play emote
					const clip = createVRMAnimationClip(vrmAnimation, vrm);
					const action = mixer.clipAction(clip);
					action.setLoop(THREE.LoopOnce, 1);
					action.clampWhenFinished = true;
					action.timeScale = 1.5;
					action.reset().fadeIn(0.2).play();
					emoteAction = action;
					isEmotePlaying = true;

					// Apply happy expression during emote
					const happyExpr = findHappyExpression(vrm);
					if (happyExpr) {
						vrm.expressionManager?.setValue(happyExpr, 0.7);
					}

					// When emote finishes, return to idle
					const capturedMixer = mixer;
					const capturedVrm = vrm;
					const capturedIdleAction = currentIdle;
					const onFinished = (e: { action: THREE.AnimationAction }) => {
						if (e.action === action) {
							capturedMixer.removeEventListener('finished', onFinished);
							isEmotePlaying = false;
							emoteAction = null;

							// Clear happy expression
							if (happyExpr) {
								capturedVrm.expressionManager?.setValue(happyExpr, 0);
							}

							// 0.19.1: fade the finished clip OUT as the idle fades in.
							// clampWhenFinished kept it at full weight, so its last pose
							// blended with the rising idle and the arms hung between
							// the two. Reset unclamps, fadeOut hands control over.
							action.clampWhenFinished = false;
							action.fadeOut(0.3);
							if (capturedIdleAction) {
								capturedIdleAction.reset().fadeIn(0.3).play();
							}

							vrmStore.setCurrentAnimation(null);
						}
					};
					capturedMixer.addEventListener('finished', onFinished);
				});
			})
			.catch((error) => {
				console.error('Error loading emote animation:', error);
			});
	});

	// Load VRM when URL changes
	$effect(() => {
		if (!url) return;

		// Capture the model this load belongs to, so a fast switch can't save this
		// render under a different model's id.
		const loadModelId = vrmStore.activeModelId;
		// La captura del retrato depende del CONTENIDO del VRM, no solo de su
		// existencia: si el retrato persistido viene de OTRO archivo (el VRM
		// se actualizó, o el custom se re-importó), la foto vieja se invalida
		// y se recaptura. La decisión final vive DENTRO del timer (ver abajo):
		// ahí ya aterrizaron el restore del storage Y la huella de los bytes.
		// OJO: ni aquí ni en el timer se lee el estado de retratos del store
		// de forma reactiva (hasSessionPortrait/getPortraitHash tocan $state):
		// una lectura en este cuerpo re-ejecutaría el efecto cuando el storage
		// restaura retratos o cuando la captura se registra — RECARGANDO el
		// VRM entero (parpadeo + regeneración en bucle). Todo lo retrato-vivo
		// pasa por untrack().

		// Invalidate this load if the URL changes or the component unmounts
		// before the loader finishes, so a slow load can't clobber a newer one
		let cancelled = false;

		vrmStore.setLoading(true);
		vrmStore.setError(null);
		performance.mark('vrm:load-start');

		// ADOPTA el prewarm del módulo si la URL coincide: el parseo puede ya
		// estar listo (eval del módulo → este efecto: ~300–600ms de ventaja en
		// el arranque). Si no, carga fresca: descarga cifrada + descifrado en
		// memoria + parseAsync. Mismo registro de plugins en ambos caminos.
		const adoptPrewarm = url === PREWARM_URL && prewarmGltf !== null;
		const bytesPromise: Promise<ArrayBuffer> = adoptPrewarm
			? Promise.resolve(new ArrayBuffer(0))
			: fetchProtectedAsset(url);
		// Huella de los bytes del modelo ACTUAL: el prewarm ya la calcula en
		// paralelo; una carga fresca la deriva de sus propios bytes.
		const hashPromise: Promise<string> = adoptPrewarm
			? (prewarmHash ?? Promise.resolve(''))
			: bytesPromise.then(hashArrayBuffer);
		const loadPromise: Promise<GLTF> = adoptPrewarm
			? prewarmGltf!
			: bytesPromise.then((data) => {
					const loader = new GLTFLoader();
					loader.register((parser) => new VRMLoaderPlugin(parser));
					return loader.parseAsync(data, '');
				});

		loadPromise.then(
			(gltf) => {
				performance.mark('vrm:bytes-ready');
				const loadedVrm = gltf.userData.vrm as VRM;

				if (cancelled) {
					VRMUtils.deepDispose(loadedVrm.scene);
					return;
				}

				VRMUtils.removeUnnecessaryVertices(loadedVrm.scene);
				VRMUtils.combineSkeletons(loadedVrm.scene);
				performance.mark('vrm:optimized');

				// Skip frustum culling so animated meshes never pop out at the edges
				loadedVrm.scene.traverse((obj) => {
					obj.frustumCulled = false;
				});

				// Normalize model orientation and position
				normalizeModel(loadedVrm);

				// Set a natural idle pose (arms down instead of T-pose)
				setIdlePose(loadedVrm);

				// Capture this rig's authored spring values before `vrm` flips the
				// physics-intensity effect, so it applies over fresh bases.
				snapshotSpringBase(loadedVrm);

				vrm = loadedVrm;
				group = loadedVrm.scene;
				const newMixer = new THREE.AnimationMixer(loadedVrm.scene);
				mixer = newMixer;
				vrmStore.setVrm(loadedVrm);

				// REVEAL IN MOTION: hold the fade until the idle clip is actually
				// PLAYING — her first visible frame is already animating, never
				// the arms-down static pose. The clips were prewarmed at module
				// eval, so this wait is normally ~0ms. Safety cap: a failed or
				// slow clip must never block her appearance (reveal static).
				const idleReady = startIdleAnimation(loadedVrm, newMixer);
				Promise.race([idleReady, new Promise((r) => setTimeout(r, 1200))]).then(() => {
					requestAnimationFrame(() => {
						performance.mark('vrm:revealed');
						performance.measure('vrm:fetch', 'vrm:load-start', 'vrm:bytes-ready');
						performance.measure('vrm:parse+optimize', 'vrm:bytes-ready', 'vrm:optimized');
						performance.measure('vrm:pose+rig', 'vrm:optimized', 'vrm:revealed');
						if (!cancelled) vrmStore.setLoading(false);

						// Talking clip enriches post-reveal (cached for chat)
						if (!cancelled) loadTalkingAnimation(loadedVrm, newMixer);
					});
				});

				// Debug: Log available expressions
				// if (loadedVrm.expressionManager) {
				// 	const expressions = loadedVrm.expressionManager.expressions;
				// 	console.log(
				// 		'Available expressions:',
				// 		expressions.map((e) => e.expressionName)
				// 	);
				// }

				// Retrato de la forma: desde el render 3D vivo, con decisión por
				// HUELLA del contenido (ver arriba). Retraso de 850ms: el primer
				// frame ya está en pantalla y la física del enrolle amaine
				// antes de congelar y copiar (generateSettledThumbnail).
				{
					if (portraitTimer) clearTimeout(portraitTimer);
					// Decisión final DENTRO del timer: la huella llega async y
					// initFromStorage puede restaurar retratos mientras el modelo
					// carga (carrera de arranque). Recaptura SOLO si no hay retrato,
					// o su huella no coincide con los bytes actuales (el VRM cambió
					// — actualizar el archivo regenera la foto solo).
					portraitTimer = setTimeout(() => {
						if (!loadModelId) return;
						hashPromise
							.then((hash) =>
								// DECISIÓN DETERMINISTA: esperar al restore del storage.
								// Sin esta espera, un arranque lento de IndexedDB dejaba
								// hasSessionPortrait() en false y se recapturaba un
								// retrato que el usuario YA TENÍA (su queja original).
								vrmStore.whenReady().then(() => {
									if (cancelled) return;
									// untrack: la decisión NO debe depender de $state — el
									// restore y la captura previa mutan esos records y
									// dispararían la RECARGA del modelo.
									const hayRetrato = untrack(() => vrmStore.hasSessionPortrait(loadModelId));
									if (!hayRetrato) {
										generateSettledThumbnail(loadModelId, hash);
										return;
									}
									// Sin huella persistida: el retrato sigue VÁLIDO (fue
									// capturado por esta misma composición antes de que
									// la huella existiera) — jamás se invalida solo. Solo
									// una huella DISTINTA (otro archivo) fuerza recaptura.
									const guardado = untrack(() => vrmStore.getPortraitHash(loadModelId));
									if (guardado !== undefined && guardado !== hash) {
										generateSettledThumbnail(loadModelId, hash);
									}
								})
							)
							.catch(() => {});
					}, 850);
				}

			}
		)
		.catch((error) => {
			if (cancelled) return;
			console.error('Error loading VRM:', error);
			vrmStore.setLoading(false);
			vrmStore.setError('No se pudo cargar el modelo VRM');
		});

		return () => {
			// Cleanup on unmount or URL change
			cancelled = true;
			if (portraitTimer) {
				clearTimeout(portraitTimer);
				portraitTimer = null;
			}
			if (idleCycleTimeout) {
				clearTimeout(idleCycleTimeout);
				idleCycleTimeout = null;
			}
			if (mixer) {
				mixer.stopAllAction();
				mixer = null;
				idleAction = null;
				talkingAction = null;
				talkingClip = null;
				emoteAction = null;
			}
			// If an emote was mid-play, its 'finished' handler (bound to the old
			// mixer) never runs, so reset the flags it would have cleared —
			// otherwise currentAnimation stays stale and the next model can
			// immediately replay the leftover emote.
			if (isEmotePlaying) {
				isEmotePlaying = false;
				vrmStore.setCurrentAnimation(null);
			}
			if (vrm) {
				// Frees geometries, materials, and textures (manual traverse missed textures)
				VRMUtils.deepDispose(vrm.scene);
				vrmStore.setVrm(null);
				vrm = null;
				group = null;
				springBase = [];
				poseAction = null;
				poseClipCache.clear();
				activePulses = [];
				appliedNudges = [];
				reactionFace = null;
				heldExpression = null;
			}
		};
	});

	// Scratch vectors reused every frame — allocating three Vector3s per frame
	// (~180/sec) was needless GC pressure in the render loop.
	const scratchWorld = new THREE.Vector3();
	const scratchProjected = new THREE.Vector3();

	// === Photo-mode head tracking ===
	// Weight eases in/out so toggling never snaps the neck. The look rotation
	// is slerped over whatever the animation wrote this frame, clamped to a
	// natural range. Normalized humanoid bones face +Z in every VRM version.
	let headTrackWeight = 0;
	const headWorld = new THREE.Vector3();
	const camWorld = new THREE.Vector3();
	// Camera jiggle: orbiting excites the spring bones via a damped nudge on
	// the chest and head; the rig's own springs do the visible swinging
	const jiggleCamPos = new THREE.Vector3();
	const jiggleModelPos = new THREE.Vector3();
	let jiggleState = createJiggleState();
	let prevCamAngles: CameraAngles | null = null;
	const lookDir = new THREE.Vector3();
	const parentQuat = new THREE.Quaternion();
	const lookQuat = new THREE.Quaternion();
	const lookEuler = new THREE.Euler();

	// Update VRM each frame
	useTask((delta) => {
		if (!vrm) return;

		// Undo last frame's tap nudges before anything writes bones this frame.
		// When the mixer overwrites the rotation anyway this is a no-op; when it
		// does not, this is what makes accumulation impossible.
		for (const applied of appliedNudges) {
			applied.bone.rotation.z -= applied.z;
			applied.bone.rotation.x -= applied.x;
		}
		appliedNudges.length = 0;

		// Update animation mixer
		mixer?.update(delta);

		// Tap reactions: decaying additive nudges layered over whatever the
		// mixer wrote, rendered this frame (so the body sways with the physics
		// instead of the solver and the render disagreeing, which read as
		// jitter during talking). Overlapping pulses sum; each bone's total is
		// recorded for the undo above.
		if (activePulses.length > 0) {
			const remaining: ReactionPulse[] = [];
			for (const pulse of activePulses) {
				pulse.t += delta;
				const progress = pulse.t / pulse.duration;
				if (progress >= 1) continue;
				// sin^2 has zero slope at both ends: eases in and out
				const wave = Math.sin(progress * Math.PI);
				const envelope = wave * wave * Math.exp(-1.6 * progress);
				const angle = pulse.magnitude * 0.07 * envelope;
				const z = angle * pulse.direction;
				const x = -angle * 0.4;
				pulse.bone.rotation.z += z;
				pulse.bone.rotation.x += x;
				appliedNudges.push({ bone: pulse.bone, z, x });
				remaining.push(pulse);
			}
			activePulses = remaining;
		}

		// Camera-driven jiggle: measure orbit velocity and advance the damped
		// spring. The offsets are applied around vrm.update() further down, so
		// only the spring bones see the movement, never the rendered skeleton.
		{
			camera.current.getWorldPosition(jiggleCamPos);
			vrm.scene.getWorldPosition(jiggleModelPos);
			const angles = cameraAngles(jiggleCamPos, jiggleModelPos);
			if (prevCamAngles && delta > 0) {
				const vel = angularVelocity(prevCamAngles, angles, delta);
				jiggleState = stepJiggle(jiggleState, vel, displayStore.physicsIntensity, delta);
			}
			prevCamAngles = angles;
		}

		if (reactionFace && vrm.expressionManager) {
			reactionFace.t += delta;
			const progress = reactionFace.t / reactionFace.duration;
			const em = vrm.expressionManager;
			if (progress >= 1) {
				if (heldExpression === reactionFace.name) {
					// The reaction borrowed the held expression; hand it back whole
					em.setValue(heldExpression, 1);
				} else {
					em.setValue(reactionFace.name, 0);
					if (heldExpression) em.setValue(heldExpression, 1);
				}
				reactionFace = null;
			} else {
				// Quick attack, long release
				const shape =
					progress < 0.3 ? progress / 0.3 : 1 - Math.max(0, (progress - 0.5) / 0.5);
				em.setValue(reactionFace.name, Math.max(0, Math.min(1, reactionFace.weight * shape)));
			}
		}

		// Gaze follow now lives at the SCENE level (Scene.svelte rotates the
		// container group, same recipe as the landing) — bone-level head slerp
		// fought the idle mixer's per-frame head writes and read robotic.
		// Photo-mode camera tracking keeps the bone machinery (it wins over the
		// animation by design, and its weight-eased engagement never stutters).
		const trackTarget = photomodeStore.active && photomodeStore.headTracking ? 1 : 0;
		headTrackWeight += (trackTarget - headTrackWeight) * Math.min(1, delta * 5);
		if (headTrackWeight > 0.001 && camera.current) {
			const head = vrm.humanoid.getNormalizedBoneNode('head');
			if (head?.parent) {
				head.getWorldPosition(headWorld);
				camera.current.getWorldPosition(camWorld);
				lookDir.subVectors(camWorld, headWorld);
				head.parent.getWorldQuaternion(parentQuat).invert();
				lookDir.applyQuaternion(parentQuat).normalize();
				// VRM 0.x rigs face -Z where 1.0 faces +Z (the same split
				// VRM_POSE_CONFIG handles for the scene), so the whole look
				// direction mirrors on v0 models: horizontal AND vertical
				if (vrm.meta?.metaVersion !== '1') {
					lookDir.negate();
				}
				const yaw = THREE.MathUtils.clamp(Math.atan2(lookDir.x, lookDir.z), -0.65, 0.65);
				// Asymmetric pitch range: looking up reads charming well past where
				// looking down starts to double the chin. The wide bound is chosen
				// by world-space geometry (is the camera above her head), which is
				// immune to the v0/v1 sign-convention differences.
				const rawPitch = -Math.asin(THREE.MathUtils.clamp(lookDir.y, -1, 1));
				const pitchLimit = camWorld.y >= headWorld.y ? 0.85 : 0.32;
				const pitch = THREE.MathUtils.clamp(rawPitch, -pitchLimit, pitchLimit);
				lookEuler.set(pitch, yaw, 0, 'YXZ');
				lookQuat.setFromEuler(lookEuler);
				head.quaternion.slerp(lookQuat, headTrackWeight);
			}
		}

		// Camera jiggle, phase 1: displace the chest and head so the spring
		// solver inside vrm.update() reads their movement and swings hair,
		// clothes, and accessories accordingly.
		const jiggleActive =
			Math.abs(jiggleState.yaw) > 1e-5 || Math.abs(jiggleState.pitch) > 1e-5;
		let jiggleChest: THREE.Object3D | null = null;
		let jiggleHead: THREE.Object3D | null = null;
		if (jiggleActive) {
			jiggleChest =
				vrm.humanoid.getNormalizedBoneNode('upperChest') ??
				vrm.humanoid.getNormalizedBoneNode('chest') ??
				vrm.humanoid.getNormalizedBoneNode('spine');
			jiggleHead = vrm.humanoid.getNormalizedBoneNode('head');
			if (jiggleChest) {
				jiggleChest.rotation.z += jiggleState.yaw * 0.8;
				jiggleChest.rotation.y += jiggleState.yaw * 0.4;
				jiggleChest.rotation.x += jiggleState.pitch;
			}
			if (jiggleHead) {
				jiggleHead.rotation.z += jiggleState.yaw * 0.45;
				jiggleHead.rotation.y += jiggleState.yaw * 0.25;
				jiggleHead.rotation.x += jiggleState.pitch * 0.5;
			}
		}

		// Update VRM core. The delta is clamped because a huge frame gap (tab
		// refocus, window drag) otherwise launches the spring bones violently.
		vrm.update(clampFrameDelta(delta));

		// Camera jiggle, phase 2: put the skeleton straight back. The solver
		// already sampled the displaced pose; re-syncing the humanoid pushes
		// the rest pose back onto the raw render skeleton (vrm.update copied
		// the displaced one), so the body stays planted while only the spring
		// bones carry the motion.
		if (jiggleActive) {
			if (jiggleChest) {
				jiggleChest.rotation.z -= jiggleState.yaw * 0.8;
				jiggleChest.rotation.y -= jiggleState.yaw * 0.4;
				jiggleChest.rotation.x -= jiggleState.pitch;
			}
			if (jiggleHead) {
				jiggleHead.rotation.z -= jiggleState.yaw * 0.45;
				jiggleHead.rotation.y -= jiggleState.yaw * 0.25;
				jiggleHead.rotation.x -= jiggleState.pitch * 0.5;
			}
			if (jiggleChest || jiggleHead) vrm.humanoid.update();
		}

		// Track head position for 3D speech bubble
		const headBone = vrm.humanoid.getNormalizedBoneNode('head');
		if (headBone && camera.current) {
			headBone.getWorldPosition(scratchWorld);
			// Offset above and slightly in front of head
			scratchProjected.set(scratchWorld.x, scratchWorld.y + 0.25, scratchWorld.z + 0.1);
			vrmStore.setHeadPosition([scratchProjected.x, scratchProjected.y, scratchProjected.z]);

			// Project to screen coordinates (in place)
			scratchProjected.project(camera.current);
			// Convert from NDC (-1 to 1) to screen percentage (0 to 100)
			const x = (scratchProjected.x + 1) * 50;
			const y = (-scratchProjected.y + 1) * 50;
			vrmStore.setHeadScreenPosition({ x, y });
		}

		const expressionManager = vrm.expressionManager;
		if (!expressionManager) return;

		// Helper to set expression (silently ignores if not found)
		const setExpression = (name: string, value: number) => {
			try {
				expressionManager.setValue(name, value);
			} catch {
				// Expression doesn't exist on this model
			}
		};

		// === Blinking Animation (runs during idle, disabled during emotes) ===
		if (!isEmotePlaying) {
			blinkTimer += delta;

			if (!isBlinking && blinkTimer >= nextBlinkTime) {
				// Start blink
				isBlinking = true;
				blinkProgress = 0;
			}

			if (isBlinking) {
				blinkProgress += delta * 8; // Blink duration ~0.125s

				// Asymmetric blink curve: quick close (30%), slow open (70%)
				let blinkValue: number;
				if (blinkProgress < 0.3) {
					// Quick close
					blinkValue = blinkProgress / 0.3;
				} else {
					// Slow open
					blinkValue = 1 - (blinkProgress - 0.3) / 0.7;
				}

				const finalBlinkValue = Math.max(0, blinkValue);

				if (blinkProgress >= 1) {
					// End blink
					isBlinking = false;
					blinkTimer = 0;
					nextBlinkTime = Math.random() * 4 + 2; // Random 2-6 seconds
					// Try all blink expression variants
					setExpression('blink', 0);
					setExpression('Blink', 0);
					setExpression('eyeBlinkLeft', 0);
					setExpression('eyeBlinkRight', 0);
				} else {
					// Try all blink expression variants
					setExpression('blink', finalBlinkValue);
					setExpression('Blink', finalBlinkValue);
					setExpression('eyeBlinkLeft', finalBlinkValue);
					setExpression('eyeBlinkRight', finalBlinkValue);
				}
			}
		}

		// Apply expression changes
		expressionManager.update();

		// === Lip-sync Animation ===
		const visemes = lipSyncAnalyzer.update(delta);

		// Apply viseme weights - try multiple naming conventions
		// VRM 1.0 style
		setExpression('aa', visemes.aa);
		setExpression('ee', visemes.ee);
		setExpression('ih', visemes.ih);
		setExpression('oh', visemes.oh);
		setExpression('ou', visemes.ou);
		// VRM 0.x style
		setExpression('a', visemes.aa);
		setExpression('i', visemes.ih);
		setExpression('u', visemes.ou);
		setExpression('e', visemes.ee);
		setExpression('o', visemes.oh);
		// ARKit style (jawOpen for mouth)
		setExpression('jawOpen', visemes.aa * 0.7);
	});
</script>

{#if group}
	<T is={group} />
{/if}
