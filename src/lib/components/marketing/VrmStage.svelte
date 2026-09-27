<script lang="ts">
	// Lightweight marketing VRM stage: raw three.js (no threlte scene graph),
	// transparent background. Entrance: she WALKS in from the right on a
	// luna-walk.vrma loop, then settles into the luna-walk-rest.vrma idle.
	// Renders ONLY while visible and pauses on document hidden.
	import { onMount } from 'svelte';
	import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
	import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
	import { createVRMAnimationClip } from '@pixiv/three-vrm-animation';
	import { loadVrmAnimation } from '$lib/services/vrm-animations';
	import { fetchProtectedAsset } from '$lib/services/asset-guard';
	import * as THREE from 'three';

	interface Props {
		url: string;
		/** Height of the stage box (CSS) */
		height?: string;
		/** Idle .vrma loop; empty falls back to the manual sway pose */
		idleAnimation?: string;
		/** Walk .vrma loop played during the walk-in entrance */
		walkAnimation?: string;
		/** Scene handshake (marketing landing): the pinned scene sets this
		 *  true ONLY when the dressed LUNA frame is actually on screen — the
		 *  entrance is a performance for someone watching, not something that
		 *  plays while the user is still crossing the transition. Standalone
		 *  usage (no cue passed) keeps the old painted-visibility behavior. */
		walkCue?: boolean | null;
	}

	let {
		url,
		height = '480px',
		idleAnimation = '/luna/motion/luna-walk-rest.vrma',
		walkAnimation = '/luna/motion/luna-walk.vrma',
		walkCue = null
	}: Props = $props();

	let canvas: HTMLCanvasElement;
	let wrap: HTMLDivElement;
	let ready = $state(false);
	let failed = $state(false);
	/* Landing mode (walkCue handshake): she stays INVISIBLE until the walk
	   actually starts — no fragment of her peeks during the scroll cross.
	   Deliberately snapshots the INITIAL value (the svelte warning below is
	   intended): the cue flips true once the scene dresses, and the reveal
	   must have been held from the start — a late flip must never un-hold
	   an already-visible model. */
	// svelte-ignore state_referenced_locally
	let holdReveal = walkCue !== null;

	const CAM_Z = 3.7;

	/* Low-power detection for adaptive quality. Re-evaluated on resize: an
	   outer window (desktop resize) doesn't change CPU budget but does change
	   canvas size, and phones report ≤4 cores. Deliberately conservative:
	   this only LOWERS backing-store resolution and MSAA on small screens —
	   desktops keep full quality, nothing else changes. */
	const isSmallScreen = () => window.matchMedia('(max-width: 640px)').matches;
	const isLowPower = () => {
		const cores = navigator.hardwareConcurrency;
		return isSmallScreen() && (cores === undefined || cores <= 4);
	};

	// Effective painted opacity: the product of every ancestor's opacity. The
	// stage can sit behind a fading wrapper (the pinned scene fades her in),
	// so geometry alone can't tell us whether she is actually on screen.
	const effectiveOpacity = (el: HTMLElement) => {
		let o = 1;
		let n: HTMLElement | null = el;
		while (n && n !== document.documentElement) {
			o *= parseFloat(getComputedStyle(n).opacity || '1');
			if (o < 0.01) return 0;
			n = n.parentElement;
		}
		return o;
	};

	async function boot() {
		if (typeof window === 'undefined') return;
		const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isLowPower(), alpha: true });
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
		// Full-body framing, model seated slightly low so headlines clear her face.
		camera.position.set(0, 0.9, CAM_Z);
		camera.lookAt(0, 0.78, 0);

		// Studio lighting (three-point, no shadows — cheap)
		const key = new THREE.DirectionalLight(0xffffff, 1.15);
		key.position.set(0.6, 1.4, 1.2);
		scene.add(key);
		const fill = new THREE.DirectionalLight(0xffffff, 0.4);
		fill.position.set(-0.8, 0.6, 0.6);
		scene.add(fill);
		scene.add(new THREE.AmbientLight(0xffffff, 0.55));

		// Carga del VRM: descarga cifrada + descifrado en memoria + parse.
		// El archivo público (.lcx) nunca es un .vrm legible.
		let vrm: any = null;
		let isVRM1 = true;
		let armSign = -1;
		try {
			const data = await fetchProtectedAsset(url);
			const loader = new GLTFLoader();
			loader.register((parser: any) => new VRMLoaderPlugin(parser));
			const gltf = await loader.parseAsync(data, '');
			vrm = gltf.userData.vrm;
			isVRM1 = vrm.meta?.metaVersion === '1';
			armSign = isVRM1 ? -1 : 1;
			VRMUtils.removeUnnecessaryVertices(vrm.scene);
			VRMUtils.removeUnnecessaryJoints(vrm.scene);
			vrm.scene.traverse((o: any) => (o.frustumCulled = false));

			// Face camera: VRM1 faces +Z natively; VRM0 needs a 180° flip.
			vrm.scene.rotation.y = isVRM1 ? 0 : Math.PI;

			// Natural base pose: arms down (Z sign flips between VRM versions).
			// VRMA clips override these bones while they play.
			const humanoid = vrm.humanoid;
			for (const [bone, rx, ry, rz] of [
				['leftUpperArm', Math.PI * 0.05, 0, armSign * Math.PI * 0.4],
				['rightUpperArm', Math.PI * 0.05, 0, -armSign * Math.PI * 0.4],
				['leftLowerArm', 0, -Math.PI * 0.1, 0],
				['rightLowerArm', 0, Math.PI * 0.1, 0]
			] as const) {
				const node = humanoid?.getNormalizedBoneNode(bone);
				if (node) node.rotation.set(rx, ry, rz);
			}
			vrm.humanoid.update();

			// Ground + center (Z only; X offset is driven by the walk entrance)
			const box = new THREE.Box3().setFromObject(vrm.scene);
			const center = box.getCenter(new THREE.Vector3());
			vrm.scene.position.z = -center.z;
			vrm.scene.position.y = -box.min.y;

			scene.add(vrm.scene);
			// Landing mode: the reveal waits for the walk cue (holdReveal) —
			// the canvas stays empty while the user crosses the transition.
			if (!holdReveal) ready = true;
		} catch (e) {
			console.warn('VrmStage: load failed', e);
			failed = true;
			return;
		}

		// ── Walk-in entrance (preserved) ──
		// She waits off-frame to the right; the first time the stage is actually
		// visible she walks to center on a luna-walk.vrma loop, then hands over
		// to the luna-walk-rest.vrma idle with a crossfade. Reduced motion: none.
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

		let mixer: THREE.AnimationMixer | null = new THREE.AnimationMixer(vrm.scene);
		let walkAction: THREE.AnimationAction | null = null;
		let idleAction: THREE.AnimationAction | null = null;
		if (walkAnimation) {
			try {
				const walk = await loadVrmAnimation(walkAnimation);
				walkAction = mixer.clipAction(createVRMAnimationClip(walk, vrm));
				walkAction.setLoop(THREE.LoopRepeat, Infinity);
			} catch (e) {
				console.warn('VrmStage: walk VRMA unavailable', e);
			}
		}
		if (idleAnimation) {
			try {
				const idle = await loadVrmAnimation(idleAnimation);
				idleAction = mixer.clipAction(createVRMAnimationClip(idle, vrm));
			} catch (e) {
				console.warn('VrmStage: idle VRMA unavailable', e);
			}
		}
		// No clips at all: drop the mixer so the manual sway fallback stays alive.
		if (!walkAction && !idleAction) mixer = null;

		// Pre-arm the entrance POSE (scene/landing mode): the walk's FIRST
		// FRAME is applied and held paused from the moment she can paint, so
		// her very first visible pixel is already mid-stride — never the base
		// arms-down pose standing still and THEN starting to move (the ugly
		// gap the user flagged). startWalkIn() only releases this armed clip;
		// reset().play() begins at time 0 — the same frame she was holding.
		if (walkCue !== null) {
			const arm = (a: THREE.AnimationAction | null) => {
				if (!a) return;
				a.play();
				a.paused = true;
			};
			if (reducedMotion.matches) {
				arm(idleAction); // rest pose from first paint; startWalkIn crossfades it live
			} else {
				arm(walkAction ?? idleAction);
			}
		}

		// She performs her entrance AT CENTER: position is final from the
		// start — the .vrma clip alone does the acting.
		const centerBox = new THREE.Box3().setFromObject(vrm.scene);
		const baseX = -centerBox.getCenter(new THREE.Vector3()).x;
		// She performs the entrance IN PLACE at center: the .vrma clip IS the
		// whole entrance. No code-driven slide — gliding her across the floor
		// with a transform while the stride played is what read as her being
		// dragged/pulled by an invisible hand.
		vrm.scene.position.x = baseX;

		const WALK_IN_S = 3.6; // a couple of natural stride cycles, then the rest pose takes over
		let entranceStarted = false;
		let walking = false;
		let walkT = 0;

		// She only starts walking when she is ACTUALLY watched. Priority:
		// 1) walkCue (scene handshake) — the landing says the dressed frame
		//    is on screen; the user can sit and watch the entrance play.
		// 2) standalone usage: painted-visibility fraction gate (25% of the
		//    stage visible). The old 4%-opacity gate fired the whole entrance
		//    while the user was still crossing the transition — they arrived
		//    too late, the walk was over. That is exactly what we never do.
		let seenEnough = false; // 25% of the stage painted-visible on screen
		const maybeStartWalkIn = () => {
			if (entranceStarted) return;
			if (walkCue !== null) {
				// Strict cue: the entrance fires ONLY when the scene says the
				// dressed LUNA frame is on screen (settled by snap or finger).
				// Until then she holds the pre-armed mid-stride frame — still,
				// composed, mid-pose. The user sits down and the walk plays
				// ENTIRELY in front of them; never mid-transition, never early.
				if (!walkCue) return;
				startWalkIn();
				return;
			}
			if (!visible || !seenEnough) return;
			if (effectiveOpacity(wrap) < 0.04) return;
			startWalkIn();
		};

		const startWalkIn = () => {
			if (entranceStarted) return;
			entranceStarted = true;
			// Landing mode: this is the moment she becomes visible — the walk
			// plays in full in front of the user (no fragment peeking before).
			if (holdReveal) {
				holdReveal = false;
				ready = true;
			}
			if (reducedMotion.matches) {
				idleAction?.reset().fadeIn(0.25).play();
				return;
			}
			// The VRMA clip is the entire performance: she walks IN PLACE at
			// center for a couple of stride cycles, then hands over to the rest
			// pose. Every mount performs it — the first reveal AND each form
			// switch: summoning a new model means she makes her own entrance.
			// (Pre-armed scene mode: reset() starts from the same frame 0 she
			// was holding — the release is seamless, no pose jump.)
			walking = true;
			walkT = 0;
			walkAction?.reset().play();
			walkAction && (walkAction.timeScale = 1); // natural stride
		};

		// Resize handling
		// Adaptive framing: the camera distance derives from the model's own
		// half-height and the canvas shape, so the WHOLE body fits on any
		// viewport — huge 4K screens were clipping her head with the fixed
		// distance. Padding keeps headroom + floor margin around her.
	const FRAME_PAD = 1.16; // tight-ish framing: she reads a touch larger while keeping safe head/feet air
	const HALF_FOV = Math.tan(((30 * Math.PI) / 180) / 2);
	// GPU viewport ceiling: zooming the browser OUT (e.g. to 20%) inflates the
	// canvas's CSS size until the backing store would exceed what the GPU can
	// render — the driver then CLAMPS the drawing buffer and the top of the
	// frame (her head) is cropped off. Scale the pixel ratio down to fit.
	const MAX_VIEWPORT_DIM = (() => {
		try {
			const gl = renderer.getContext();
			const dim = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as number[] | undefined;
			return dim?.[0] || 4096;
		} catch {
			return 4096;
		}
	})();
	const BASE_DPR = Math.min(devicePixelRatio, isLowPower() ? 1.5 : 2);
	const sizeTo = () => {
		const w = wrap.clientWidth;
		const h = wrap.clientHeight;
		const safeDpr = Math.max(Math.min(BASE_DPR, MAX_VIEWPORT_DIM / Math.max(w, h, 1)), 0.35);
		renderer.setPixelRatio(safeDpr);
		renderer.setSize(w, h, false);
			camera.aspect = w / Math.max(h, 1);
			if (vrm) {
				const box = new THREE.Box3().setFromObject(vrm.scene);
				const halfH = Math.max((box.max.y - box.min.y) / 2, 0.5);
				const cy = (box.max.y + box.min.y) / 2;
				const dist = (halfH * FRAME_PAD) / HALF_FOV;
				// Near-symmetric framing: equal margin above her head and below
				// her feet. The old down-tilted variant let extreme viewports
				// (20% browser zoom) shave her head off the top of the frame.
				camera.position.set(0, cy + 0.05, dist);
				camera.lookAt(0, cy, 0);
			}
			camera.updateProjectionMatrix();
		};
		const ro = new ResizeObserver(sizeTo);
		ro.observe(wrap);
		sizeTo();

		// Mouse look (body yaw follows the pointer)
		const look = { x: 0, y: 0 };
		const onPointer = (e: PointerEvent) => {
			const r = wrap.getBoundingClientRect();
			look.x = ((e.clientX - r.left) / r.width) * 2 - 1;
			look.y = ((e.clientY - r.top) / r.height) * 2 - 1;
		};
		wrap.addEventListener('pointermove', onPointer);

		// Drag to rotate (companion3d style): grab her and turn her around.
		// Horizontal drag only — `touch-action: pan-y` keeps vertical scroll free.
		let dragging = false;
		let dragYaw = 0;
		let yawVelocity = 0;
		let lastDragX = 0;
		const onDown = (e: PointerEvent) => {
			dragging = true;
			lastDragX = e.clientX;
			wrap.style.cursor = 'grabbing';
		};
		const onDragMove = (e: PointerEvent) => {
			if (!dragging) return;
			const dx = e.clientX - lastDragX;
			lastDragX = e.clientX;
			dragYaw += dx * 0.012;
			yawVelocity = dx * 0.012;
		};
		const onUp = () => {
			dragging = false;
			wrap.style.cursor = 'grab';
		};
		wrap.addEventListener('pointerdown', onDown);
		window.addEventListener('pointermove', onDragMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);

		// Render loop: only while visible; pauses with the tab hidden.
		let visible = true;
		// Second observer: fires only when a real fraction of the stage is
		// on screen (25%) — the entrance is a performance, she doesn't do
		// it for a sliver of canvas peeking at the viewport edge.
		const ioWalk = new IntersectionObserver(
			(entries) => {
				seenEnough = seenEnough || entries[0].intersectionRatio >= 0.25;
				if (seenEnough) {
					ioWalk.disconnect();
					maybeStartWalkIn();
				}
			},
			{ threshold: [0.25, 0.4, 0.6] }
		);
		ioWalk.observe(wrap);

		const io = new IntersectionObserver(
			(entries) => {
				visible = entries[0].isIntersecting;
				// Painted on screen: try the entrance (gated by seenEnough).
				if (visible) maybeStartWalkIn();
			},
			{ threshold: 0.05 }
		);
		io.observe(wrap);

		// Scroll reaction: subtle drift while the section travels the viewport.
	let sFrame = 0;
	const applyScroll = () => {
		sFrame = 0;
		// During her entrance the stage holds PERFECTLY still: the subtle
		// scroll parallax pauses so no scroll input can wobble, accelerate
		// or stall her performance. It resumes with the next scroll event
		// once she has settled.
		if (walking) return;
			const r = wrap.getBoundingClientRect();
			const vh = window.innerHeight;
			const p = Math.min(Math.max((vh - r.top) / (vh + r.height), 0), 1);
			wrap.style.setProperty('--vrm-shift', `${((p - 0.5) * -44).toFixed(1)}px`);
			wrap.style.setProperty('--vrm-zoom', `${(1 + p * 0.03).toFixed(3)}`);
		};
		const queueScroll = () => {
			if (!sFrame) sFrame = requestAnimationFrame(applyScroll);
		};
		window.addEventListener('scroll', queueScroll, { passive: true });
		window.addEventListener('resize', queueScroll);
		applyScroll();

		const clock = new THREE.Clock();
		let raf = 0;
		const tick = () => {
			raf = requestAnimationFrame(tick);
			if (!visible || document.hidden) return;
			const dt = Math.min(clock.getDelta(), 0.05);
			const t = clock.elapsedTime;

			/* Landing hold: the model is loaded, pre-armed and INVISIBLE until
			   the scene raises the walk cue — while held, there is literally
			   nothing to paint, so skip the whole render+sim step (the rAF tick
			   stays alive so the cue flip inside maybeStartWalkIn() still
			   resolves the same frame). On a low-end phone crossing the
			   transition this saves ~5-8 ms/frame of GPU+CPU during the
			   heaviest stretch of the scrub. */
			if (holdReveal) {
				maybeStartWalkIn();
				return;
			}

			// Walk-in: the .vrma clip plays in full, wall-clock driven so no
			// scroll/refresh delta can accelerate or stall it. When it ends she
			// hands over to the rest pose with a soft crossfade — no code ever
			// translates her (that was the "being pulled" look).
			if (walking) {
				walkT += dt;
				if (walkT >= WALK_IN_S) {
					walking = false;
					walkAction?.fadeOut(0.45);
					idleAction?.reset().fadeIn(0.45).play();
				}
			}

			if (mixer) {
				mixer.update(dt);
			} else {
				// No VRMA at all: manual sway keeps her alive
				vrm.scene.rotation.z = Math.sin(t * 0.8) * 0.015;
				const leftArm = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm');
				const rightArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm');
				if (leftArm && rightArm) {
					const sway = Math.sin(t * 0.9) * 0.022;
					leftArm.rotation.z = armSign * Math.PI * 0.4 + sway;
					rightArm.rotation.z = -armSign * Math.PI * 0.4 - sway;
				}
			}

			// Body yaw = pointer follow + drag rotation with inertia — at scene
			// level so it never fights the VRMA bone animation.
			if (!dragging) {
				dragYaw += yawVelocity;
				yawVelocity *= 0.94;
			}
			const baseY = isVRM1 ? 0 : Math.PI;
			const targetY = baseY + look.x * 0.22 + dragYaw;
			vrm.scene.rotation.y += (targetY - vrm.scene.rotation.y) * 0.08;

			vrm.humanoid.update();
			vrm.update(dt);
			renderer.render(scene, camera);
		};
		tick();

		return () => {
			cancelAnimationFrame(raf);
			cancelAnimationFrame(sFrame);
			ro.disconnect();
			io.disconnect();
			window.removeEventListener('scroll', queueScroll);
			window.removeEventListener('resize', queueScroll);
			wrap.removeEventListener('pointermove', onPointer);
			wrap.removeEventListener('pointerdown', onDown);
			window.removeEventListener('pointermove', onDragMove);
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onUp);
			mixer?.stopAllAction();
			VRMUtils.deepDispose(vrm.scene);
			renderer.dispose();
		};
	}

	let cleanup: (() => void) | undefined;

	onMount(() => {
		// Lazy: only load the 18MB model when the stage approaches the viewport
		const io = new IntersectionObserver(
			async (entries) => {
				if (entries[0].isIntersecting && !cleanup) {
					io.disconnect();
					cleanup = await boot();
				}
			},
			{ rootMargin: '400px' }
		);
		io.observe(wrap);
		return () => cleanup?.();
	});
</script>

<div class="vrm-stage" bind:this={wrap} role="img" aria-label="Modelo 3D de Luna renderizado en vivo" style="height: {height}">
	<div class="vrm-scroll">
		<div class="vrm-float" class:vrm-ready={ready}>
			<canvas bind:this={canvas}></canvas>
		</div>
	</div>
	{#if !ready && !failed}
		<div class="vrm-stage-fallback" aria-hidden="true"></div>
	{/if}
</div>

<style>
	.vrm-stage {
		position: relative;
		width: 100%;
		overflow: hidden;
		cursor: grab;
		touch-action: pan-y;
	}

	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}

	/* Scroll reaction layer: driven by --vrm-shift / --vrm-zoom vars */
	.vrm-scroll {
		position: absolute;
		inset: 0;
		transform: translate3d(0, var(--vrm-shift, 0px), 0) scale(var(--vrm-zoom, 1));
		will-change: transform;
	}

	/* Entrance: the model rises and sharpens once loaded — slow enough to
	   enjoy, never a pop-in */
	.vrm-float {
		position: absolute;
		inset: 0;
		opacity: 0;
		transform: translateY(30px) scale(0.97);
		filter: blur(10px);
		transition:
			opacity 1.4s var(--ease-brand),
			transform 1.7s var(--ease-brand),
			filter 1.2s var(--ease-brand);
	}

	/* `.vrm-ready` is toggled at runtime; keep it global-safe for Svelte */
	.vrm-float:global(.vrm-ready) {
		opacity: 1;
		transform: none;
		filter: blur(0);
	}

	.vrm-stage-fallback {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(38% 30% at 50% 74%, color-mix(in srgb, var(--text-primary) 9%, transparent), transparent 70%);
	}
</style>
