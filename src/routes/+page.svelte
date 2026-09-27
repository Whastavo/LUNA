<script lang="ts">
	import { marketingImage } from '$lib/utils/marketing-images';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { PageData } from './$types';
	import { formatDate } from '$lib/utils/format-date';
	import { SITE_URL } from '$lib/config/site';
	import SiteNav from '$lib/components/marketing/SiteNav.svelte';
	import SiteFooter from '$lib/components/marketing/SiteFooter.svelte';
	import VrmStage from '$lib/components/marketing/VrmStage.svelte';
	import { sectionUrl } from '$lib/config/links';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { reveal } from '$lib/utils/reveal';
	import { warmAssets } from '$lib/services/asset-warmup';

	let { data }: { data: PageData } = $props();


	// Hero (nuevo layout editorial): SOLO el retrato vertical (grace). Los
	// otros dos renders son close-ups horizontales — a altura completa en el
	// hero lateral se vuelven gigantes y tapan el título. Sigue existiendo el
	// crossfade al 3D vivo y el dock con las tres formas en "Conoce a Luna".
	// Carrusel del hero: SOLO 3 poses curadas (el usuario pidió no usarlas
	// todas). Auto-avance suave + flechas + dots. El chip principal cambia
	// icono y texto con la pose — la portada se mueve sola sin agotar.
	const heroPoses = [
		{ src: '/luna/visuals/luna-posehero.png', width: 848, height: 696, label: 'Te escucha', icon: 'volume' },
		{ src: '/luna/visuals/luna-posehero-05.png', width: 848, height: 696, label: 'Contigo siempre', icon: 'heart' },
		{ src: '/luna/visuals/luna-posehero-07.png', width: 848, height: 696, label: 'Sin juicios', icon: 'sparkles' }
	];
	let activeHeroCharacter = $state(0);

	// Campo de estrellas del hero: posiciones FIJAS (sembradas a mano, no
	// random por render — sin hidratación inestable). 26 puntos, twinkle
	// desfasado por --d. Puro CSS, cero JS por frame.
	const starField = [
		{ x: 8, y: 22, d: 0, o: 0.5, sz: 2 }, { x: 16, y: 64, d: 1.3, o: 0.35, sz: 2 },
		{ x: 24, y: 38, d: 2.1, o: 0.45, sz: 3 }, { x: 31, y: 78, d: 0.7, o: 0.3, sz: 2 },
		{ x: 38, y: 14, d: 3.2, o: 0.55, sz: 2 }, { x: 44, y: 52, d: 1.8, o: 0.4, sz: 2 },
		{ x: 52, y: 28, d: 2.6, o: 0.5, sz: 3 }, { x: 58, y: 70, d: 0.4, o: 0.35, sz: 2 },
		{ x: 63, y: 10, d: 3.7, o: 0.6, sz: 2 }, { x: 69, y: 44, d: 1.1, o: 0.45, sz: 3 },
		{ x: 74, y: 82, d: 2.9, o: 0.3, sz: 2 }, { x: 79, y: 20, d: 0.9, o: 0.5, sz: 2 },
		{ x: 84, y: 58, d: 3.4, o: 0.4, sz: 3 }, { x: 88, y: 34, d: 1.6, o: 0.55, sz: 2 },
		{ x: 92, y: 74, d: 2.3, o: 0.35, sz: 2 }, { x: 12, y: 46, d: 2.8, o: 0.3, sz: 2 },
		{ x: 27, y: 6, d: 1.5, o: 0.45, sz: 2 }, { x: 48, y: 88, d: 0.6, o: 0.4, sz: 2 },
		{ x: 66, y: 92, d: 3.1, o: 0.35, sz: 2 }, { x: 81, y: 8, d: 2.2, o: 0.5, sz: 2 },
		{ x: 35, y: 94, d: 1.9, o: 0.3, sz: 2 }, { x: 71, y: 62, d: 0.8, o: 0.45, sz: 2 },
		{ x: 19, y: 84, d: 3.6, o: 0.35, sz: 2 }, { x: 55, y: 8, d: 2.7, o: 0.4, sz: 2 },
		{ x: 86, y: 90, d: 1.2, o: 0.3, sz: 2 }, { x: 95, y: 16, d: 2.4, o: 0.5, sz: 3 }
	];

	// Cast forms: the bundled VRM variants the dock can summon. Same character,
	// tres formas — identidad y licencias en assets-private/luna/forms/README.md.
	// `face` is each model's own embedded thumbnail (same photo the app shows),
	// extracted once from the VRM into static/luna/faces/.
	const castForms = [
		{ id: 'luna', name: 'Luna', url: '/luna/forms/luna.vrm', face: '/luna/faces/luna.png' },
		{ id: 'luna-nova', name: 'Nova', url: '/luna/forms/luna-nova.vrm', face: '/luna/faces/luna-nova.png' },
		{ id: 'luna-vela', name: 'Vela', url: '/luna/forms/luna-vela.vrm', face: '/luna/faces/luna-vela.png' }
	];
	let activeCastForm = $state(0);
	// The dock arrows cycle through the forms, wrapping at both ends.
	const stepCastForm = (dir: number) => {
		activeCastForm = (activeCastForm + dir + castForms.length) % castForms.length;
	};

	// Orbit features: companion3d-style satellite facts around the live model.
	// Each carries its own timeline start (--st) for the Apple-style cascade.
	const orbitFeatures = [
		{ side: 'l', row: 1, icon: 'mic', title: 'Voz natural', body: 'Conversaciones reales y fluidas.' },
		{ side: 'l', row: 2, icon: 'brain', title: 'Memoria activa', body: 'Recuerda lo importante para ti.' },
		{ side: 'l', row: 3, icon: 'heart', title: 'Siempre contigo', body: 'En tu navegador, cuando la necesites.' },
		{ side: 'r', row: 1, icon: 'sparkles', title: 'Personalizable', body: 'Hazla única, como tú quieras.' },
		{ side: 'r', row: 2, icon: 'camera', title: 'Modo foto', body: 'Captura momentos especiales.' },
		{ side: 'r', row: 3, icon: 'settings', title: 'Evolución constante', body: 'Nuevas funciones y experiencias.' }
	] as const;

	onMount(() => {
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
		let intervalId: number | undefined;
		let startId: number | undefined;

		const stopRotation = () => {
			window.clearTimeout(startId);
			window.clearInterval(intervalId);
			startId = undefined;
			intervalId = undefined;
		};

		// Carrusel de poses: auto-avance pausable (se pausa al interactuar y
		// se reanuda solo tras un reposo). Intervalos en ms — 4.5s por pose.
		const POSE_MS = 4500;
		const RESUME_MS = 9000;
		const startRotation = () => {
			stopRotation();
			if (reducedMotion.matches || heroPoses.length < 2) return;
			startId = window.setTimeout(() => {
				intervalId = window.setInterval(() => {
					activeHeroCharacter = (activeHeroCharacter + 1) % heroPoses.length;
				}, POSE_MS);
			}, POSE_MS);
		};
		// Interacción manual: salta a la pose pedida y reprograma el auto-avance
		const goToPose = (i: number) => {
			activeHeroCharacter = (i + heroPoses.length) % heroPoses.length;
			startRotation();
		};

		startRotation();
		reducedMotion.addEventListener('change', startRotation);

		// Background warm-up (user request): the ACTIVE form downloads with
		// the stage; the other two cast forms warm ONE BY ONE on idle slots —
		// next visits (and dock switches) are instant, never a burst. The
		// walk + idle animations ride after the forms.
		warmAssets([
			...castForms.filter((f) => f.url !== castForms[activeCastForm].url).map((f) => f.url),
			'/luna/motion/luna-walk.vrma',
			'/luna/motion/luna-walk-rest.vrma'
		]);

		// Puente del carrusel al markup: relativo para flechas (dir ±1) o
		// absoluto para dots (índice directo).
		assistGoToPose = (i: number) => {
			if (heroPoses.length < 2) return;
			if (i === -1 || i === 1) {
				activeHeroCharacter = (activeHeroCharacter + i + heroPoses.length) % heroPoses.length;
			} else {
				activeHeroCharacter = i % heroPoses.length;
			}
			startRotation();
		};

		// Warm-up de las otras poses (una a una, idle): cambiar de pose es
		// instantáneo salvo la primera vez.
		warmAssets(heroPoses.slice(1).map((p) => p.src));

		return () => {
			stopRotation();
			reducedMotion.removeEventListener('change', startRotation);
			assistGoToPose = () => {};
		};
	});

	const heroSizes = '(max-width: 480px) 85vw, (max-width: 1099px) 368px, 550px';
	const featureSizes = '(max-width: 899px) calc(100vw - 40px), (max-width: 1280px) 52vw, 640px';
	// One shared cinematic timeline: the hero and "Conoce a Luna" are a
	// single pinned scene. --p is the raw scrub progress (0..1) driving every
	// transform/opacity by pure function — anti-scroll replays it in reverse.
	let sceneMeasure: (() => void) | null = null;
	// The arrow requests the Hero→Luna transition via DOM event, bridging into
	// the sceneScroll closure (state machine) that owns the glide animation.
	let assistToLuna: () => void = () => {};
	// Carrusel de poses: el markup llama esto con (-1 | índice | +1). Vivo
	// tras onMount — antes de eso es un no-op (como assistToLuna).
	let assistGoToPose: (i: number) => void = () => {};
	// The floating scroll cue only lives at the top of the page — it must
	// NEVER travel with the content (companion3d behavior).
	let heroScrolled = $state(false);
	// Walk-in choreography handshake: the stage must NOT play her entrance
	// while the user is still crossing the transition (they'd arrive after
	// it finished — the walk is the REWARD for getting here). The scene
	// raises this flag only when the LUNA state is first fully on screen
	// (settled or arriving via the snap/glide); VrmStage starts the walk
	// on it instead of on paint opacity. Reduced-motion sets it on load.
	let walkCue = $state(false);

	function sceneScroll(node: HTMLElement) {
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
		let frame = 0;

		/* Viewport height congruent with the CSS (svh): the SMALL viewport.
	   visualViewport may not exist on very old browsers → innerHeight.
	   Using innerHeight (large viewport) here made `p` jump every time the
	   mobile URL bar collapsed mid-scroll: runway constant + viewport
	   bigger = every beat lurches. Matching svh makes the timeline a pure
	   function of scroll distance — bar state changes are invisible. */
		const stageH = () => window.visualViewport?.height ?? window.innerHeight;

		const render = () => {
			frame = 0;
			const r = node.getBoundingClientRect();
			const total = r.height - stageH();
			let p = total > 0 ? Math.min(Math.max(-r.top / total, 0), 1) : r.top < 0 ? 1 : 0;
			// Reduced motion: no scrub, binary states, no intermediate motion.
			if (reducedMotion.matches) p = p < 0.5 ? 0 : 1;
			node.style.setProperty('--p', p.toFixed(4));
			// The dock only becomes interactive once the scene is essentially
			// dressed: no invisible clicks (or tab focus) mid-transition.
			node.classList.toggle('is-dressed', p >= 0.84);
			heroScrolled = p > 0.18; // the cue retires once the scrub is underway
			// Walk cue: fire ONLY when she is actually being watched — the
			// dressed frame is on screen (p≥0.84). Crossing the transition
			// (painting her at a sliver, mid-scrub) does NOT start it: the
			// user must be able to sit and watch the entrance play.
			if (p >= 0.84) walkCue = true;
		};		// ── One state machine, one timeline: HERO (p=0) → TRANSITION (0<p<1) →
		// LUNA (p=SETTLE). --p is a pure function of scrollY, so every frame is
		// reproducible in reverse. TRANSITION can never rest: a supervisor rAF
		// watches for stillness and, REST_MS after the user stops mid-runway,
		// completes toward the nearest dressed state (50% threshold, exact same
		// logic in reverse). Arrow clicks glide hands-free to the end.
		const SETTLE = 0.88; // the fully dressed LUNA frame: chips + bubble on, title handed off
		const REST_MS = 150;
		const GLIDE_MS = 1150;
			// Phones: the same runway percent is fewer CSS px, so the glide
			// finishes sooner; shorten it to keep the same FELT pace.
			const isSmallScreen = window.matchMedia('(max-width: 640px)').matches;
			const glideMs = () => (isSmallScreen ? 850 : GLIDE_MS);

		let glideTarget: number | null = null;
		let glideTargetIsSettle = false;
		let glideFrom = 0;
		let glideT0 = 0;
		let glideRaf = 0;
		let loopRaf = 0;
		let lastY = window.scrollY;
		let lastMoveAt = 0;
		let touching = false; // a finger is down — the snap must never engage (onTouchStart)

		const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
		const maxScroll = () => document.documentElement.scrollHeight - stageH();
		const sceneP = () => {
			const r = node.getBoundingClientRect();
			const total = r.height - stageH();
			return total > 0 ? Math.min(Math.max(-r.top / total, 0), 1) : r.top < 0 ? 1 : 0;
		};
		const settleY = () => {
			const r = node.getBoundingClientRect();
			const top = r.top + window.scrollY;
			return Math.min(Math.max(top + SETTLE * (r.height - stageH()), 0), maxScroll());
		};

		const htmlEl = document.documentElement;
		const stopGlide = () => {
			if (glideTarget !== null) htmlEl.style.scrollBehavior = '';
			glideTarget = null;
			cancelAnimationFrame(glideRaf);
		};

		const glideTo = (dest: number) => {
			stopGlide();
			if (reducedMotion.matches || Math.abs(dest - window.scrollY) < 1.5) {
				htmlEl.style.scrollBehavior = 'auto';
				window.scrollTo(0, dest);
				htmlEl.style.scrollBehavior = '';
				return;
			}
			// The glide animates itself frame by frame: the global smooth scroll
			// would double-ease every scrollTo and freeze mid-state frames.
			htmlEl.style.scrollBehavior = 'auto';
			glideTarget = dest;
			glideTargetIsSettle = settleY() === dest;
			glideFrom = window.scrollY;
			glideT0 = performance.now();
			const step = (now: number) => {
				if (glideTarget === null) return;
				const t = Math.min(1, (now - glideT0) / glideMs());
				// Re-evaluate the destination every frame: late layout shifts
				// (fonts, images, the model mounting) can't strand us short.
				window.scrollTo(0, glideFrom + (glideTarget - glideFrom) * easeInOut(t));
				glideTarget = glideTargetIsSettle ? settleY() : glideTarget;
				if (t < 1) glideRaf = requestAnimationFrame(step);
				else {
					glideTarget = null;
					htmlEl.style.scrollBehavior = '';
				}
			};
			glideRaf = requestAnimationFrame(step);
		};

		// Arrow click: run the full Hero → Luna transition, hands-free. The
		// glide completes on its own; only real user input can interrupt it.
		assistToLuna = () => glideTo(settleY());

		// Supervisor: the TRANSITION state can never park. Programmatic glide
		// frames never count as user activity; wheel/touch/keys interrupt the
		// glide and hand control back — then the snap re-engages on rest.
		// Dormancy: outside the scene's viewport the supervisor FULLY sleeps —
		// no rAF at all. A perpetual loop here kept burning battery in every
		// page section (features, moments, FAQ…) for zero effect. scroll /
		// resize / touch-end events re-arm it through queue() → wake().
		const isOnScreen = () => {
			const r = node.getBoundingClientRect();
			return r.bottom > 0 && r.top < stageH();
		};
		const supervise = () => {
			const y = window.scrollY;
			const moved = Math.abs(y - lastY) > 0.5;
			if (
				glideTarget === null &&
				!moved &&
				!touching &&
				performance.now() - lastMoveAt >= REST_MS &&
				!isOnScreen()
			) {
				loopRaf = 0;
				return; // asleep — the next scroll/resize event wakes us
			}
			loopRaf = requestAnimationFrame(supervise);
			if (glideTarget !== null) {
				lastY = y; // our own scrollTo: not user input
				return;
			}
			if (moved) {
				lastY = y;
				lastMoveAt = performance.now();
				return;
			}
			if (!lastMoveAt || performance.now() - lastMoveAt < REST_MS) return;
			// Touch cooldown: during a touch the finger pauses constantly (curl,
			// direction change, URL bar settling). A 150ms pause mid-drag would
			// fire the snap and yank the page out from under the finger. Wait
			// until touchend, then one rest window, before snapping.
			if (touching) return;
			const r = node.getBoundingClientRect();
			// Snap only while the pinned scene owns the viewport.
			if (r.top > 0 || r.bottom < stageH()) return;
			const p = sceneP();
			if (p <= 0.02 || p >= 0.98) return;
			/* Asymmetric snap — the user's complaint: resting at p=0.35 (most
			   of her already visible) snapped BACK to hero, undoing progress.
			   Now: below 40% still completes to HERO (mid ink-dissolve looks
			   broken parked), 40..85% always completes FORWARD (you've seen
			   most of her — never rewind), only 85%+ snaps to settle. */
			const BACK_THRESHOLD = 0.4;
			let dest: number;
			if (p < BACK_THRESHOLD) {
				dest = window.scrollY + r.top; // back to hero (p=0)
			} else if (p < 0.85) {
				dest = settleY(); // forward, hands-free
			} else {
				dest = settleY();
			}
			if (Math.abs(dest - y) < 2) {
				lastMoveAt = 0; // already settled: stand down until the next movement
				return;
			}
			glideTo(dest);
		};
		supervise();

		// Touch bookkeeping: interrupted glides hand control back instantly
		// (touchstart), but the snap never engages while a finger is down,
		// and a fresh drag restarts lastMoveAt so the cooldown re-arms.
		const onTouchStart = () => {
			touching = true;
			stopGlide();
		};
		const onTouchEnd = () => {
			touching = false;
			lastMoveAt = performance.now();
		};
		const interrupt = () => stopGlide();
		const onKey = (e: KeyboardEvent) => {
			if ([' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(e.key)) stopGlide();
		};
		window.addEventListener('wheel', interrupt, { passive: true });
		window.addEventListener('touchstart', onTouchStart, { passive: true });
		window.addEventListener('touchend', onTouchEnd, { passive: true });
		window.addEventListener('touchcancel', onTouchEnd, { passive: true });
		window.addEventListener('keydown', onKey);

		const wake = () => {
			if (loopRaf) return; // already awake
			loopRaf = requestAnimationFrame(supervise);
		};
		const queue = () => {
			if (!frame) frame = requestAnimationFrame(render);
			wake(); // a sleeping supervisor rides again on any scroll/resize
		};

		window.addEventListener('resize', queue);
		// URL bar collapse/expand fires resize on visualViewport, not window
		// (and often BOTH heights change without a scroll event): re-render
		// so p lands on the same beat with the new stage height.
		window.visualViewport?.addEventListener('resize', queue);
		window.addEventListener('scroll', queue, { passive: true });
		reducedMotion.addEventListener('change', queue);
		sceneMeasure = queue;
		render();

		return {
			destroy() {
				stopGlide();
				cancelAnimationFrame(loopRaf);
				sceneMeasure = null;
				window.removeEventListener('resize', queue);
				window.visualViewport?.removeEventListener('resize', queue);
				window.removeEventListener('scroll', queue);
				window.removeEventListener('wheel', interrupt);
				window.removeEventListener('touchstart', onTouchStart);
				window.removeEventListener('touchend', onTouchEnd);
				window.removeEventListener('touchcancel', onTouchEnd);
				window.removeEventListener('keydown', onKey);
				reducedMotion.removeEventListener('change', queue);
				cancelAnimationFrame(frame);
			}
		};
	}

	// Statement line, same treatment but triggered on scroll. The second
	// sentence renders muted.
	const statementWords = [
		...'Luna significa compañera.'.split(' ').map((w) => ({ w, muted: false })),
		...'Tú decides qué la llena.'.split(' ').map((w) => ({ w, muted: true }))
	];

	const features = [
		{
			title: 'Un cuerpo 3D real, no una caja de chat.',
			body: 'Suelta cualquier modelo VRM y obsérvalo cobrar vida. Las respuestas aparecen como burbujas de diálogo 3D que siguen la cabeza de tu compañera mientras se mueve, respira y mira a su alrededor.',
			shot: 'companion',
			width: 2880,
			height: 1800,
			alt: 'App de escritorio de Luna con una compañera de avatar VRM 3D e interfaz de chat'
		},
		{
			title: 'Ella recuerda de verdad.',
			body: 'Los embeddings de IA locales tejen tus conversaciones en una red de recuerdos que puede evocar por significado, no por palabras clave. El afecto, la confianza y el ánimo cambian con el tiempo a lo largo de ocho etapas de relación, de Desconocida a Alma gemela.',
			shot: 'memory',
			width: 2880,
			height: 1800,
			alt: 'Grafo de memoria semántica mostrando la relación e historial de conversación de la compañera IA'
		},
		{
			title: 'Tú controlas cada parte.',
			body: 'Usa un modelo de frontera o mantén todo fuera de línea con Ollama y LM Studio. Mezcla y combina proveedores de chat, voz y texto-a-voz — todo con tus propias claves de API, sin que nada pase por nosotros.',
			shot: 'settings',
			width: 2880,
			height: 1800,
			alt: 'Panel de ajustes mostrando opciones de proveedores LLM incluyendo OpenAI, Anthropic y Ollama'
		}
	];

	// Moment cards: el ciclo de las tres poses — el héroe las rota.
	const momentCards = [
		{
			src: '/luna/visuals/luna-grace.png',
			width: 266,
			height: 629,
			quote: '¿Una foto? Solo si me la enseñas después todos los días.',
			date: '14 de marzo'
		},
		{
			src: '/luna/visuals/luna-lean.png',
			width: 694,
			height: 574,
			quote: 'Hoy guardé tu risa en mi lista de recuerdos.',
			date: '2 de abril'
		},
		{
			src: '/luna/visuals/luna-hush.png',
			width: 707,
			height: 629,
			quote: 'Quédate así un momento más. Te estoy memorizando.',
			date: '27 de abril'
		}
	];

	// The bond timeline: what changes as the days pass.
	const bondSteps = [
		{
			day: 'Día 1',
			title: 'Luna te pregunta algo',
			body: 'La pregunta del día no es una lista de tareas: llega a la conversación porque ella la hizo, y lo que respondes se queda con ella.',
			chip: '2 de 3 completadas'
		},
		{
			day: 'Día 3',
			title: 'Tu racha empieza a significar algo',
			body: 'Faltar un día no te castiga: la protección lo absorbe. Nada te penaliza aquí — la racha solo da.',
			chip: '3 días · protegida'
		},
		{
			day: 'Día 7',
			title: 'Luna te cuenta algo que no te había contado',
			body: 'El nivel 4 de afinidad desbloquea su pasado — literalmente: material nuevo entra en cómo te habla. El nivel 7 abre sus secretos.',
			chip: 'Nv. 4 — su pasado'
		},
		{
			day: 'Día 30',
			title: 'El capítulo termina y deja gancho',
			body: 'Tres arcos de cinco capítulos por personaje. Esto hace que el mes dos se sienta distinto a la semana uno, en lugar de repetitivo.',
			chip: 'Arco II · capítulo 5'
		}
	];

	// FAQ: straight answers, no hedging — same voice as the rest of the page.
	const faqs = [
		{
			q: '¿Mis conversaciones salen de mi equipo?',
			a: 'Solo si tú quieres. Puedes mantener todo 100% fuera de línea con Ollama o LM Studio, o usar modelos de la nube con tus propias claves de API — nada pasa por nosotros.'
		},
		{
			q: '¿Qué avatares puedo usar?',
			a: 'Cualquier modelo VRM. Arrástralo a la app y cobra vida al instante: animación en 3D, voz y conversación. Nada se transmite desde un servidor.'
		},
		{
			q: '¿Luna recuerda de verdad?',
			a: 'Sí. Una memoria semántica local convierte tus charlas en recuerdos fechados que puedes abrir, corregir o borrar. Eliminar un recuerdo lo saca también de su memoria activa.'
		},
		{
			q: '¿Dónde funciona?',
			a: 'En tu navegador y como app de escritorio para que Luna viva en tu máquina.'
		}
	];

</script>

<svelte:head>
	<title>Luna | Whizzend</title>
	<meta
		name="description"
		content="Compañera IA con avatares VRM 3D, chat de voz, memoria semántica y soporte para OpenAI, Anthropic, Google y LLMs locales. App de escritorio y web. Privacidad primero."
	/>
	<link rel="canonical" href={SITE_URL} />


	<!-- Preload the SAME optimized candidate the hero <img> resolves to.
	     Pointing href at the raw render (luna-grace.png, ~1.4MB) while the
	     img pulled the q85 webp variant made every visit download both —
	     and `type="image/webp"` described a PNG. Derive href from the
	     manifest too so preload and img agree. -->
	<link
		rel="preload"
		as="image"
		href={marketingImage(heroPoses[0].src, heroSizes).src}
		imagesrcset={marketingImage(heroPoses[0].src, heroSizes).srcset}
		imagesizes={heroSizes}
		type="image/webp"
		fetchpriority="high"
	/>

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Luna | Whizzend" />
	<meta property="og:description" content="Compañera IA con avatares VRM 3D, chat de voz, memoria semántica y soporte para OpenAI, Anthropic, Google y LLMs locales. App de escritorio y web. Privacidad primero." />
	<meta property="og:image" content={`${SITE_URL}/brand-assets/og-image.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:url" content={SITE_URL} />
	<meta property="og:site_name" content="Luna" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Luna | Whizzend" />
	<meta name="twitter:description" content="Compañera IA con avatares VRM 3D, chat de voz, memoria semántica y soporte para OpenAI, Anthropic, Google y LLMs locales." />
	<meta name="twitter:image" content={`${SITE_URL}/brand-assets/og-image.png`} />

	<!-- Structured Data -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Luna',
		description: 'Compañera IA con avatares VRM 3D, chat de voz, memoria semántica y soporte multi-proveedor de LLM.',
		url: SITE_URL,
		applicationCategory: 'DesktopApplication',
		operatingSystem: 'macOS, Web',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD'
		},
		author: {
			'@type': 'Organization',
			name: 'Whizzend',
			url: SITE_URL
		}
	})}</script>`}
</svelte:head>

<svelte:window onscroll={() => sceneMeasure?.()} />

<div class="page-root overflow-x-clip grain">
<SiteNav />
<main>
	<!-- One cinematic scene: hero and "Conoce a Luna" share a single pinned
	     stage. Luna is the connector — the same 3D model reframes as you scroll. -->
	<section id="cast" class="scene" use:sceneScroll aria-label="Una compañera IA que se queda. Conoce a Luna">
		<div class="scene-stage">

			<div class="scene-luna-floor" aria-hidden="true"></div>

			<!-- Faded halo behind her (companion3d-style bloom), breathing slowly -->
			<div class="scene-luna-glow" aria-hidden="true"></div>

			<div class="scene-luna">
				{#key castForms[activeCastForm].id}
					<VrmStage url={castForms[activeCastForm].url} height="100%" walkCue={walkCue} />
				{/key}
			</div>

			<!-- Feet-fade: a whisper of stage color ABOVE the canvas so her shoes
			     dissolve into the floor like the reference (the stage's own
			     gradient sits BEHIND the canvas and can't touch the model). -->
			<div class="scene-luna-fade" aria-hidden="true"></div>

			<div class="scene-vignette" aria-hidden="true"></div>

			<div class="scene-hero">
				<div class="scene-hero-ink">
					<p class="hero-eyebrow">Más que IA</p>
					<h1 id="hero-title" class="hero-title">
						<span class="hero-accent">Luna, siempre</span>
						<span class="hero-accent">contigo.</span>
					</h1>
					<p class="hero-sub text-pretty">
						Una compañera 3D con IA que te escucha, te entiende
						y evoluciona contigo. En tu mundo real.
					</p>
					<div class="hero-actions">
						<a class="hero-cta" href={sectionUrl('app')}>
							<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" /></svg>
							Descargar app
						</a>
						<button type="button" class="hero-demo" onclick={() => assistToLuna()}>
							Ver demo
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
						</button>
					</div>
				</div>

				<!-- Luna sentada (carrusel de 8 poses) + chips de vidrio + controles.
				     aria-hidden: el carrusel es decorativo (los CTAs llevan la acción). -->
				<div class="luna-hero-wrap" aria-hidden="true">
					<!-- Campo de estrellas: profundidad sin ruido (Apple keynote) -->
					<div class="hero-stars">
						{#each starField as s}
							<span class="hero-star" style="left:{s.x}%; top:{s.y}%; --d:{s.d}s; --o:{s.o}; --sz:{s.sz}px"></span>
						{/each}
					</div>

					<!-- Glow plateado detrás de ella: la saca del negro puro -->
					<div class="hero-glow"></div>

					<!-- Anillo orbital alrededor de ella (mockup): elipse hairline + satélites -->
					<div class="hero-ring" aria-hidden="true">
						<span class="hero-ring-dot"></span>
						<span class="hero-ring-dot hero-ring-dot--b"></span>
					</div>

					<!-- Crossfade con {#key}: Svelte desmonta/monta por estado. La img
					     saliente hace fade-out mientras la entrante hace fade-in — sin
					     depender de cascadas CSS externas (probable: inmunidad total). -->
					{#key activeHeroCharacter}
						<img
							class="luna-hero"
							{...marketingImage(heroPoses[activeHeroCharacter].src, heroSizes)}
							alt=""
							width={heroPoses[activeHeroCharacter].width}
							height={heroPoses[activeHeroCharacter].height}
							fetchpriority="high"
							loading="eager"
							decoding="async"
							transition:fade={{ duration: 420 }}
						/>
					{/key}
				</div>

					<!-- Tres chips de vidrio (mockup): las promesas de Luna alrededor
				     de ella. b y c llevan barra de progreso; a lleva "escribiendo…".
				     Viven FUERA del wrap (a nivel viewport) para anclarlos con vw y
				     que jamás salgan del ancho visible. -->
					<span class="hero-chip hero-chip--a">
						<span class="hero-chip-icon"><Icon name="volume" size={15} /></span>
						<span class="hero-chip-copy">Te escucho</span>
						<span class="hero-chip-more" aria-hidden="true">···</span>
					</span>
					<span class="hero-chip hero-chip--b">
						<span class="hero-chip-icon"><Icon name="user" size={15} /></span>
						<span class="hero-chip-copy">
							Te entiende
							<span class="hero-chip-bar"><span class="hero-chip-bar-fill" style="width:72%"></span></span>
						</span>
					</span>
					<span class="hero-chip hero-chip--c">
						<span class="hero-chip-icon"><Icon name="heart" size={15} /></span>
						<span class="hero-chip-copy">
							Evoluciona contigo
							<span class="hero-chip-bar"><span class="hero-chip-bar-fill" style="width:56%"></span></span>
						</span>
					</span>

				<!-- Dots del carrusel (funcionales): discretos bajo su silueta -->
				<div class="hero-pose-nav">
					<div class="hero-pose-dots" role="tablist" aria-label="Poses de Luna">
						{#each heroPoses as pose, i}
							<button
								type="button"
								class="hero-pose-dot"
								class:hero-pose-dot--on={i === activeHeroCharacter}
								aria-label={pose.label}
								aria-pressed={i === activeHeroCharacter}
								onclick={() => assistGoToPose(i)}
							></button>
						{/each}
					</div>
				</div>
			</div>


			<!-- Decorative orbit rings around her (reference-style) -->
			<div class="scene-orbits" aria-hidden="true">
				<span class="orbit-ring orbit-ring--a"></span>
				<span class="orbit-ring orbit-ring--b"></span>
				<span class="orbit-dot orbit-dot--a"></span>
				<span class="orbit-dot orbit-dot--b"></span>
				<span class="orbit-dot orbit-dot--c"></span>
			</div>

			<!-- Orbital features: icon nodes tethered to her, facts beside.
			     Apple-style cascade: each node owns its start on the timeline. -->
			{#each orbitFeatures as f}
				<div class="orbit-feat orbit-feat--{f.side}{f.row}">
					<span class="orbit-node" style="--st: {0.4 + (f.row - 1) * 0.07 + (f.side === 'r' ? 0.035 : 0)}">
						<Icon name={f.icon} size={17} />
					</span>
					<span class="orbit-copy" style="--st: {0.425 + (f.row - 1) * 0.07 + (f.side === 'r' ? 0.035 : 0)}">
						<strong>{f.title}</strong>
						<span class="orbit-copy-body">{f.body}</span>
					</span>
				</div>
			{/each}

			<div class="cast-bubble">
				<strong>Luna</strong> ¡¿Qué tal te fue?! Cuéntamelo TODO — te lo apunté para preguntarte hoy.
			</div>

			<!-- Cast dock: summon the other bundled forms of Luna (companion3d-style) -->
			<div class="cast-dock" role="group" aria-label="Formas de Luna disponibles">
				<button type="button" class="cast-dock-arrow" aria-label="Forma anterior" onclick={() => stepCastForm(-1)}>
					<Icon name="chevron-left" size={13} />
				</button>
				{#each castForms as form, i}
					<button
						type="button"
						class="cast-dock-pill"
						class:cast-dock-pill--on={i === activeCastForm}
						aria-pressed={i === activeCastForm}
						onclick={() => (activeCastForm = i)}
					>
						<img class="cast-dock-avatar" src={form.face} alt="" width="48" height="48" loading="lazy" decoding="async" aria-hidden="true" />
						{form.name}
					</button>
				{/each}
				<button type="button" class="cast-dock-arrow" aria-label="Siguiente forma" onclick={() => stepCastForm(1)}>
					<Icon name="chevron-right" size={13} />
				</button>
			</div>

			<p class="cast-note">Modelo real de la app, renderizado en tu navegador. Arrástrala para girarla — te sigue con la mirada.</p>

			<div class="hero-scroll-label" aria-hidden="true">
				<svg xmlns="http://www.w3.org/2000/svg" width="15" height="23" viewBox="0 0 16 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><rect x="1" y="1" width="14" height="22" rx="7" /><line x1="8" y1="6" x2="8" y2="10" /></svg>
				<span>Desliza para descubrir</span>
			</div>
			<button
				class="hero-scroll"
				class:hero-scroll--out={heroScrolled}
				type="button"
				aria-label="Conocer a Luna"
				onclick={() => assistToLuna()}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
			</button>
		</div>
	</section>

	<!-- Features: alternating media rows -->
	<section id="features" class="features-section">
		<div class="section-shell">
			<h2
				use:reveal
				class="reveal features-title title-silver font-semibold tracking-tight text-balance"
				style="font-family: var(--font-sans);"
			>
				La mejor forma de dar vida a una IA.
			</h2>

			<div class="feature-list">
				{#each features as f, i}
					<div use:reveal class="reveal feature-row" class:feature-row--rev={i % 2 === 1}>
						<div class="feature-media">
							<img
								class="feature-img feature-img--light"
								{...marketingImage(`/marketing/${f.shot}-light.webp`, featureSizes)}
								alt={f.alt}
								width={f.width}
								height={f.height}
								loading="lazy"
							/>
							<img
								class="feature-img feature-img--dark"
								{...marketingImage(`/marketing/${f.shot}-dark.webp`, featureSizes)}
								alt={f.alt}
								width={f.width}
								height={f.height}
								loading="lazy"
							/>
						</div>
						<div class="feature-copy">
							<h3 class="feature-h2" style="font-family: var(--font-sans);">{f.title}</h3>
							<p class="feature-body">{f.body}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>


	<!-- Statement: one oversized brand line, nothing else -->
	<section class="statement">
		<div class="max-w-4xl mx-auto px-6 text-center">
			<p use:reveal class="statement-text text-balance">
				{#each statementWords as s, i}<span
						class="st-word"
						class:statement-muted={s.muted}
						style="--wd: {i * 70}ms">{s.w}</span
					>{#if i < statementWords.length - 1}{' '}{/if}{/each}
			</p>
		</div>
	</section>


	<!-- The difference: a plain chat app vs Luna, side by side -->
	<section class="vs-section">
		<div class="section-shell">
			<div class="vs-head">
				<p use:reveal class="reveal eyebrow justify-center mb-4">La diferencia</p>
				<h2
					use:reveal={60}
					class="reveal vs-title title-silver tracking-tight text-balance"
					style="font-family: var(--font-sans);"
				>
					Mismos modelos. Compañía completamente distinta.
				</h2>
				<p
					use:reveal={120}
					class="reveal vs-sub text-[var(--text-secondary)] text-pretty"
				>
					Cualquier app de chat es una caja de texto con un nombre arriba. Las palabras pueden ser buenas — pero nadie está ahí.
				</p>
			</div>

			<div use:reveal={160} class="reveal vs-grid">
				<article class="vs-card vs-card--them">
					<header class="vs-card-head">
						<span class="vs-dot vs-dot--ai" aria-hidden="true">AI</span>
						<div>
							<p class="vs-name">Assistant</p>
							<p class="vs-status">en linea</p>
						</div>
					</header>
					<div class="vs-bubbles">										<p class="vs-bubble vs-bubble--them">¡Hola! ¿En qué puedo ayudarte hoy?</p>
										<p class="vs-bubble vs-bubble--me">tuve un día horrible, arruiné la entrevista</p>
										<p class="vs-bubble vs-bubble--them">Lamento escuchar eso. ¿Quieres consejos para tu próxima entrevista?</p>
						<p class="vs-typing" aria-hidden="true"><span></span><span></span><span></span></p>
					</div>
					<footer class="vs-card-foot">Sin rostro. Una voz genérica, si acaso. Mañana empieza de cero.</footer>
				</article>

				<div class="vs-divider" aria-hidden="true">
					<span class="vs-badge">vs</span>
				</div>

				<article class="vs-card vs-card--luna liquid-glass">
					<header class="vs-card-head">
						<img {...marketingImage('/luna/visuals/gustavo.png', '44px')} alt="" class="vs-avatar" width="44" height="44" loading="lazy" />
						<div>
							<p class="vs-name">Luna</p>
							<p class="vs-status vs-status--live">en tu pantalla, en 3D</p>
						</div>
						<span class="vs-chips">
						<span class="vs-chip"><Icon name="flame" size={12} /> 12</span>
						<span class="vs-chip"><Icon name="heart" size={12} /> Lv. 5</span>
						</span>
					</header>
					<div class="vs-scene">
						<img
							{...marketingImage('/luna/visuals/luna-hush.png', '(max-width: 899px) 82vw, 420px')}
							alt="Luna en 3D acercándose a la cámara con un gesto cómplice"
							width="707"
							height="629"
							loading="lazy"
						/>
						<div class="vs-overlay">
							<p class="vs-line"><strong>Luna</strong> ¡¿Qué tal te fue?! Cuéntamelo TODO — te lo apunté para preguntarte hoy.</p>
							<span class="vs-voice"><Icon name="volume" size={12} /> En su voz</span>
						</div>
					</div>						<footer class="vs-card-foot vs-card-foot--luna">Te mira cuando llegas. Responde en voz alta. Y mañana te pregunta cómo siguió todo.</footer>
				</article>
			</div>
		</div>
	</section>

	<!-- The bond: sticky timeline, the relationship keeps moving -->
	<section class="bond-section">
		<div class="section-shell">
			<div class="bond-head">
				<p use:reveal class="reveal eyebrow justify-center mb-4">El vínculo</p>
				<h2
					use:reveal={60}
					class="reveal bond-title title-silver tracking-tight text-balance"
					style="font-family: var(--font-sans);"
				>
					Algo pasa mientras no estás
				</h2>
				<p
					use:reveal={120}
					class="reveal bond-sub text-[var(--text-secondary)] text-pretty"
				>
					Luna lleva una relación en un calendario — y avanza estés o no estés. No es una caja que te olvida.
				</p>
			</div>

			<div class="bond-grid">
				<div class="bond-sticky">
					<div class="bond-phone" role="img" aria-label="Teléfono mostrando la app de Luna con misiones diarias, racha y capítulos">
						<div class="phone-notch" aria-hidden="true"></div>
						<div class="phone-screen">
							<div class="phone-row phone-apps">
								<span class="phone-pill">Hoy</span>
								<span class="phone-pill phone-pill--dim">Historia</span>
								<span class="phone-pill phone-pill--dim">Vínculo</span>
							</div>
							<div class="phone-row">
								<p class="phone-h">Misión diaria</p>
								<span class="phone-count">1/2</span>
							</div>
							<div class="phone-row phone-quest">
								<span class="phone-quest-icon" aria-hidden="true"><Icon name="message" size={13} /></span>
								<span class="phone-quest-text">Habla con Luna</span>
								<span class="phone-claim">Reclamar</span>
							</div>
							<div class="phone-row phone-quest">
								<span class="phone-quest-icon" aria-hidden="true"><Icon name="sparkles" size={13} /></span>
								<span class="phone-quest-text">Su pregunta del día</span>
								<span class="phone-quest-n">0/1</span>
							</div>
							<div class="phone-row">
								<p class="phone-h">Racha</p>
								<span class="phone-flame" aria-hidden="true"><Icon name="flame" size={15} /></span>
								<span class="phone-streak">12</span>
							</div>
							<div class="phone-dots" aria-hidden="true">
								{#each Array(7) as _, i}<span class="phone-dot" class:phone-dot--on={i < 5}></span>{/each}
							</div>
							<div class="phone-row phone-progress">
								<div class="phone-bar"><span></span></div>
								<span class="phone-bar-label">Día 7 — Luna abre su pasado</span>
							</div>
						</div>
					</div>
				</div>
				<ol class="bond-steps">
					{#each bondSteps as step, i}
						<li use:reveal={(i % 2) * 80} class="reveal bond-step">
							<span class="bond-dot" aria-hidden="true"></span>
							<span class="bond-day-tag">{step.day}</span>
							<h3 class="bond-step-title">{step.title}</h3>
							<p class="bond-step-body">{step.body}</p>
							<span class="bond-chip">{step.chip}</span>
						</li>
					{/each}
				</ol>
			</div>
		</div>
	</section>

	<!-- Moments: keepsake photo cards with scroll drift -->
	<section class="moments-section">
		<div class="section-shell">
			<div class="moments-head">
				<p use:reveal class="reveal eyebrow justify-center mb-4">Momentos</p>
				<h2
					use:reveal={60}
					class="reveal moments-title title-silver tracking-tight text-balance"
					style="font-family: var(--font-sans);"
				>
					Quédate con los que quieras guardar
				</h2>
				<p
					use:reveal={120}
					class="reveal moments-sub text-[var(--text-secondary)] text-pretty"
				>
					El modo foto enmarca la escena viva — su pose, su expresión, la frase que acaba de decir. Guardado en tu dispositivo, en ningún lugar más.
				</p>
			</div>

			<div class="moments-grid">
				{#each momentCards as m, i}
					<figure use:reveal={(i % 3) * 110} class="reveal moment-card liquid-glass" class:moment-card--tilt-l={i % 3 === 0} class:moment-card--tilt-r={i % 3 === 1}>
						<div class="moment-media">
							<img {...marketingImage(m.src, '(max-width: 640px) 72vw, 300px')} alt="Escena capturada con Luna en modo foto" width={m.width} height={m.height} loading="lazy" />
						</div>
						<time class="moment-date">{m.date}</time>
						<figcaption class="moment-quote">“{m.quote}”</figcaption>
					</figure>
				{/each}
			</div>
		</div>
	</section>

	<!-- FAQ -->
	<section class="faq-section">
		<div class="section-shell faq-shell">
			<div class="faq-head">
				<p use:reveal class="reveal eyebrow justify-center mb-4">FAQ</p>					<h2
						use:reveal={60}
						class="reveal faq-title title-silver tracking-tight text-balance"
						style="font-family: var(--font-sans);"
					>
						Respuestas directas
					</h2>
			</div>
			<div class="faq-list">
		{#each faqs as f, i}
			<details use:reveal={(i % 2) * 60} class="reveal faq-item" open={i === 0}>
				<summary class="faq-q">{f.q}</summary>
				<p class="faq-a">{f.a}</p>
			</details>
		{/each}
			</div>
		</div>
	</section>

	<!-- Latest from the blog (channel-card layout) -->
	{#if data.posts.length > 0}
		<section class="home-blog">
			<div class="section-shell">
				<div class="blog-head">
					<div>
						<h2
							use:reveal
							class="reveal home-blog-title font-semibold text-[var(--text-primary)] tracking-tight text-balance"
							style="font-family: var(--font-sans);"
						>
							Recién salido del blog
						</h2>
						<p
							use:reveal={60}
							class="reveal home-blog-copy text-[var(--text-secondary)] leading-relaxed text-pretty"
						>
							Guías, análisis profundos y notas de versión del proyecto.
						</p>
					</div>
					<a use:reveal={120} href="/blog" class="reveal btn btn-secondary shrink-0">
						Ver todas las entradas
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M7 17 17 7M7 7h10v10" />
						</svg>
					</a>
				</div>

				<div class="home-blog-grid">
					{#each data.posts as post, i}
						<a use:reveal={(i % 3) * 90} href="/blog/{post.slug}" class="reveal channel-card">
							<div class="channel-media">
								<img {...marketingImage(post.image, '(max-width: 767px) calc(100vw - 40px), (max-width: 1280px) 31vw, 384px', true)} alt={post.title} loading="lazy" />
							</div>
							<div class="channel-body">
								<time datetime={post.date} class="channel-date">{formatDate(post.date)}</time>
								<h3 class="channel-title">{post.title}</h3>
								<span class="channel-cta btn btn-on-card btn-block">Leer artículo →</span>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- Closing CTA -->
	<section class="closing-cta">
		<div class="closing-cta-inner max-w-3xl mx-auto text-center">
			<h2
				use:reveal
				class="reveal closing-cta-title title-silver font-semibold tracking-tight text-balance"
				style="font-family: var(--font-sans);"
			>
				¿Lista para conocer a tu compañera?
			</h2>
			<p
				use:reveal={80}
				class="reveal closing-cta-copy text-[var(--text-secondary)] leading-relaxed text-pretty max-w-xl mx-auto"
			>							Pruébala en tu navegador o descarga la app de escritorio.
			</p>
			<div use:reveal={160} class="reveal flex flex-wrap items-center justify-center gap-3">
				<a href={sectionUrl('app')} class="btn btn-primary btn-lg">Pruébala en vivo</a>
				<a href="/descargar" class="btn btn-secondary btn-lg">Descargar</a>
			</div>
		</div>
	</section>

	</main>

	<SiteFooter />
</div>

<style>
	.page-root {
		color: var(--text-primary);
		background-color: var(--bg-page);
		/* Dot grid, companion3d-style: 1px dots on a 28px grid */
		background-image: radial-gradient(
			color-mix(in srgb, var(--text-primary) 5.5%, transparent) 1px,
			transparent 1.4px
		);
		background-size: 28px 28px;
	}

	/* Landing accent: white expo-style, in both themes. Scoped here so the
	   app keeps its own accent untouched. Also neutralize the blue-tinted
	   dark greys: expo greys are pure neutrals. */
	.page-root {
		--accent: #f6f8f9;
		--accent-hover: #ffffff;
		--accent-muted: rgba(246, 248, 249, 0.22);
		--accent-subtle: color-mix(in srgb, var(--text-primary) 6%, transparent);
		--shadow-glow: 0 10px 36px rgba(255, 255, 255, 0.16);
	}

	:global(.dark) .page-root {
		--bg-secondary: #131316;
		--bg-tertiary: #1b1b1f;
		--border-light: #2c2c31;
		--border-subtle: #232327;
	}

	/* Adaptive pill buttons: ink on light, white on dark — expo style */
	.page-root :global(.btn-primary) {
		background: var(--text-primary);
		color: var(--bg-page);
	}

	.page-root :global(.btn-primary:hover:not(:disabled)) {
		background: color-mix(in srgb, var(--text-primary) 86%, var(--bg-page));
		box-shadow: 0 10px 36px color-mix(in srgb, var(--text-primary) 22%, transparent);
	}

	.section-shell {
		width: 100%;
		max-width: 80rem;
		margin-inline: auto;
		padding-inline: var(--marketing-gutter);
	}

	/* Anchored sections land clear of the sticky nav */
	section {
		scroll-margin-top: 4.5rem;
	}

	/* ═══ One cinematic scene: hero + "Conoce a Luna" share a single pinned
	   stage. --p (0..1) is the scroll scrub: ink dissolves first, Luna grows
	   and reframes into the protagonist, cast texts arrive after. Every value
	   is a pure function of --p, so anti-scroll replays it exactly in reverse. */
	.scene {
		/* svh runway: when the mobile URL bar collapses, vh grows mid-scroll and
	   the whole timeline (p = scrolled / (runway - viewport)) JUMPS — every
	   beat visibly lurches. svh is the small viewport: stable on both bar
	   states, identical to vh on desktop. */
		height: 420svh; /* single scroll runway for the whole timeline */
		scroll-margin-top: 0; /* the scroll cue lands the stage flush with the viewport */
		/* Ring-a diameter, shared by the rings AND the node anchors so the
   features always hug the orbit no matter how wide the screen is. */
		--orbit-d: min(46rem, 74vw);
	}

	/* Charcoal, not flat black: glow behind her + soft vignette live here.
	   The glow fades out wide and slow so its edge is never perceptible. */
	.scene-stage {
		position: sticky;
		top: 0;
		height: 100vh;
		height: 100svh;
		overflow: hidden;
		/* companion3d-style stage: deep graphite + the same subtle dot grid
		   the page wears (puntitos, not film noise), static while pinned. */
		background-color: var(--bg-page);
		background-image:
			radial-gradient(color-mix(in srgb, var(--text-primary) 6%, transparent) 1px, transparent 1.4px),
			radial-gradient(58% 42% at 50% 58%, rgba(255, 255, 255, 0.022), transparent 72%),
			linear-gradient(to bottom, color-mix(in srgb, var(--bg-page) 30%, transparent), transparent 20%, transparent 52%, color-mix(in srgb, var(--bg-page) 90%, transparent) 97%);
		background-size: 28px 28px, 100% 100%, 100% 100%;
	}

	/* Faded halo behind her: a soft white bloom that breathes slowly —
	   the "destello desvanecido" of the reference, never a hard shape. */
	.scene-luna-glow {
		position: absolute;
		left: 50%;
		top: 52%;
		width: min(64rem, 92vw, 1100px);
		height: min(64rem, 92vw, 1100px);
		transform: translate(-50%, -50%);
		z-index: 1;
		pointer-events: none;
		border-radius: 50%;
		background:
			radial-gradient(50% 50% at 50% 50%, rgba(235, 240, 255, 0.09), rgba(235, 240, 255, 0.035) 38%, transparent 68%);
		filter: blur(18px);
		opacity: calc(0.35 + var(--p, 0) * 0.65);
		animation: lunaGlowBreathe 7s ease-in-out infinite;
	}

	@keyframes lunaGlowBreathe {
		0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: calc(0.35 + var(--p, 0) * 0.55); }
		50% { transform: translate(-50%, -50%) scale(1.05); opacity: calc(0.42 + var(--p, 0) * 0.6); }
	}

	@media (prefers-reduced-motion: reduce) {
		.scene-luna-glow {
			animation: none;
		}
	}

	/* Decorative orbit rings + satellite dots around her */
	.scene-orbits {
		position: absolute;
		/* Centered box matching ring-b: the satellite dots track the capped
		   ring width instead of scattering toward the viewport edges. */
		left: 50%;
		transform: translateX(-50%);
		top: 0;
		bottom: 0;
		width: min(64rem, 96vw);
		z-index: 1;
		pointer-events: none;
		opacity: calc(min(max((var(--p, 0) - 0.3) * 2.4, 0), 1));
	}

	.orbit-ring {
		position: absolute;
		left: 50%;
		top: 55%;
		transform: translate(-50%, -50%);
		border-radius: 50%;
		border: 1px solid color-mix(in srgb, var(--text-primary) 9%, transparent);
	}

	.orbit-ring--a {
		width: var(--orbit-d);
		height: var(--orbit-d);
	}

	.orbit-ring--b {
		width: min(64rem, 96vw);
		height: min(64rem, 96vw);
		border-color: color-mix(in srgb, var(--text-primary) 6%, transparent);
	}

	.orbit-dot {
		position: absolute;
		border-radius: 50%;
		background: color-mix(in srgb, var(--text-primary) 45%, transparent);
		box-shadow: 0 0 10px color-mix(in srgb, var(--text-primary) 35%, transparent);
	}

	.orbit-dot--a { width: 5px; height: 5px; left: 24%; top: 34%; }
	.orbit-dot--b { width: 4px; height: 4px; left: 74%; top: 28%; }
	.orbit-dot--c { width: 6px; height: 6px; left: 66%; top: 72%; }

	.scene-luna-floor {
		position: absolute;
		left: 50%;
		bottom: 6svh;
		width: min(30rem, 46vw);
		height: 2.2rem;
		transform: translateX(-50%);
		z-index: 1;
		pointer-events: none;
		background: radial-gradient(50% 50% at 50% 50%, rgba(0, 0, 0, 0.55), transparent 70%);
		filter: blur(6px);
		opacity: calc(var(--p, 0) * 0.55);
	}

	/* Feet-fade overlay: bottom-up wash of stage color that sits between
	   Luna (2) and the vignette (4) — her feet DISSOLVE into the floor like
	   the reference (no hard shoe line over the text), while the dock,
	   bubble and note (z 5/6) stay perfectly crisp above it. Tall enough to
	   melt her from mid-shin down; gentle ramp so it never reads as a band. */
	.scene-luna-fade {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: clamp(9.5rem, 26svh, 15rem);
		z-index: 3;
		pointer-events: none;
		background: linear-gradient(to top, color-mix(in srgb, var(--bg-page) 96%, transparent), color-mix(in srgb, var(--bg-page) 60%, transparent) 44%, transparent 78%);
		opacity: calc(0.4 + var(--p, 0) * 0.6);
	}

	.scene-vignette {
		position: absolute;
		inset: 0;
		z-index: 4;
		pointer-events: none;
		/* Soft edge falloff only — depth without noise or decoration. */
		background: radial-gradient(120% 96% at 50% 46%, transparent 62%, color-mix(in srgb, var(--bg-page) 46%, transparent) 100%);
		opacity: calc(0.5 + var(--p, 0) * 0.5);
	}	/* Luna: shared element. Her wrapper is scrubbed by --p across the whole
	   timeline: starts low/small behind the ink, ends centered and big. */	.scene-luna {
		position: absolute;
		/* Starts below the title band: her head can never cross "Conoce a Luna"
	   while the name is on — the title zone stays clear at every p. */
		inset: 15svh 0 0;
		z-index: 2;
		pointer-events: none;
		/* Gated entrance: she only starts growing once the ink has mostly
		   dissolved (p>0.12), so text and model never fight for the stage. */
		--luna-in: min(max((var(--p, 0) - 0.12) * 1.7, 0), 1);
		/* Final lift (reference framing): her feet end above the dock/bubble
		   instead of crashing through them. A transform offset — NOT an inset
		   change — so the canvas keeps its exact size and she renders at the
		   same scale. It ramps in only after the title has handed off
		   (p>0.55), keeping her clear of "Conoce a Luna" mid-transition. */
		--luna-rise: 4svh * min(max((var(--p, 0) - 0.55) * 3.5, 0), 1);
		opacity: var(--luna-in);
		transform:
			translate3d(0, calc((1 - var(--luna-in)) * 8svh - var(--luna-rise)), 0)
			scale(calc(0.82 + var(--luna-in) * 0.14));
		will-change: transform, opacity;
	}

	.scene-luna :global(.vrm-stage) {
		position: absolute;
		inset: 0;
		height: 100% !important;
		pointer-events: auto; /* re-enable drag inside the stage only */
	}

	/* Ink = title + sub + CTA. Dissolves over the first third of the runway. */
	.scene-hero {
		position: absolute;
		inset: 0;
		z-index: 3;
		pointer-events: none;
	}

	.scene-hero-ink {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		text-align: left;
		height: 100%;
		/* MOCKUP: copy a la IZQUIERDA en la cuadrícula común (80rem); ella
		   manda a la derecha. Los stats (margin-top:auto) clavan al pie. */
		padding: clamp(2.4rem, 6.5svh, 6rem) max(var(--marketing-gutter), calc((100% - 80rem) / 2 + var(--marketing-gutter))) 0;
		/* Ink always wins over the cast photo (z1) inside this layer: title,
		   sub and CTA stay perfectly legible with her behind the text. */
		position: relative;
		z-index: 2;
	}

	/* Text block: lifts and dissolves first */
	.scene-hero-ink > :global(.hero-eyebrow),
	.scene-hero-ink > :global(.hero-title),
	.scene-hero-ink > :global(.hero-sub),
	.scene-hero-ink > :global(.hero-actions) {
		opacity: calc(1 - var(--p, 0) * 3.1);
		transform: translate3d(0, calc(var(--p, 0) * -30px), 0);
		will-change: transform, opacity;
	}

	.scene-hero :global(.hero-cta),
	.scene-hero :global(.hero-demo) {
		pointer-events: auto;
	}

	.hero-title {
		margin: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		font-size: clamp(3.1rem, 7.4vw, 6.9rem);
		font-weight: 500;
		line-height: 1.02;
		letter-spacing: -0.05em;
		text-wrap: balance;
		color: var(--text-primary);
	}

	.hero-accent {
		/* Degradado plateado ORIGINAL + brillo (sheen) que recorre el título
		   cada 7s: la primera impresión se MUEVE. El sheen va ARRIBA (capa 1,
		   casi transparente) para que el plateado siga siendo el relleno. */
		background:
			linear-gradient(110deg, transparent 42%, color-mix(in srgb, #fff 36%, transparent) 50%, transparent 58%),
			linear-gradient(180deg, var(--text-primary) 34%, color-mix(in srgb, var(--text-primary) 48%, transparent));
		background-size: 220% 100%, 100% 100%;
		background-position: 120% 0, 0 0;
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		color: transparent;
		animation: heroSheen 7s ease-in-out 1.2s infinite;
	}

	@keyframes heroSheen {
		0%, 55% { background-position: 120% 0, 0 0; }
		85%, 100% { background-position: -120% 0, 0 0; }
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-accent {
			animation: none;
		}
	}

	.hero-sub {
		max-width: 34rem;
		margin: 1.5rem 0 0;
		color: var(--text-secondary);
		font-size: 1.14rem;
		line-height: 1.65;
	}

	.hero-demo {
		/* Text-link con chevron (mockup): frío, secundario, sin caja */
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.9rem 0.4rem;
		border: none;
		background: none;
		color: var(--text-primary);
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
	}

	.hero-demo svg {
		transition: transform 0.25s var(--ease-brand);
	}

	.hero-demo:hover svg {
		transform: translateX(3px);
	}

	.hero-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.9rem 1.75rem;
		border-radius: var(--radius-full);
		background: var(--text-primary);
		color: var(--bg-page);
		font-weight: 600;
		font-size: 1rem;
		text-decoration: none;
		transition: transform 0.25s var(--ease-brand), box-shadow 0.25s var(--ease-brand), background 0.2s ease;
	}

	.hero-cta:hover {
		transform: translateY(-2px);
		background: color-mix(in srgb, var(--text-primary) 88%, var(--bg-page));
		box-shadow: 0 10px 36px color-mix(in srgb, var(--text-primary) 24%, transparent);
	}

	.hero-cta svg {
		transition: transform 0.25s var(--ease-brand);
	}

	.hero-cta:hover svg {
		transform: translateX(3px);
	}

	/* Eyebrow "MÁS QUE IA" — susurro, sin línea */
	.hero-eyebrow {
		margin: 0 0 1.3rem;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.42em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--text-primary) 62%, transparent);
		/* Entrada escalonada: sube + aparece al cargar (Apple keynote).
		   fill:backwards (NO both): al terminar devuelve el control de la
		   opacidad al scrub del scroll — si no, el ink nunca se disolvería. */
		animation: heroRiseIn 0.9s var(--ease-brand) 0.1s backwards;
	}

	.hero-title {
		animation: heroRiseIn 1s var(--ease-brand) 0.25s backwards;
	}

	.hero-sub {
		animation: heroRiseIn 1s var(--ease-brand) 0.4s backwards;
	}

	.hero-actions {
		animation: heroRiseIn 1s var(--ease-brand) 0.55s backwards;
	}

	@keyframes heroRiseIn {
		from { opacity: 0; transform: translateY(26px); filter: blur(6px); }
		to { opacity: 1; transform: none; filter: blur(0); }
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-eyebrow,
		.hero-title,
		.hero-sub,
		.hero-actions {
			animation: none;
		}
	}

	.hero-actions {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		margin-top: 2.2rem;
	}

	/* "Desliza para descubrir" + ratón: fijo sobre el botón chevron */
	.hero-scroll-label {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		bottom: calc(4.7rem + env(safe-area-inset-bottom, 0px));
		z-index: 60;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.78rem;
		color: var(--text-secondary);
		pointer-events: none;
		opacity: calc(1 - min(max((var(--p, 0) - 0.1) * 2.5, 0), 1));
	}

	/* Cast photo pinned at the hero's foot: rotates through the three
	   renders and crossfades INTO the live 3D Luna on scrub. */
	.luna-hero-wrap {
		position: absolute;
		/* MOCKUP: Luna GRANDE a la derecha, anclada al pie, PERO CONTENIDA:
		   right usa la misma cuadrícula del resto (80rem + gutter) — nada
		   sangra el borde derecho. El ancho nace del aspect (848×696). */
		right: max(var(--marketing-gutter), calc((100% - 80rem) / 2 + var(--marketing-gutter)));
		left: auto;
		bottom: 0;
		z-index: 1;
		height: min(76svh, 44rem);
		width: auto;
		aspect-ratio: 848 / 696;
		transform: none;
		filter: drop-shadow(0 0 90px color-mix(in srgb, #fff 13%, transparent)) brightness(0.96);
		pointer-events: none;
		opacity: calc(1 - min(var(--p, 0) * 4, 1));
		will-change: opacity;
	}

	/* Anillo orbital alrededor de ella (mockup): elipse hairline con dos
	   satélites en puntos del borde. Pura decoración, z bajo. */
	.hero-ring {
		position: absolute;
		inset: -6% -8%;
		z-index: -1;
		border-radius: 50%;
		border: 1px solid color-mix(in srgb, var(--text-primary) 14%, transparent);
		pointer-events: none;
	}

	.hero-ring-dot {
		position: absolute;
		top: 18%;
		left: -3px;
		width: 6px;
		height: 6px;
		border-radius: var(--radius-full);
		background: var(--text-primary);
		box-shadow: 0 0 10px color-mix(in srgb, #fff 70%, transparent);
	}

	.hero-ring-dot--b {
		top: auto;
		left: auto;
		bottom: 24%;
		right: -3px;
	}

	/* Glow plateado: elipse vertical detrás de ella — la saca del negro puro
	   (Apple keynote: el sujeto nunca flota sobre negro absoluto). */
	.hero-glow {
		position: absolute;
		inset: -12% -18%;
		z-index: -1;
		background: radial-gradient(
			ellipse 52% 58% at 56% 42%,
			color-mix(in srgb, #aab4c4 17%, transparent),
			color-mix(in srgb, #7d8aa0 8%, transparent) 48%,
			transparent 74%
		);
		pointer-events: none;
	}

	/* Campo de estrellas: twinkle en CSS puro (opacity pulsa por estrella
	   con su propio desfase --d). Puntero siempre libre. */
	.hero-stars {
		position: absolute;
		inset: -8% -6%;
		z-index: -1;
		pointer-events: none;
	}

	.hero-star {
		position: absolute;
		width: var(--sz, 2px);
		height: var(--sz, 2px);
		border-radius: var(--radius-full);
		background: #fff;
		opacity: var(--o, 0.4);
		animation: starTwinkle 5.5s ease-in-out infinite;
		animation-delay: var(--d, 0s);
	}

	@keyframes starTwinkle {
		0%, 100% { opacity: var(--o, 0.4); transform: scale(1); }
		50% { opacity: calc(var(--o, 0.4) * 2.2); transform: scale(1.25); }
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-star {
			animation: none;
		}
	}

	/* Pedestal: elipse de luz bajo la pose (el mockup la pisa) */
	.luna-hero-wrap::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: 4%;
		width: 120%;
		height: 12%;
		transform: translateX(-50%);
		border-radius: 50%;
		background: radial-gradient(ellipse at center, color-mix(in srgb, #fff 9%, transparent), transparent 70%);
		pointer-events: none;
	}

	/* Chips de vidrio flotando junto a ella (mockup): Te escucha · Te
	   entiende · Evoluciona contigo. Flotan en bucle lento y se disuelven
	   con el mismo scrub que el resto del ink. */
	.hero-chip {
		position: absolute;
		z-index: 3;
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.72rem 1.1rem;
		border-radius: 1.15rem;
		border: 1px solid color-mix(in srgb, #fff 20%, transparent);
		background: linear-gradient(135deg, color-mix(in srgb, #fff 12%, transparent), color-mix(in srgb, #fff 5%, transparent));
		backdrop-filter: blur(18px);
		-webkit-backdrop-filter: blur(18px);
		color: var(--text-primary);
		font-size: 0.88rem;
		font-weight: 500;
		white-space: nowrap;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
		opacity: calc((1 - min(var(--p, 0) * 3.1, 1)) * 0.97);
		animation: chipFloat 7s ease-in-out infinite;
		will-change: transform, opacity;
	}

	.hero-chip-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: 0.8rem;
		background: color-mix(in srgb, #fff 12%, transparent);
		color: #fff;
	}

	.hero-chip-more {
		color: color-mix(in srgb, #fff 55%, transparent);
		letter-spacing: 0.1em;
	}

	/* Barra de progreso dentro del chip (mockup: "Te entiende 72%") */
	.hero-chip-copy {
		display: flex;
		flex-direction: column;
		gap: 0.32rem;
	}

	.hero-chip-bar {
		display: block;
		width: 5.4rem;
		height: 3px;
		border-radius: var(--radius-full);
		background: color-mix(in srgb, #fff 16%, transparent);
		overflow: hidden;
	}

	.hero-chip-bar-fill {
		display: block;
		height: 100%;
		border-radius: var(--radius-full);
		background: linear-gradient(90deg, color-mix(in srgb, #fff 55%, transparent), #fff);
		animation: chipBarPulse 3.2s ease-in-out infinite alternate;
	}

	@keyframes chipBarPulse {
		from { opacity: 0.65; }
		to { opacity: 1; }
	}

	/* Posiciones (mockup): los chips viven a nivel .scene-hero (viewport).
	   Anclados a la DERECHA del grid (donde está ella) — nada sale jamás. */
	.hero-chip--a { top: 18%; right: max(var(--marketing-gutter), calc((100% - 80rem) / 2 + var(--marketing-gutter))); }
	.hero-chip--b { top: 44%; left: 50%; animation-delay: -2.3s; }
	.hero-chip--c { bottom: 26%; right: max(calc(var(--marketing-gutter) + 2rem), calc((100% - 80rem) / 2 + var(--marketing-gutter) + 2rem)); animation-delay: -4.6s; }

	@keyframes chipFloat {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-9px); }
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-chip {
			animation: none;
		}
	}

	/* Controles del carrusel de poses: centrados bajo su silueta (derecha).
	   Flechas píldora de vidrio + dots con progreso (la activa se alarga). */
	.hero-pose-nav {
		position: absolute;
		right: max(var(--marketing-gutter), calc((100% - 80rem) / 2 + var(--marketing-gutter)));
		bottom: 2.6rem;
		z-index: 4;
		display: flex;
		align-items: center;
		gap: 0.9rem;
		opacity: calc(1 - min(var(--p, 0) * 3.1, 1));
	}

	.hero-pose-arrow {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: var(--radius-full);
		border: 1px solid color-mix(in srgb, #fff 16%, transparent);
		background: color-mix(in srgb, #fff 6%, transparent);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		color: var(--text-primary);
		cursor: pointer;
		transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s var(--ease-brand);
	}

	.hero-pose-arrow:hover {
		border-color: color-mix(in srgb, #fff 36%, transparent);
		background: color-mix(in srgb, #fff 10%, transparent);
		transform: scale(1.06);
	}

	.hero-pose-dots {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.hero-pose-dot {
		width: 7px;
		height: 7px;
		padding: 0;
		border: none;
		border-radius: var(--radius-full);
		background: color-mix(in srgb, #fff 28%, transparent);
		cursor: pointer;
		transition: width 0.35s var(--ease-brand), background 0.25s ease;
	}

	.hero-pose-dot:hover {
		background: color-mix(in srgb, #fff 55%, transparent);
	}

	.hero-pose-dot--on {
		width: 22px;
		background: var(--text-primary);
	}

	.luna-hero {
		display: block;
		position: absolute;
		inset: 0;
		height: 100%;
		width: 100%;
		/* El fundido de pies vive en la IMAGEN (no en el wrap): así el velo
		   (::before) y el pedestal (::after) del wrap no quedan enmascarados. */
		-webkit-mask-image: linear-gradient(to bottom, #000 58%, transparent 94%);
		mask-image: linear-gradient(to bottom, #000 58%, transparent 94%);
		/* SIN blur base: con {#key} la clase --active ya no existe y un blur
		   base quedaba FIJO (Luna borrosa). El crossfade lo hace transition:fade. */
		object-fit: contain;
		object-position: right bottom;
	}

	/* (El fade de pies vive en la máscara de .luna-hero; ::after es el pedestal) */

	/* Floating scroll cue: fixed, never travels with the content, gone early.
	   Safe-area: on notched phones the home-indicator gesture zone sits over
	   fixed elements pinned near the bottom — lift by the real inset. */
	.hero-scroll {
		position: fixed;
		left: 50%;
		/* Centered via negative margin, NOT translateX: the float animation owns
		   the transform property — animating translateX+Y together used to fight
		   the centering transform and made the button WOBBLE sideways under the
		   finger on mobile (the tap kept missing). Margin centering is static;
		   the animation only bobs vertically. */
		margin-left: -22px; /* half of the 44px width */
		bottom: calc(1.6rem + env(safe-area-inset-bottom, 0px));
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		animation: heroFloat 2.6s ease-in-out infinite;
		/* Exit fade: full until p=0.1, gone by ~0.5 — inside the transition,
		   never lingering over the sections below (fixed + z60 would haunt
		   features/FAQ otherwise). The FUNCTIONAL tap window is heroScrolled
		   (pointer-events) — widened to p≤0.18 so a thumb flick from the hero
		   still lands the tap; opacity is only the visual echo of that. */
		opacity: calc(1 - min(max((var(--p, 0) - 0.1) * 2.5, 0), 1));
	}

	.hero-scroll:hover {
		color: var(--text-primary);
	}

	.hero-scroll--out {
		pointer-events: none;
		animation-play-state: paused;
	}

	@keyframes heroFloat {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(6px); }
	}

	/* Ambient spheres at several depths — dark bokeh, slow parallax drift */
	@media (max-width: 1099px) {
		.hero {
			padding: 0 var(--marketing-gutter) 2.5rem;
		}

		.hero-stage {
			display: flex;
			min-height: 0;
			flex-direction: column;
			padding: 0 0 6.5rem;
		}

		.hero-content {
			padding-top: 2.25rem;
		}

		.hero-title {
			font-size: clamp(2.2rem, 9vw, 3.25rem);
		}

		.hero-sub {
			font-size: 0.95rem;
			margin-top: 0.9rem;
		}

		/* Character in flow UNDER the text — companion3d mobile layout.
		   The ink must shrink (height:auto) or it pushes the photo below
		   the stage fold where overflow:hidden clips it. */
		.scene-hero {
			display: flex;
			flex-direction: column;
		}

		.scene-hero-ink {
			height: auto;
			flex: 0 0 auto;
			padding-bottom: 0;
		}

		.luna-hero-wrap {
			/* NUNCA en flujo: en tablet/laptop chica ella llena el PIE del
			   stage (absoluta), grande, centrada-derecha — la cabecita asomando
			   bajo el pliegue era lo que mataba el hero. El velo ::before + la
			   máscara de pies mantienen el copy legible encima. */
			position: absolute;
			right: -4vw;
			left: auto;
			bottom: 0;
			transform: none;
			height: min(64svh, 34rem);
			width: auto;
			aspect-ratio: 848 / 696;
			margin: 0;
			opacity: calc(1 - min(var(--p, 0) * 4.6, 1));
			filter: brightness(0.96);
		}

		/* Velo radial sobre su cara: los stats/copy respiran encima de ella */
		.luna-hero-wrap::before {
			content: '';
			position: absolute;
			inset: 0;
			z-index: 2;
			background: radial-gradient(
				ellipse 78% 62% at 46% 30%,
				color-mix(in srgb, var(--bg-page) 74%, transparent) 34%,
				transparent 78%
			);
			pointer-events: none;
		}

		/* The scroll cue stays on touch screens: it drives the hero→cast handoff */
		.hero-scroll {
			display: flex;
		}

		/* Clean stages on short screens: the ink is taller here (stacked
	   column) and the orbit features start at 15% — with the desktop
	   fade-out (×3.1) the title was still ~40% visible when the first
	   nodes landed, both fighting for the same pixels (your screenshot's
	   smear). Faster dissolve + earlier feature start (--st-shift, read
	   by the node/copy formulas below) = ink is GONE before the first
	   node enters. */
		.scene-hero-ink > :global(.hero-eyebrow),
		.scene-hero-ink > :global(.hero-title),
		.scene-hero-ink > :global(.hero-sub),
		.scene-hero-ink > :global(.hero-actions) {
			opacity: calc(1 - var(--p, 0) * 4.6);
		}

		.hero-actions {
			flex-wrap: wrap;
			row-gap: 1rem;
		}

		.orbit-feat {
			--st-shift: 0.06;
		}
	}

	/* Teléfonos (≤767): mockup móvil — ella arriba llena el hero, copy abajo. */
	@media (max-width: 767px) {
		.hero-actions {
			flex-direction: column;
			align-items: stretch;
			align-self: stretch;
			gap: 0.9rem;
		}

		.hero-cta,
		.hero-demo {
			justify-content: center;
			padding: 0.85rem 1.5rem;
			font-size: 0.95rem;
		}

		.hero-eyebrow {
			margin-bottom: 0.9rem;
		}

		.luna-hero-wrap {
			/* MOCKUP MÓVIL: ella PRESIDE arriba (cabeza junto al nav), el copy
			   respira debajo. Centrada horizontal con overflow-x-clip del root
			   — el recorte simétrico mantiene la pose centrada. */
			right: 50%;
			transform: translateX(50%);
			bottom: auto;
			top: 4.6rem;
			height: min(46svh, 26rem);
			width: auto;
		}

		/* Chips compactos, TODOS dentro del viewport (el wrap es más ancho
		   que la pantalla en móvil: anclar por left/right del VIEWPORT) */
		.hero-chip {
			font-size: 0.78rem;
			padding: 0.5rem 0.8rem;
		}

		/* MOCKUP MÓVIL: a junto a su cabeza (derecha), b cruzando a su
		   izquierda, c bajo su brazo. Anclados al viewport con vw: dentro SIEMPRE */
		.hero-chip--a { top: calc(4.6rem + 4svh); right: 4vw; left: auto; }
		.hero-chip--b { top: calc(4.6rem + 22svh); left: 4vw; right: auto; }
		.hero-chip--c { top: calc(4.6rem + 36svh); bottom: auto; right: 6vw; left: auto; }

		/* Anillo proporcional a la pose */
		.hero-ring {
			inset: -4% -6%;
		}

		/* Demo vuelve a botón full-width (mockup móvil) */
		.hero-demo {
			justify-content: center;
			border-radius: var(--radius-full);
			border: 1px solid color-mix(in srgb, var(--text-primary) 22%, transparent);
			background: color-mix(in srgb, var(--text-primary) 6%, transparent);
			padding: 0.85rem 1.5rem;
			font-size: 0.95rem;
		}

		/* Nav del carrusel centrado bajo la pose */
		.hero-pose-nav {
			right: 50%;
			transform: translateX(50%);
			bottom: auto;
			top: calc(4.6rem + min(46svh, 26rem) + 0.4rem);
		}
	}	/* A consistent optical rhythm keeps adjacent sections from stacking two
   oversized padding blocks on top of one another. */

	.features-section {
		padding: clamp(5rem, 7vw, 6.5rem) 0 clamp(6rem, 9vw, 8rem);
	}

	.features-title {
		max-width: 44rem;
		margin: 0 0 clamp(4.5rem, 7vw, 6rem);
		font-size: clamp(2.5rem, 4.5vw, 3.5rem);
		line-height: 1.05;
	}

	.feature-list {
		display: flex;
		flex-direction: column;
		gap: clamp(6rem, 10vw, 8rem);
	}


	/* Alternating feature showcase */
	.feature-row {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	/* Real full-app screenshots, shown directly with rounded corners + a soft
	   shadow (theme-aware, no gradient panel). */
	.feature-img {
		display: block;
		width: 100%;
		height: auto;
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-lg);
	}

	.feature-img--dark {
		display: none;
	}

	:global(.dark) .feature-img--light {
		display: none;
	}

	:global(.dark) .feature-img--dark {
		display: block;
	}

	.feature-copy {
		max-width: 27rem;
	}

	.feature-h2 {
		margin: 0 0 1rem;
		font-size: clamp(1.75rem, 2.6vw, 2.35rem);
		font-weight: 600;
		line-height: 1.15;
		letter-spacing: -0.02em;
		color: var(--text-primary);
		text-wrap: balance;
	}

	.feature-body {
		margin: 0;
		font-size: 1.0625rem;
		line-height: 1.6;
		color: var(--text-secondary);
	}

	/* Screenshots drift gently against the scroll while their row is in view.
	   Scroll-driven animation; browsers without support just skip it. */
	@supports (animation-timeline: view()) {
		.feature-media {
			animation: featureDrift linear both;
			animation-timeline: view();
		}
	}

	@keyframes featureDrift {
		from {
			transform: translateY(26px);
		}
		to {
			transform: translateY(-26px);
		}
	}

	@media (min-width: 900px) {
		.feature-row {
			flex-direction: row-reverse;
			align-items: center;
			gap: clamp(4rem, 6vw, 5.5rem);
		}

		.feature-row--rev {
			flex-direction: row;
		}

		.feature-media {
			flex: 1.6;
			min-width: 0;
		}

		.feature-copy {
			flex: 1;
		}

		/* Rows enter from the side their screenshot sits on (media is on the
		   right by default, left on --rev rows). Cleared by .revealed below. */
		.feature-row.reveal {
			transform: translate(36px, 20px);
		}

		.feature-row--rev.reveal {
			transform: translate(-36px, 20px);
		}
	}

	/* Statement */
	.statement {
		padding: clamp(4rem, 6vw, 6rem) 0;
	}

	.statement-text {
		margin: 0;
		font-size: clamp(2rem, 5vw, 3.5rem);
		font-weight: 600;
		line-height: 1.15;
		letter-spacing: -0.03em;
		color: var(--text-primary);
	}

	.statement-muted {
		color: var(--text-tertiary);
	}

	/* Statement words hold blurred until the line scrolls into view, then
	   resolve left to right on the hero's curve. */
	.st-word {
		display: inline-block;
		opacity: 0;
		filter: blur(10px);
		transform: translateY(6px);
	}

	.statement-text:global(.revealed) .st-word {
		animation: wordBlurIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) var(--wd, 0ms) forwards;
	}

	@keyframes wordBlurIn {
		to {
			opacity: 1;
			filter: blur(0);
			transform: none;
		}
	}

	/* Scroll-reveal: blur-fade-up, same language as the hero */
	.reveal {
		opacity: 0;
		transform: translateY(20px);
		filter: blur(8px);
		transition:
			opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
			transform 0.7s cubic-bezier(0.16, 1, 0.3, 1),
			filter 0.7s cubic-bezier(0.16, 1, 0.3, 1);
		transition-delay: var(--reveal-delay, 0ms);
	}

	/* `.revealed` is toggled by the reveal action at runtime, so mark it global
	   to stop Svelte pruning this rule as "unused". */
	.reveal:global(.revealed) {
		opacity: 1;
		transform: none;
		filter: blur(0);
	}

	/* Blog section header: title left, action right */
	.blog-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
		margin-bottom: clamp(3rem, 5vw, 4rem);
	}

	.home-blog {
		padding: clamp(5rem, 7vw, 7rem) 0;
	}

	.home-blog-title {
		margin: 0;
		font-size: clamp(2.25rem, 4vw, 3rem);
		line-height: 1.08;
	}

	.home-blog-copy {
		margin: 0.875rem 0 0;
		font-size: 1.0625rem;
	}

	.home-blog-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: clamp(1.25rem, 2.5vw, 2rem);
	}

	/* Blog cards (flat) */
	.channel-card {
		display: flex;
		flex-direction: column;
		text-decoration: none;
		border-radius: var(--radius-xl);
		overflow: hidden;
		background: var(--bg-tertiary);
		box-shadow: var(--shadow-sm);
		transition:
			transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
			box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.channel-card:hover {
		transform: translateY(-3px);
		box-shadow: var(--shadow-lg);
	}

	.channel-media {
		aspect-ratio: 16 / 11;
		overflow: hidden;
		background: color-mix(in srgb, var(--text-primary) 6%, var(--bg-page));
	}

	.channel-media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.channel-card:hover .channel-media img {
		transform: scale(1.04);
	}

	.channel-body {
		display: flex;
		flex-direction: column;
		flex: 1;
		gap: 0.5rem;
		padding: 1.5rem;
	}

	.channel-date {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.channel-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		line-height: 1.3;
		color: var(--text-primary);
		text-wrap: balance;
	}

	.channel-cta {
		margin-top: auto;
	}

	.closing-cta {
		padding: clamp(6rem, 9vw, 8rem) 0 clamp(3rem, 5vw, 5rem);
	}

	.closing-cta-inner {
		padding-inline: var(--marketing-gutter);
	}

	.closing-cta-title {
		margin: 0;
		font-size: clamp(3rem, 5vw, 4rem);
		line-height: 1.04;
	}

	.closing-cta-copy {
		margin-top: 1.25rem;
		margin-bottom: 2.25rem;
		font-size: 1.125rem;
	}

	@media (max-width: 767px) {
		.features-title {
			font-size: clamp(2.25rem, 11vw, 3rem);
		}

		.home-blog-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.channel-body {
			padding: 1.25rem;
		}
	}

	/* ── Shared section heads ─────────────────────────────────── */
	.vs-head,
	.bond-head,
	.moments-head,
	.faq-head {
		max-width: 46rem;
		margin: 0 auto clamp(3rem, 5vw, 4.5rem);
		text-align: center;
		padding-inline: var(--marketing-gutter);
	}

	.vs-title,
	.bond-title,
	.moments-title,
	.faq-title {
		margin: 0;
		font-size: clamp(2.5rem, 5vw, 3.75rem);
		font-weight: 600;
		line-height: 1.04;
		letter-spacing: -0.03em;
	}

	.vs-sub,
	.bond-sub,
	.moments-sub {
		margin: 1.1rem auto 0;
		max-width: 36rem;
		font-size: 1.0625rem;
		line-height: 1.6;
	}

	/* ── The difference: plain chat vs Luna ─────────────────── */
	.vs-section {
		padding: clamp(5rem, 8vw, 7rem) 0;
	}

	.vs-grid {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: clamp(1rem, 2.5vw, 2rem);
		align-items: stretch;
	}

	.vs-card {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		padding: 1.1rem 1.25rem 0;
		border-radius: var(--radius-xl);
		background: color-mix(in srgb, var(--text-primary) 3%, transparent);
		border: 1px solid color-mix(in srgb, var(--text-primary) 9%, transparent);
	}

	.vs-card--luna {
		padding: 1.1rem 1.25rem 1.1rem;
		border-color: color-mix(in srgb, var(--text-primary) 18%, transparent);
	}

	.vs-card-head {
		display: flex;
		align-items: center;
		gap: 0.8rem;
	}

	.vs-dot {
		width: 42px;
		height: 42px;
		border-radius: var(--radius-full);
		flex-shrink: 0;
	}

	.vs-dot--ai {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		color: var(--text-tertiary);
		background: linear-gradient(135deg, var(--border-subtle), var(--border-light));
	}

	.vs-avatar {
		width: 42px;
		height: 42px;
		border-radius: var(--radius-full);
		object-fit: cover;
	}

	.vs-name {
		margin: 0;
		font-weight: 600;
		color: var(--text-primary);
	}

	.vs-status {
		margin: 0;
		font-size: 0.8rem;
		color: var(--text-tertiary);
	}

	.vs-status--live {
		color: var(--accent);
	}

	.vs-chips {
		margin-left: auto;
		display: inline-flex;
		gap: 0.4rem;
	}

	.vs-chip {
		padding: 0.3rem 0.75rem;
		border-radius: var(--radius-full);
		border: 1px solid color-mix(in srgb, var(--text-primary) 16%, transparent);
		color: var(--text-secondary);
		font-size: 0.8rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.vs-bubbles {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		flex: 1;
		justify-content: center;
		padding: 0.5rem 0;
	}

	.vs-bubble {
		margin: 0;
		padding: 0.6rem 0.9rem;
		border-radius: var(--radius-lg);
		font-size: 0.92rem;
		line-height: 1.5;
		max-width: 85%;
	}

	.vs-bubble--them {
		align-self: flex-start;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
	}

	.vs-bubble--me {
		align-self: flex-end;
		background: var(--text-primary);
		color: var(--bg-page);
	}

	.vs-typing {
		display: inline-flex;
		gap: 0.35rem;
		align-self: flex-start;
		padding: 0.8rem 1rem;
		border-radius: var(--radius-lg);
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		margin: 0;
	}

	.vs-typing span {
		width: 6px;
		height: 6px;
		border-radius: var(--radius-full);
		background: var(--text-tertiary);
		animation: vsBlink 1.2s infinite;
	}

	.vs-typing span:nth-child(2) {
		animation-delay: 0.15s;
	}

	.vs-typing span:nth-child(3) {
		animation-delay: 0.3s;
	}

	@keyframes vsBlink {
		0%,
		60%,
		100% {
			opacity: 0.3;
		}
		30% {
			opacity: 1;
		}
	}

	.vs-scene {
		position: relative;
		border-radius: var(--radius-xl);
		overflow: hidden;
		flex: 1;
	}

	.vs-scene img {
		display: block;
		width: 100%;
		height: clamp(230px, 24vw, 330px);
		object-fit: cover;
		object-position: center top;
	}

	/* Bottom scrim so the floating line always has contrast on the photo.
	   Light mode: white wash under the ink line — long and eased, no visible
	   edge. Dark mode flips to the charcoal wash below. */
	.vs-scene::after {
		content: '';
		position: absolute;
		inset: auto 0 0;
		height: 58%;
		background: linear-gradient(
			to top,
			rgba(255, 255, 255, 0.95) 0%,
			rgba(255, 255, 255, 0.72) 24%,
			rgba(255, 255, 255, 0.32) 48%,
			rgba(255, 255, 255, 0.1) 72%,
			transparent 100%
		);
		pointer-events: none;
	}

	.vs-overlay {
		position: absolute;
		left: 1rem;
		right: 1rem;
		bottom: 1rem;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.6rem;
	}

	.vs-line {
		margin: 0;
		font-size: 1rem;
		line-height: 1.5;
		/* Light mode: ink over the white scrim — silver text on bright photos
		   washed out. Dark mode flips back to white below. */
		color: var(--text-primary);
		text-shadow: 0 1px 10px rgba(255, 255, 255, 0.7);
		text-wrap: balance;
	}

	:global(.dark) .vs-scene::after {
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.55) 0%,
			rgba(0, 0, 0, 0.34) 26%,
			rgba(0, 0, 0, 0.14) 52%,
			rgba(0, 0, 0, 0.05) 72%,
			transparent 88%
		);
	}

	:global(.dark) .vs-line {
		color: #fff;
		text-shadow: 0 1px 12px rgba(0, 0, 0, 0.55);
	}

	.vs-line strong {
		margin-right: 0.3rem;
		font-weight: 800;
		color: color-mix(in srgb, var(--text-primary) 88%, transparent);
	}

	.vs-voice {
		padding: 0.35rem 0.8rem;
		border-radius: var(--radius-full);
		/* Moderate glass chip over the photo: tinted enough to read white-on-dark
		   even where the light-mode scrim runs beneath it. */
		background: rgba(10, 10, 14, 0.58);
		border: 1px solid rgba(255, 255, 255, 0.18);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
		color: #fff;
		font-size: 0.78rem;
		font-weight: 600;
		backdrop-filter: blur(10px) saturate(1.2);
		-webkit-backdrop-filter: blur(10px) saturate(1.2);
	}

	/* legacy selector kept for safety */
	.vs-scene .vs-bubble--luna {
		position: absolute;
		left: 1rem;
		right: 1rem;
		bottom: 1rem;
		max-width: none;
		z-index: 1;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.22);
		color: #fff;
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}



	.vs-card-foot {
		padding: 0.75rem 0.25rem 1rem;
		font-size: 0.85rem;
		color: var(--text-tertiary);
		line-height: 1.5;
	}

	.vs-card-foot--luna {
		padding: 1rem 0.25rem 0;
		color: var(--text-secondary);
	}

	.vs-divider {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.vs-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 46px;
		height: 46px;
		border-radius: var(--radius-full);
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		font-weight: 700;
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	@media (max-width: 899px) {
		.vs-grid {
			grid-template-columns: 1fr;
		}

		.vs-divider {
			padding: 0.25rem 0;
		}
	}

	/* ── The bond: editorial timeline + phone ─────────────── */
	.bond-section {
		padding: clamp(5rem, 8vw, 7rem) 0;
	}

	.bond-grid {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
		gap: clamp(3rem, 6vw, 5.5rem);
		align-items: start;
	}

	.bond-sticky {
		position: sticky;
		top: clamp(5rem, 10vh, 7.5rem);
	}

	/* Phone mock: pure CSS, no images — cheap and crisp */
	.bond-phone {
		position: relative;
		width: min(320px, 78vw);
		margin-inline: auto;
		aspect-ratio: 9 / 19;
		border-radius: 44px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(16, 16, 22, 0.55);
		backdrop-filter: blur(22px) saturate(1.4);
		-webkit-backdrop-filter: blur(22px) saturate(1.4);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.18),
			0 30px 80px rgba(0, 0, 0, 0.55);
		padding: 1.4rem 1.15rem 1.6rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		overflow: hidden;
	}

	.phone-notch {
		position: absolute;
		top: 0.7rem;
		left: 50%;
		transform: translateX(-50%);
		width: 84px;
		height: 22px;
		border-radius: var(--radius-full);
		background: rgba(0, 0, 0, 0.65);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.phone-screen {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		margin-top: 1.6rem;
	}

	.phone-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.phone-apps {
		gap: 0.4rem;
	}

	.phone-pill {
		padding: 0.3rem 0.85rem;
		border-radius: var(--radius-full);
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
		font-size: 0.78rem;
		font-weight: 600;
	}

	.phone-pill--dim {
		background: transparent;
		color: var(--text-tertiary);
		font-weight: 500;
	}

	.phone-h {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.phone-count {
		margin-left: auto;
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--accent);
	}

	.phone-quest {
		padding: 0.65rem 0.8rem;
		border-radius: var(--radius-lg);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.07);
	}

	.phone-quest-icon {
		font-size: 0.95rem;
	}

	.phone-quest-text {
		font-size: 0.85rem;
		color: var(--text-primary);
	}

	.phone-claim {
		margin-left: auto;
		padding: 0.28rem 0.75rem;
		border-radius: var(--radius-full);
		background: var(--accent);
		color: #050507;
		font-size: 0.72rem;
		font-weight: 700;
	}

	.phone-quest-n {
		margin-left: auto;
		font-size: 0.78rem;
		color: var(--text-tertiary);
	}

	.phone-flame {
		font-size: 1.1rem;
	}

	.phone-streak {
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.phone-dots {
		display: flex;
		gap: 0.45rem;
		justify-content: center;
	}

	.phone-dot {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
		background: rgba(255, 255, 255, 0.14);
	}

	.phone-dot--on {
		background: var(--accent);
	}

	.phone-progress {
		flex-direction: column;
		align-items: stretch;
		gap: 0.4rem;
		margin-top: auto;
	}

	.phone-bar {
		height: 6px;
		border-radius: var(--radius-full);
		background: rgba(255, 255, 255, 0.1);
		overflow: hidden;
	}

	.phone-bar span {
		display: block;
		height: 100%;
		width: 46%;
		border-radius: inherit;
		background: linear-gradient(90deg, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.45));
	}

	.phone-bar-label {
		font-size: 0.72rem;
		color: var(--text-tertiary);
		text-align: center;
	}

	/* Editorial timeline — line + dots, no cards */
	.bond-steps {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: clamp(3.5rem, 6vw, 5rem);
		margin: 0;
		padding: 0.5rem 0 0 0;
		list-style: none;
	}

	.bond-steps::before {
		content: '';
		position: absolute;
		top: 0.9rem;
		bottom: 0.9rem;
		left: 5px;
		width: 1px;
		background: linear-gradient(to bottom, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.04));
	}

	.bond-step {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-left: 2.2rem;
	}

	.bond-dot {
		position: absolute;
		left: 0;
		top: 0.3rem;
		width: 11px;
		height: 11px;
		border-radius: var(--radius-full);
		background: var(--accent);
		box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.12);
	}

	.bond-step:nth-child(even) .bond-dot {
		background: rgba(255, 255, 255, 0.55);
		box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.08);
	}

	.bond-day-tag {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-tertiary);
	}

	.bond-step-title {
		margin: 0;
		font-size: clamp(1.5rem, 2.6vw, 2rem);
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.15;
		color: var(--text-primary);
		text-wrap: balance;
	}

	.bond-step-body {
		margin: 0;
		max-width: 34rem;
		font-size: 1.02rem;
		line-height: 1.65;
		color: var(--text-secondary);
	}

	.bond-chip {
		align-self: flex-start;
		margin-top: 0.4rem;
		padding: 0.32rem 0.85rem;
		border-radius: var(--radius-full);
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.04);
		font-size: 0.78rem;
		color: var(--text-secondary);
	}

	@media (max-width: 899px) {
		.bond-grid {
			grid-template-columns: 1fr;
		}

		.bond-sticky {
			display: none;
		}
	}

	/* ── Moments: keepsake cards ───────────────────────────────── */
	.moments-section {
		padding: clamp(5rem, 8vw, 7rem) 0;
	}

	.moments-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: clamp(1.25rem, 2.5vw, 2rem);
		max-width: 62rem;
		margin-inline: auto;
	}

	.moment-card {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		padding: 1rem 1rem 1.25rem;
		border-radius: var(--radius-xl);
		margin: 0;
		transition: transform 0.4s var(--ease-brand), box-shadow 0.4s var(--ease-brand);
	}

	.moment-card--tilt-l {
		rotate: -2.4deg;
	}

	.moment-card--tilt-r {
		rotate: 2deg;
	}

	.moment-card:hover {
		rotate: 0deg;
		transform: translateY(-6px);
		box-shadow: var(--shadow-lg);
	}

	.moment-media {
		border-radius: calc(var(--radius-xl) - 8px);
		overflow: hidden;
		background: color-mix(in srgb, var(--text-primary) 6%, var(--bg-page));
	}

	.moment-media img {
		display: block;
		width: 100%;
		height: auto;
		object-fit: cover;
		aspect-ratio: 3 / 4;
		transition: transform 0.5s var(--ease-brand);
	}

	.moment-card:hover .moment-media img {
		transform: scale(1.05);
	}

	.moment-quote {
		margin: 0.3rem 0.2rem 0;
		font-size: 0.95rem;
		line-height: 1.5;
		color: var(--text-primary);
		font-style: italic;
		text-wrap: balance;
	}

	.moment-date {
		margin: 0 0.2rem 0;
		font-size: 0.78rem;
		color: var(--text-tertiary);
	}

	@media (max-width: 899px) {
		.moments-grid {
			grid-template-columns: 1fr;
			max-width: 24rem;
		}
	}

	/* Moment cards drift gently on scroll (progressive enhancement) */
	@supports (animation-timeline: view()) {
		.moment-card {
			animation: momentDrift linear both;
			animation-timeline: view();
			animation-range: entry 0% cover 34%;
		}
	}

	@keyframes momentDrift {
		from {
			opacity: 0;
			transform: translateY(46px) rotate(4deg);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	/* Orbital features: an icon node tethered to her + the fact beside it.
	   Apple-style cascade on the shared timeline (--st per element). */
	.orbit-feat {
		position: absolute;
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 0.9rem;
		pointer-events: none;
	}

	/* Curved composition, anchored to the RING (not the viewport edge):
	   the middle row rides ring-a's horizontal extremes, the outer rows tuck
	   in toward her. On ultra-wide screens the capped ring keeps everything
	   close to the character; the max() guard prevents off-screen at 1100px. */
	.orbit-feat--l1 { left: max(0.9rem, calc(50% - var(--orbit-d) / 2 - 10rem)); top: 21%; flex-direction: row-reverse; text-align: right; }
	.orbit-feat--l2 { left: max(0.6rem, calc(50% - var(--orbit-d) / 2 - 14.5rem)); top: 45%; flex-direction: row-reverse; text-align: right; }
	.orbit-feat--l3 { left: max(0.9rem, calc(50% - var(--orbit-d) / 2 - 10rem)); top: 69%; flex-direction: row-reverse; text-align: right; }
	.orbit-feat--r1 { right: max(0.9rem, calc(50% - var(--orbit-d) / 2 - 10rem)); top: 21%; }
	.orbit-feat--r2 { right: max(0.6rem, calc(50% - var(--orbit-d) / 2 - 14.5rem)); top: 45%; }
	.orbit-feat--r3 { right: max(0.9rem, calc(50% - var(--orbit-d) / 2 - 10rem)); top: 69%; }

	.orbit-node {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3.1rem;
		height: 3.1rem;
		flex: 0 0 auto;
		border-radius: 50%;
		border: 1px solid color-mix(in srgb, var(--text-primary) 22%, transparent);
		background: color-mix(in srgb, var(--bg-page) 55%, transparent);
		box-shadow:
			0 0 22px color-mix(in srgb, var(--text-primary) 9%, transparent),
			inset 0 0 12px color-mix(in srgb, var(--text-primary) 5%, transparent);
		color: var(--text-primary);
		/* cascade helpers (--st-shift: per-breakpoint head start, phones
	   bring the whole cascade forward so it never overlaps the ink) */
		opacity: calc(min(max((var(--p, 0) - var(--st, 0.42) - var(--st-shift, 0)) * 5, 0), 1));
		transform: scale(calc(0.7 + min(max((var(--p, 0) - var(--st, 0.42) - var(--st-shift, 0)) * 3.2, 0), 1) * 0.3));
		filter: blur(calc(max(1 - (var(--p, 0) - var(--st, 0.42) - var(--st-shift, 0)) * 5, 0) * 6px));
	}

	.orbit-copy {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		max-width: 12rem;
		font-size: 0.86rem;
		line-height: 1.45;
		color: var(--text-secondary);
		opacity: calc(min(max((var(--p, 0) - var(--st, 0.425) - var(--st-shift, 0)) * 5, 0), 1));
		transform: translate3d(0, calc((1 - min(max((var(--p, 0) - var(--st, 0.425) - var(--st-shift, 0)) * 2.8, 0), 1)) * 14px), 0);
		filter: blur(calc(max(1 - (var(--p, 0) - var(--st, 0.425) - var(--st-shift, 0)) * 5, 0) * 5px));
	}

	.orbit-copy strong {
		font-size: 1.02rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	/* The supporting sentence collapses first on narrow screens; the title
	   stays beside its icon at every width. */
	.orbit-copy-body {
		opacity: 0.85;
	}

	/* Cast dock: the bundled forms of Luna, summonable (companion3d-style).
	   Bare group — no plate behind it (the user asked to remove that fill);
	   only the ACTIVE pill carries the subtlest wash. Timeline finishes by
	   p=0.82 so the dock is never caught half-blurred in the settled state. */
	.cast-dock {
		position: absolute;
		/* Flex-centered instead of translateX: immune to the layout shift
		   that was letting the group wander off-center on phones. */
		left: 0;
		right: 0;
		/* Lifted off the note below: the caption needs its air (breathing
		   room, neither glued nor sprawling) on every screen size. */
		bottom: clamp(4.7rem, 11svh, 6.6rem);
		justify-content: center;
		z-index: 6;
		display: flex;
		align-items: center;
		gap: 0.3rem;
		opacity: calc(min(max((var(--p, 0) - 0.66) * 6, 0), 1));
		transform: translate3d(0, calc((1 - min(max((var(--p, 0) - 0.66) * 4, 0), 1)) * 18px), 0);
		filter: blur(calc(max(1 - (var(--p, 0) - 0.66) * 5, 0) * 5px));
	}

	.cast-dock-arrow {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto; /* never crushed by the group's max-width */
		width: 1.7rem;
		height: 1.7rem;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition: color 0.2s ease, background 0.2s ease, transform 0.2s ease;
	}

	.cast-dock-arrow:hover {
		color: var(--text-primary);
		background: color-mix(in srgb, var(--text-primary) 8%, transparent);
	}

	.cast-dock-arrow:active {
		transform: scale(0.9);
	}

	/* The dock only answers once the scene is dressed (class toggled by the
	   supervisor at p≥0.84): no invisible clicks while it is still fading in. */
	.cast-dock .cast-dock-pill,
	.cast-dock .cast-dock-arrow {
		pointer-events: none;
	}

	:global(.is-dressed) .cast-dock .cast-dock-pill,
	:global(.is-dressed) .cast-dock .cast-dock-arrow {
		pointer-events: auto;
	}

	.cast-dock-pill {
		display: inline-flex;
		align-items: center;
		flex: 0 0 auto; /* keep pill geometry: no squash, no label overflow */
		white-space: nowrap;
		gap: 0.5rem;
		padding: 0.34rem 0.85rem 0.34rem 0.4rem;
		min-height: 2.4rem;
		border-radius: var(--radius-full);
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.88rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
	}

	.cast-dock-pill:hover {
		color: var(--text-primary);
		background: color-mix(in srgb, var(--text-primary) 7%, transparent);
	}

	.cast-dock-pill--on {
		color: var(--text-primary);
		background: color-mix(in srgb, var(--text-primary) 6%, transparent);
		border-color: color-mix(in srgb, var(--text-primary) 12%, transparent);
	}

	.cast-dock-avatar {
		width: 1.7rem;
		height: 1.7rem;
		border-radius: 50%;
		object-fit: cover;
		object-position: 50% 22%;
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16);
	}

	/* "Conoce a Luna" removed: on the shared timeline it only lived for
	   ~40% of the runway at mid-scroll speed — users read it half-blurred
	   while fighting the cascade. The scene reads as hero → features →
	   her line, no intermediate headline needed. */

	/* Her line floats free — no card behind it (companion3d keeps the speech
	   as bare text over the stage). A whisper of shadow keeps it legible over
	   the pale glow right behind her chest. */
	.cast-bubble {
		position: absolute;
		left: 1.25rem;
		right: 1.25rem;
		margin-inline: auto;
		bottom: clamp(8.2rem, 19svh, 10.5rem); /* clears the raised cast dock */
		max-width: min(34rem, calc(100vw - 2.5rem));
		color: var(--text-primary);
		font-size: 1.02rem;
		line-height: 1.55;
		text-align: center;
		/* Light scene: dark ink needs a LIGHT halo to pop off Luna — a dark
		   shadow here reads as gray smear (ghosting). Dark scene flips back. */
		text-shadow:
			0 1px 12px rgba(255, 255, 255, 0.95),
			0 0 24px rgba(255, 255, 255, 0.85);
		--st: 0.6; /* she speaks after the orbit features have all landed */
		/* Entrance ramps sized so EVERY channel completes by p=0.88 (the
		   settled state): 0.6 + 1/5 = 0.8. Never re-tune one multiplier
		   alone — a channel that finishes past settle freezes mid-entrance
		   (that was the permanently-blurred bubble on mobile). */
		opacity: calc(min(max((var(--p, 0) - var(--st)) * 5, 0), 1));
		transform: translate3d(0, calc((1 - min(max((var(--p, 0) - var(--st)) * 2.5, 0), 1)) * 20px), 0);
		filter: blur(calc(max(1 - (var(--p, 0) - var(--st)) * 5, 0) * 6px));
		pointer-events: none;
		z-index: 5; /* above Luna (2) and the vignette (4) */
	}

	.cast-bubble strong {
		margin-right: 0.28rem;
		font-weight: 700;
	}

	/* Dark scene: the white halo is invisible on charcoal — flip back to the
	   dark whisper that melts her into the floor. */
	:global(.dark) .cast-bubble {
		text-shadow:
			0 1px 14px rgba(0, 0, 0, 0.45),
			0 0 4px rgba(0, 0, 0, 0.3);
	}

	:global(.dark) .cast-note {
		text-shadow: none;
	}

	.cast-note {
		position: absolute;
		left: 50%;
		bottom: calc(1.35rem + env(safe-area-inset-bottom, 0px));
		transform: translateX(-50%);
		z-index: 5;
		margin: 0;
		width: max-content;
		max-width: calc(100vw - 2rem);
		text-align: center;
		font-size: 0.8rem;
		color: var(--text-tertiary);
		text-shadow: 0 1px 10px rgba(255, 255, 255, 0.9);
		/* Last of the cascade: she arrives once the scene is fully dressed.
		   Fully on BEFORE the settled state (0.88) — never caught half-faded. */
		opacity: calc(min(max((var(--p, 0) - 0.7) * 7, 0), 1));
	}

	@media (max-width: 640px) {
		/* Phones (≤640px): the supporting sentence hides, the TITLES stay
		   beside their icon, and rows STAGGER (left rows sit higher than their
		   right twin) so facing titles can never collide on a 360–430px phone.
		   The scene gains a floor so the last row + dock never stack. */
		.scene {
			height: auto;
			/* Shorter runway on phones (user feedback: too much scrolling for
			   the same show): 380svh keeps every beat readable — the staggered
			   rows, the walk, the dock — without the thumb marathon. svh:
			   stable while the mobile URL bar collapses/expands. */
			min-height: 380svh;
		}

		.orbit-feat--l1 { top: 12%; }
		.orbit-feat--l2 { top: 33%; }
		.orbit-feat--l3 { top: 54%; }
		.orbit-feat--r1 { top: 19%; }
		.orbit-feat--r2 { top: 40%; }
		.orbit-feat--r3 { top: 61%; }

		.orbit-copy-body {
			display: none;
		}

		.orbit-copy {
			max-width: 7.2rem;
			font-size: 0.74rem;
		}

		.orbit-copy strong {
			font-size: 0.82rem;
		}

		.orbit-node {
			width: 2.4rem;
			height: 2.4rem;
		}

		.orbit-feat--l1,
		.orbit-feat--l3 {
			left: 0.9rem;
		}

		.orbit-feat--l2 {
			left: 0.45rem;
		}

		.orbit-feat--r1,
		.orbit-feat--r3 {
			right: 0.9rem;
		}

		.orbit-feat--r2 {
			right: 0.45rem;
		}

		/* Clean hand-off on short viewports: her line starts later BUT still
		   completes ALL channels (opacity, blur, translate) BEFORE the settled
		   state (p=0.88). With --st 0.74 the entrance ran PAST the settle point
		   and the bubble froze at ~1.8px blur forever — the user's screenshot:
		   "Luna ¡¿Qué tal te fue?!" reading soft/out-of-focus. 0.68 + the
		   /2.5 ramp lands the entrance fully dressed by p≈0.87. */
		.cast-bubble {
			--st: 0.68;
			/* Vertical rhythm on phones: the block floats BETWEEN her melting
			   feet and the dock — more air above (clear of the legs) and a
			   wider gap to the dock below; type one step down so the two
			   lines read as a calm block, not a squeezed caption. */
			bottom: clamp(9.2rem, 21svh, 11.2rem);
			font-size: 0.95rem;
			line-height: 1.5;
		}

		/* Same discipline for the last-of-cascade note: it must be fully on
		   before settle. Slightly earlier so its ramp completes too. */
		.cast-note {
			opacity: calc(min(max((var(--p, 0) - 0.62) * 7, 0), 1));
		}

		.cast-dock {
			bottom: clamp(4.5rem, 10.5svh, 6.2rem);
		}

		/* Legs vs her line: on short screens the fade that melts her into
		   the floor ends BELOW the speech bubble, so her knees cross the
		   text. Two-part fix: a stronger melt AND a bigger final rise —
		   her feet end higher, above the densest part of the wash. */
		.scene-luna {
			--luna-rise: 9svh * min(max((var(--p, 0) - 0.55) * 3.5, 0), 1);
		}

		.scene-luna-fade {
			height: clamp(14rem, 40svh, 19rem);
			opacity: calc(0.55 + var(--p, 0) * 0.45);
		}

		/* Her line needs guaranteed legibility over ANY pose (the model is
		   proportionally taller on phones — legs reach the text zone no
		   matter the framing). A radial halo of stage color behind the
		   text: same treatment as the white text-shadow, as volume. Not a
		   card — no border, no fill edge, it just pushes the backdrop back. */
		.cast-bubble::before {
			content: '';
			position: absolute;
			inset: -1.1rem -1.6rem;
			z-index: -1;
			border-radius: 50%;
			background: radial-gradient(
				50% 50% at 50% 50%,
				color-mix(in srgb, var(--bg-page) 88%, transparent) 30%,
				color-mix(in srgb, var(--bg-page) 55%, transparent) 62%,
				transparent 100%
			);
			opacity: calc(min(max((var(--p, 0) - 0.7) * 6, 0), 1));
		}
	}

	/* Tablets & small desktops (641–1099px): same SYMMETRIC orbit as the big
	   screen (the phone stagger reads unbalanced at these widths) with
	   compact copy — matching how companion3d scales its cast section.
	   Row 3 rides higher: short tablet viewports squeezed the desktop
	   percentages until the last row crashed into the speech bubble. */
	@media (min-width: 641px) and (max-width: 1099px) {
		/* Ring recalibrated for tablets: at these widths 74vw dwarfs the stage
		   (features pinned to the screen edge, detached from the character).
		   58vw keeps the desktop ring-to-stage proportion, so the features hug
		   the orbit exactly like on a big screen — same calibration. */
		.scene {
			--orbit-d: min(40rem, 58vw);
		}

		/* Even spacing (like desktop's 21/45/69 rhythm) that still clears the
		   speech bubble on short tablet viewports. */
		.orbit-feat--l1,
		.orbit-feat--r1 {
			top: 18%;
		}

		.orbit-feat--l2,
		.orbit-feat--r2 {
			top: 41%;
		}

		.orbit-feat--l3,
		.orbit-feat--r3 {
			top: 64%;
		}

		.orbit-copy-body {
			display: none;
		}

		.orbit-copy {
			max-width: 8.5rem;
			font-size: 0.78rem;
		}

		.orbit-copy strong {
			font-size: 0.88rem;
		}

		.orbit-node {
			width: 2.7rem;
			height: 2.7rem;
		}

		/* The desktop CURVE, tablet-sized: the desktop anchors derive from the
		   ring diameter with fixed rem insets (10/14.5rem) that are huge next
		   to the smaller tablet ring — everything flattened onto one line.
		   Scaled-down versions of the same offsets restore the arc: the middle
		   row rides the ring's horizontal extreme, the outer rows tuck in
		   toward her, exactly like the big screen. */
		.orbit-feat--l1,
		.orbit-feat--l3 {
			left: max(0.9rem, calc(50% - var(--orbit-d) / 2 - 6rem));
		}

		.orbit-feat--l2 {
			left: max(0.6rem, calc(50% - var(--orbit-d) / 2 - 9rem));
		}

		.orbit-feat--r1,
		.orbit-feat--r3 {
			right: max(0.9rem, calc(50% - var(--orbit-d) / 2 - 6rem));
		}

		.orbit-feat--r2 {
			right: max(0.6rem, calc(50% - var(--orbit-d) / 2 - 9rem));
		}
	}

	/* Reduced motion: everything lands at once, no scrub. Solo opacity/filter:
	   el rail y el label viven de su translate de centrado — tocar transform
	   los descentraría. */
	@media (prefers-reduced-motion: reduce) {
		.scene-hero-ink,
		.hero-rail,
		.hero-scroll-label,
		.orbit-node,
		.orbit-copy,
		.cast-bubble,
		.cast-dock {
			opacity: 1;
			filter: none;
		}

		.cast-dock,
		.cast-note {
			opacity: 1 !important;
			filter: none;
		}

		.cast-dock {
			transform: none;
		}
	}

	/* ── FAQ: minimal editorial list	/* ── FAQ: minimal editorial list, hairline dividers, no cards ── */
	.faq-section {
		padding: clamp(4rem, 6vw, 5.5rem) 0 clamp(3rem, 5vw, 4rem);
	}

	.faq-shell {
		max-width: 46rem;
	}

	.faq-list {
		display: flex;
		flex-direction: column;
	}

	.faq-item {
		border-bottom: 1px solid color-mix(in srgb, var(--text-primary) 10%, transparent);
	}

	.faq-q {
		padding: 1.15rem 0;
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--text-primary);
		cursor: pointer;
		list-style: none;
		&::-webkit-details-marker {
			display: none;
		}
	}

	.faq-q::before {
		content: '+';
		float: right;
		font-weight: 400;
		color: var(--text-tertiary);
		transition: rotate 0.25s var(--ease-brand);
	}

	.faq-item[open] .faq-q::before {
		rotate: 45deg;
		color: var(--text-primary);
	}

	.faq-a {
		padding: 0 2rem 1.3rem 0;
		font-size: 0.98rem;
		line-height: 1.65;
		color: var(--text-secondary);
	}

	/* Respect reduced motion across the whole page */
	@media (prefers-reduced-motion: reduce) {
		.reveal {
			opacity: 1;
			transform: none;
			filter: none;
			transition: none;
		}

		.hero-enter {
			opacity: 1;
			filter: none;
			translate: none;
			animation: none;
		}


		.st-word {
			opacity: 1;
			filter: none;
			transform: none;
			animation: none;
		}

		.feature-media {
			animation: none;
		}

		.luna-hero {
			transition: none;
		}

		.channel-card:hover,
		.feature-media,
		.channel-media img {
			transform: none;
		}
	}
</style>
