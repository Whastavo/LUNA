<script lang="ts">
	import { fadeFast, pop } from '$lib/utils/motion';
	import { settingsModal, type SettingsView } from '$lib/stores/settings-modal.svelte';
	import { accountStore } from '$lib/stores/account.svelte';
	import { planAccentVar } from '$lib/config/economy';
	import Icon from '$lib/components/ui/Icon.svelte';
	import LunaAvatar from './LunaAvatar.svelte';
	import LunaRailShot from './LunaRailShot.svelte';
	import UserAvatar from './UserAvatar.svelte';

	import AccountView from './views/AccountView.svelte';
	import PlanView from './views/PlanView.svelte';
	import LunasView from './views/LunasView.svelte';
	import LunaView from './views/LunaView.svelte';
	import PersonalityView from './views/PersonalityView.svelte';
	import MemoryView from './views/MemoryView.svelte';
	import VoiceView from './views/VoiceView.svelte';
	import AppearanceView from './views/AppearanceView.svelte';
	import NotificationsView from './views/NotificationsView.svelte';
	import PrivacyView from './views/PrivacyView.svelte';
	import DisplayView from './views/DisplayView.svelte';
	import LlmView from './views/LlmView.svelte';
	import TtsView from './views/TtsView.svelte';
	import SttView from './views/SttView.svelte';
	import DataView from './views/DataView.svelte';
	import McpView from './views/McpView.svelte';
	import DeveloperView from './views/DeveloperView.svelte';
	import WardrobeOverlay from './overlays/WardrobeOverlay.svelte';

	interface NavEntry {
		id: SettingsView;
		label: string;
		desc: string;
		icon: string;
	}

	interface NavGroup {
		title: string;
		items: NavEntry[];
	}

	// Rol administrador: mientras no exista sesión real, el desplegable se
	// muestra por defecto (el dueño de la app es el admin). Cuando lleguen
	// las cuentas, esto leerá el rol del backend; 'luna-admin=false' lo oculta.
	const isAdmin = $derived(
		typeof localStorage === 'undefined' || localStorage.getItem('luna-admin') !== 'false'
	);

	// Herramientas técnicas: solo visibles dentro del desplegable de
	// Administración, y viven como vistas dentro del modal.
	const ADMIN_ITEMS: { id: SettingsView; label: string; icon: string }[] = [
		{ id: 'pantalla', label: 'Pantalla', icon: 'display' },
		{ id: 'llm', label: 'Modelo LLM', icon: 'brain' },
		{ id: 'tts', label: 'Voz (TTS)', icon: 'headset' },
		{ id: 'stt', label: 'Micrófono (STT)', icon: 'mic' },
		{ id: 'datos', label: 'Datos', icon: 'database' },
		{ id: 'mcp', label: 'Herramientas (MCP)', icon: 'cube' },
		{ id: 'dev', label: 'Desarrollador', icon: 'code' }
	];

	let adminOpen = $state(false);
	let adminBtnEl: HTMLElement | undefined = $state(undefined);
	let adminPos = $state({ left: 14, bottom: 96 });

	function toggleAdmin() {
		if (!adminOpen && adminBtnEl) {
			// Anclar el popover ENCIMA del chip que lo despliega (centrado a él).
			const r = adminBtnEl.getBoundingClientRect();
			const left = Math.max(12, Math.min(r.left + r.width / 2 - 108, window.innerWidth - 228));
			const bottom = Math.min(
				window.innerHeight - r.top + 10,
				window.innerHeight - 360
			);
			adminPos = { left, bottom: Math.max(60, bottom) };
		}
		adminOpen = !adminOpen;
	}

	const groups = $derived.by<NavGroup[]>(() => {
		const list: NavGroup[] = [
			{
				title: 'Cuenta',
				items: [
					{ id: 'cuenta', label: 'Cuenta', desc: 'Tu perfil y sesión', icon: 'circle-user' },
					{ id: 'plan', label: 'Plan', desc: 'Suscripción y beneficios', icon: 'crown' },
					{ id: 'lunas', label: 'Lunas', desc: 'Créditos y tienda', icon: 'coins' }
				]
			},
			{
				title: 'Luna',
				items: [
					{ id: 'luna', label: 'Luna', desc: 'Su apariencia y vínculo', icon: 'persona' },
					{ id: 'personalidad', label: 'Personalidad', desc: 'Cómo es contigo', icon: 'sliders' },
					{ id: 'memoria', label: 'Memoria', desc: 'Recuerdos y contexto', icon: 'layers' },
					{ id: 'voz', label: 'Voz', desc: 'Configuración de voz', icon: 'volume' }
				]
			},
			{
				title: 'Experiencia',
				items: [
					{ id: 'apariencia', label: 'Apariencia', desc: 'Tema y visualización', icon: 'palette' },
					{ id: 'notificaciones', label: 'Notificaciones', desc: 'Mensajes y recordatorios', icon: 'bell' },
					{ id: 'privacidad', label: 'Privacidad', desc: 'Tus datos y seguridad', icon: 'shield' }
				]
			}
		];
		return list;
	});

	const view = $derived(settingsModal.view);

	// ¿Estamos en una vista técnica? El chip de Administración queda marcado.
	const inAdminView = $derived(ADMIN_ITEMS.some((t) => t.id === view));

	// Orden plano de vistas para el carrusel: swipe y transición direccional.
	const VIEW_ORDER: SettingsView[] = [
		'cuenta',
		'plan',
		'lunas',
		'luna',
		'personalidad',
		'memoria',
		'voz',
		'apariencia',
		'notificaciones',
		'privacidad',
		'pantalla',
		'llm',
		'tts',		'stt',
		'datos',
		'mcp',
		'dev'
];

	// Vistas de usuario: el swipe de redes sociales SOLO recorre estas diez.
	const USER_ORDER = VIEW_ORDER.slice(0, 10);

	const VIEW_COMPONENTS: Record<SettingsView, unknown> = {
		cuenta: AccountView,
		plan: PlanView,
		lunas: LunasView,
		luna: LunaView,
		personalidad: PersonalityView,
		memoria: MemoryView,
		voz: VoiceView,
		apariencia: AppearanceView,
		notificaciones: NotificationsView,
		privacidad: PrivacyView,
		pantalla: DisplayView,
		llm: LlmView,
		tts: TtsView,
		stt: SttView,
		datos: DataView,
		mcp: McpView,
		dev: DeveloperView
	};

	let paneBody = $state<HTMLElement | undefined>(undefined);
	let scrolled = $state(false);

	function nav(to: SettingsView) {
		settingsModal.goTo(to);
		// La vista nueva empieza arriba: sin salto de contenido heredado.
		queueMicrotask(() => {
			if (paneBody) paneBody.scrollTop = 0;
		});
	}

	// Swipe con pointer events: funciona en teléfonos Y tablets (cualquier
	// puntero táctil), no depende del breakpoint de la interfaz.
	let swipeFromX = $state<number | null>(null);
	let swipeFromY = $state(0);

	// Barra inferior: degradados según posición de scroll + el chip activo
	// siempre a la vista cuando el usuario cambia de vista (swipe o nav).
	let navEl = $state<HTMLElement | undefined>(undefined);
	let navFade = $state({ left: false, right: false });

	function updateNavFade() {
		if (!navEl) return;
		const max = navEl.scrollWidth - navEl.clientWidth;
		navFade = { left: navEl.scrollLeft > 4, right: max > 4 && navEl.scrollLeft < max - 4 };
	}

	$effect(() => {
		view;
		settingsModal.open; // re-medir al abrir: navEl aún no existía antes
		// Microtask: corre siempre (rAF se congela en webviews en segundo
		// plano) y leer scrollWidth fuerza el layout, así que mide bien.
		queueMicrotask(() => {
			const nav = navEl;
			if (!nav) return;
			// Centrar el chip activo: scrollIntoView(smooth) no responde en
			// algunos webviews; el ajuste directo es fiable en todos.
			const active = nav.querySelector('.item.active') as HTMLElement | null;
			if (active) {
				const nb = nav.getBoundingClientRect();
				const ab = active.getBoundingClientRect();
				nav.scrollLeft += ab.left + ab.width / 2 - (nb.left + nb.width / 2);
			}
			updateNavFade();
		});
	});

	function swipeStart(e: PointerEvent) {
		// Con el desplegable abierto el gesto es del popover: no cambiar de vista.
		if (adminOpen) return;
		if (e.pointerType === 'mouse') return;
		swipeFromX = e.clientX;
		swipeFromY = e.clientY;
	}

	function swipeEnd(e: PointerEvent) {
		if (swipeFromX === null) return;
		const dx = e.clientX - swipeFromX;
		const dy = e.clientY - swipeFromY;
		swipeFromX = null;
		// Solo gestos horizontales claros: no interferir con el scroll vertical.
		if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
		// El gesto solo recorre las vistas de usuario: nunca se cuela en las
		// herramientas de administración (esas se abren desde su desplegable).
		const idx = USER_ORDER.indexOf(settingsModal.view);
		if (idx === -1) return;
		const next = dx < 0 ? idx + 1 : idx - 1;
		if (next < 0 || next >= USER_ORDER.length) return;
		nav(USER_ORDER[next]);
	}</script>

{#if settingsModal.open}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class="scrim"
		transition:fadeFast={{ duration: 160 }}
		onclick={(e) => {
			if (e.target === e.currentTarget) settingsModal.hide();
		}}
	>
		<div
			class="sheet"
			role="dialog"
			aria-modal="true"
			aria-label="Configuración"
			transition:pop={{ duration: 260, y: 18, scale: 0.985 }}
		>
			<!-- Sidebar -->
			<aside class="side">
				<header class="side-brand">
					<Icon name="sparkles" size={14} />
					<span class="brand-word">LUNA</span>
					<button
						class="mob-close"
						type="button"
						onclick={() => settingsModal.hide()}
						aria-label="Cerrar configuración"
					>
						<Icon name="x" size={15} />
					</button>
				</header>

				<nav
					class="side-nav"
					bind:this={navEl}
					class:fade-left={navFade.left}
					class:fade-right={navFade.right}
					aria-label="Secciones"
					onscroll={updateNavFade}
				>
				{#each groups as group (group.title)}
					<div class="group">
						<p class="group-title">{group.title}</p>							{#each group.items as item (item.id)}
								<button
									class="item"
									class:active={view === item.id}
									onclick={() => nav(item.id)}
								>
								<Icon name={item.icon} size={15} />
								<span class="item-text">
									<span class="item-label">{item.label}</span>
									<span class="item-desc">{item.desc}</span>
								</span>
							</button>
						{/each}
					</div>
				{/each}
				{#if isAdmin}
					<div class="group admin-group">
						<!-- Mismo ritmo que los demás grupos: título + contenido.
						     Sin él, el gap del nav se ve como hueco vacío. -->
						<p class="group-title">Administración</p>
						<button
							class="admin-toggle"
							class:active={adminOpen || inAdminView}
							bind:this={adminBtnEl}
							type="button"
							aria-expanded={adminOpen}
							onclick={toggleAdmin}
						>
							<Icon name="shield" size={15} />
							<span class="item-text">
								<span class="item-label">Administración</span>
								<span class="item-desc">Motores y datos</span>
							</span>
							<Icon name={adminOpen ? 'chevron-up' : 'chevron-down'} size={12} />
						</button>
					</div>
				{/if}
				</nav>				<footer class="side-foot">
					<div class="foot-user">
						<UserAvatar size={34} />
						<span class="foot-text">
							<span class="foot-name">Gustavo SA</span>
							<span
								class="foot-plan"
								style={`color: ${planAccentVar(accountStore.plan)}`}
								title="Miembro {accountStore.planName}"
							>
								<Icon name="crown" size={9} />
								Plan {accountStore.planName}
							</span>
						</span>
					</div>
				</footer>				</aside>

			<!-- Contenido -->
			<div class="pane" class:has-rail={view === 'cuenta'}>
				<header class="pane-header">
					<button class="close" onclick={() => settingsModal.hide()} aria-label="Cerrar configuración">
						<Icon name="x" size={15} />
					</button>
				</header>
				<div
					class="pane-body"
					class:scrolled
					class:flat={view === 'luna'}
					bind:this={paneBody}
					onscroll={(e) => (scrolled = e.currentTarget.scrollTop > 6)}
					onpointerdown={swipeStart}
					onpointerup={swipeEnd}
					onpointercancel={() => (swipeFromX = null)}
				>
					{#if settingsModal.overlay === 'vestuario'}
						<WardrobeOverlay />
					{:else}
						{#key view}
							<div class="view-slide" class:tall={view === 'luna'}>
								{#snippet render()}
									{@const Comp = VIEW_COMPONENTS[view] as typeof AccountView}
									<Comp />
								{/snippet}
								{@render render()}
							</div>
						{/key}				{/if}
				</div>

				{#if view === 'cuenta'}
					<!-- Rail de Cuenta: el retrato de Luna ES la columna derecha.
					     Vive fuera del scroll: siempre llena el alto del pane,
					     de borde a borde, como la referencia. -->
					<aside class="pane-rail">
						<div class="rail-figure">
							<LunaRailShot />
							<div class="rail-overlay">
								<span class="rail-name">Luna</span>
								<span class="rail-line">Tu compañera de siempre.</span>
								<blockquote class="rail-quote">
									“Gracias por estar aquí. Hacemos esto más especial juntos.”
								</blockquote>
								<button
									class="rail-plan"
									type="button"
									onclick={() => settingsModal.goTo('plan')}
								>
									<span
										class="rail-crown"
										style={`color: ${planAccentVar(accountStore.plan)}`}
									>
										<Icon name="crown" size={15} />
									</span>
									<span class="rail-plan-text">
										<span class="rail-plan-title">Miembro {accountStore.planName}</span>
										<span class="rail-plan-line">Gestiona tu suscripción y beneficios.</span>
									</span>
									<Icon name="chevron-right" size={12} />
								</button>
								<span class="rail-version">LUNA v{import.meta.env.VITE_APP_VERSION ?? '0.14.0'}</span>
							</div>
						</div>
					</aside>
				{/if}
			</div>
		</div>

		<!-- Panel flotante de Administración: fuera del sheet Y del scrim. Ambos
		     llevan backdrop-filter, y ese filtro secuestra el posicionamiento
		     fixed de los hijos — desde aquí fuera, el anclado al chip usa
		     coordenadas de ventana reales. -->
		{#if adminOpen}
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div
				class="admin-pop-scrim"
				onclick={(e) => {
					if (e.target === e.currentTarget) adminOpen = false;
				}}
			>
				<div
					class="admin-pop"
					style={`left: ${adminPos.left}px; bottom: ${adminPos.bottom}px`}
					transition:pop={{ duration: 200, y: 10 }}
					role="menu"
					aria-label="Herramientas de administración"
				>
					<header class="admin-pop-head">
						<span>Administración</span>
						<button class="admin-pop-close" type="button" onclick={() => (adminOpen = false)} aria-label="Cerrar administración">
							<Icon name="x" size={13} />
						</button>
					</header>
					{#each ADMIN_ITEMS as tech (tech.id)}
						<button
							class="admin-pop-item"
							class:active={view === tech.id}
							type="button"
							role="menuitem"
							onclick={() => {
								nav(tech.id);
								adminOpen = false;
							}}
						>
							<Icon name={tech.icon} size={14} />
							<span>{tech.label}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
	{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 90;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(0.75rem, 4vh, 3rem);
		background: color-mix(in srgb, var(--bg-page) 42%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	/* ── Sheet: liquid glass con tokens del sistema ─────────────── */
	.sheet {
		display: flex;
		width: min(1020px, 100%);
		height: min(680px, 100%);
		border-radius: var(--radius-xl);
		overflow: hidden;
		/* Superficie de LECTURA: en claro necesita humo más profundo que los
		   chips flotantes de la app para que el texto blanco contraste sobre
		   cualquier escena. En oscuro usa el token del sistema tal cual. */
		background: rgba(88, 88, 99, 0.84);
		backdrop-filter: blur(24px) saturate(1.5);
		-webkit-backdrop-filter: blur(24px) saturate(1.5);
		box-shadow:
			inset 0 2px 5px -2px rgba(255, 255, 255, 0.48),
			inset 0 0 2px 0.5px rgba(255, 255, 255, 0.22),
			inset 0 0 12px rgba(255, 255, 255, 0.1),
			inset 0 -8px 12px -8px rgba(255, 255, 255, 0.16),
			0 18px 40px rgba(0, 0, 0, 0.18);
		color: var(--chrome-text, rgba(255, 255, 255, 0.92));
		text-shadow: 0 1px 2px var(--chrome-text-shadow, rgba(0, 0, 0, 0.3));		/* Remap de tokens dentro del glass — con fallbacks LITERALES. El modal
	   no hereda los tokens chrome de la app: sin fallback, en modo claro
	   caen a los del tema de la página (texto #1d1d1f, chips #e8e8ed) y
	   el contraste muere. El vidrio siempre es humo: blanco en ambos modos. */
		--text-primary: var(--chrome-text, rgba(255, 255, 255, 0.94));
		--text-secondary: var(--chrome-text-dim, rgba(255, 255, 255, 0.68));
		--text-tertiary: var(--chrome-text-dim, rgba(255, 255, 255, 0.55));
		--ctp-subtext0: var(--chrome-text-dim, rgba(255, 255, 255, 0.68));
		--ctp-overlay0: var(--chrome-text-dim, rgba(255, 255, 255, 0.55));
		--border-subtle: var(--chrome-border, rgba(255, 255, 255, 0.22));
		--border-light: var(--chrome-border, rgba(255, 255, 255, 0.22));
		--accent: var(--text-primary);
		--accent-contrast: rgba(24, 24, 28, 0.95);
		--accent-muted: color-mix(in srgb, var(--text-primary) 9%, transparent);
		--accent-subtle: color-mix(in srgb, var(--text-primary) 4.5%, transparent);
		--bg-primary: color-mix(in srgb, var(--text-primary) 9%, transparent);
		--bg-secondary: color-mix(in srgb, var(--text-primary) 5.5%, transparent);
		--bg-tertiary: color-mix(in srgb, var(--text-primary) 11%, transparent);
		--scrollbar-thumb: color-mix(in srgb, var(--text-primary) 18%, transparent);
	}

	/* Modo oscuro: humo propio del modal, más profundo que el token
	   global del chrome (pinned — el modal es superficie de lectura). */
	:global(html.dark) .sheet {
		background: rgba(36, 36, 44, 0.7);
	}

	:global(html.dark) .admin-pop {
		background: rgba(36, 36, 44, 0.7);
	}

	/* ── Sidebar ─────────────────────────────────────────────────── */
	.side {
		width: 248px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		padding: 1.125rem 0.75rem 0.875rem;
		background: var(--chrome-wash, rgba(255, 255, 255, 0.04));
		/* División sutil: hairline apenas sugerida, no una pared */
		border-right: 1px solid color-mix(in srgb, var(--text-primary) 7%, transparent);
	}

	.side-brand {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem 1.125rem;
		color: var(--text-primary);
	}

	/* La X de cierre móvil solo vive en pantallas sin sidebar de columna */
	.mob-close {
		display: none;
	}

	.brand-word {
		font-size: 0.875rem;
		font-weight: 700;			letter-spacing: 0.34em;
		}

		.side-nav {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1.125rem;
		/* Respiro bajo el último grupo: el active de Administración
		   nunca toca la línea del pie */
		padding: 0 0.25rem 0.625rem;
		scrollbar-width: thin;
		scrollbar-color: var(--scrollbar-thumb) transparent;
	}

	.group {
		display: flex;
		flex-direction: column;
		/* Aire real entre items: el active y el hover de al lado no se pegan */
		gap: 0.25rem;
	}

	.group-title {
		margin: 0 0 0.375rem;
		padding: 0 0.625rem;
		font-size: 0.6563rem;
		font-weight: 620;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-tertiary);
	}

	.item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.625rem;
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: background 0.14s ease;
	}

	.item:hover {
		/* Halo mínimo: marca sin pintar un bloque */
		background: color-mix(in srgb, var(--text-primary) 4%, transparent);
	}

	.item.active {
		background: color-mix(in srgb, var(--text-primary) 8%, transparent);
	}

	.item :global(svg) {
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.item.active :global(svg) {
		color: var(--text-primary);
	}

	.item-text {
		display: flex;
		flex-direction: column;
		gap: 0.0625rem;
		min-width: 0;
	}

	.item-label {
		font-size: 0.8438rem;
		font-weight: 540;
		color: var(--text-primary);
	}

	.item-desc {
		font-size: 0.6875rem;
		color: var(--text-tertiary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.admin-toggle {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		padding: 0.5rem 0.625rem;
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: background 0.14s ease;
	}

	.admin-toggle:hover {
		background: color-mix(in srgb, var(--text-primary) 4%, transparent);
	}

	.admin-toggle :global(svg:first-child) {
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.admin-toggle .item-text {
		flex: 1;
	}

	.admin-toggle.active {
		background: color-mix(in srgb, var(--text-primary) 8%, transparent);
	}

	/* Panel flotante (como el de Cámara): aparece encima del sidebar */
	.admin-pop-scrim {
		position: fixed;
		inset: 0;
		z-index: 95;
	}

	.admin-pop {
		position: fixed;
		/* left/bottom los inyecta el JS anclado al chip que lo despliega */
		width: 216px;
		padding: 0.5rem;
		border-radius: var(--radius-lg);
		background: rgba(88, 88, 99, 0.84);
		backdrop-filter: blur(24px) saturate(1.5);
		-webkit-backdrop-filter: blur(24px) saturate(1.5);
		box-shadow:
			inset 0 2px 5px -2px rgba(255, 255, 255, 0.48),
			inset 0 0 2px 0.5px rgba(255, 255, 255, 0.22),
			inset 0 0 12px rgba(255, 255, 255, 0.1),
			inset 0 -8px 12px -8px rgba(255, 255, 255, 0.16),
			0 18px 40px rgba(0, 0, 0, 0.18);
		color: var(--chrome-text, rgba(255, 255, 255, 0.92));
		text-shadow: 0 1px 2px var(--chrome-text-shadow, rgba(0, 0, 0, 0.3));
		--text-primary: var(--chrome-text);
		--text-secondary: var(--chrome-text-dim);
		--text-tertiary: var(--chrome-text-dim);
		--border-subtle: var(--chrome-border);
		--border-light: var(--chrome-border);
		--bg-primary: var(--chrome-wash-strong);
		--bg-secondary: var(--chrome-wash);
		--bg-tertiary: var(--chrome-wash);
	}

	.admin-pop-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.375rem 0.5rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 620;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-tertiary);
	}

	.admin-pop-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--text-tertiary);
		cursor: pointer;
	}

	.admin-pop-close:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.admin-pop-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		padding: 0.5rem 0.625rem;
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		font: inherit;
		font-size: 0.8438rem;
		font-weight: 500;
		color: var(--text-primary);
		text-align: left;
		cursor: pointer;
		transition: background 0.13s ease;
	}

	.admin-pop-item:hover {
		background: color-mix(in srgb, var(--text-primary) 4%, transparent);
	}

	.admin-pop-item.active {
		background: color-mix(in srgb, var(--text-primary) 8%, transparent);
	}

	.admin-pop-item :global(svg) {
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.side-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.75rem 0.5rem 0;
		border-top: 1px solid color-mix(in srgb, var(--text-primary) 6%, transparent);
	}

	.foot-user {
		display: flex;
		align-items: center;
		gap: 0.5625rem;
		min-width: 0;
		flex: 1;
	}

	.foot-user :global(.user-avatar) {
		box-shadow: 0 0 0 1px var(--border-light);
	}

	.foot-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.foot-name {
		font-size: 0.8125rem;
		font-weight: 620;
		color: var(--text-primary);
	}

	/* El plan vive bajo el nombre, con la corona del acento — sin cápsulas. */
	.foot-plan {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.6875rem;
		font-weight: 600;
	}

	.foot-plan :global(svg) {
		filter: drop-shadow(0 0 4px color-mix(in srgb, currentColor 40%, transparent));
	}

	/* ── Pane ────────────────────────────────────────────────────── */
	.pane {
		position: relative;
		flex: 1;
		min-width: 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	/* ── Rail de Cuenta: el retrato ocupa TODA la columna derecha ── */
	.pane.has-rail .pane-body {
		margin-right: 248px;
	}

	.pane-rail {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 248px;
		overflow: hidden;
	}

	.rail-figure {
		position: relative;
		width: 100%;
		height: 100%;
	}


	.rail-overlay {
		position: absolute;
		inset: auto 0 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: 3.5rem 1.25rem 1.125rem;
		background: linear-gradient(
			180deg,
			rgba(10, 10, 14, 0) 0%,
			rgba(10, 10, 14, 0.45) 35%,
			rgba(10, 10, 14, 0.88) 74%,
			rgba(10, 10, 14, 0.95) 100%
		);
	}

	.rail-name {
		font-size: 1.1875rem;
		font-weight: 650;
		letter-spacing: -0.01em;
		color: #fff;
	}

	.rail-line {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.78);
	}

	.rail-quote {
		margin: 0.625rem 0 0;
		font-size: 0.75rem;
		font-style: italic;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.72);
	}

	.rail-plan {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		margin-top: 0.875rem;
		padding: 0.25rem 0;
		border: none;
		border-radius: var(--radius-md);
		background: transparent; /* sin caja: integrado al degradado, minimalista */
		font: inherit;
		text-align: left;
		color: #fff;
		cursor: pointer;
		transition: opacity 0.15s ease;
	}

	.rail-plan:hover {
		opacity: 0.85;
	}

	.rail-crown {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-full);
		background: rgba(255, 255, 255, 0.1);
		flex-shrink: 0;
	}

	.rail-plan-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.0625rem;
		min-width: 0;
	}

	.rail-plan-title {
		font-size: 0.8125rem;
		font-weight: 620;
	}

	.rail-plan-line {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.66);
	}

	.rail-plan :global(svg:last-child) {
		color: rgba(255, 255, 255, 0.6);
		flex-shrink: 0;
	}

	.rail-version {
		margin-top: 0.625rem;
		font-size: 0.6563rem;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.55);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	/* El rail desaparece con el sidebar; el contenido recupera el ancho */
	@media (max-width: 900px) {
		.pane-rail {
			display: none;
		}

		.pane.has-rail .pane-body {
			margin-right: 0;
		}
	}

	/* La X flota en la esquina: sin banda visible, el desvanecido del
	   contenido se encarga de que nada se vea al borde. */
	.pane-header {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 5;
		display: flex;
		padding: 0.625rem 0.75rem;
	}

	.close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: var(--radius-full);
		background: transparent; /* sin cápsula: solo el glifo, como la referencia */
		color: var(--text-secondary);
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease;
	}

	.close:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.pane-body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
		overscroll-behavior: contain;
		/* LA CINTA: desvanecido progresivo como el de la barra lateral, pero
		   con perfil en curva: visible hasta 88px del filo y ya prácticamente
		   invisible (12%) a 28px — el texto NUNCA llega con cuerpo a la esquina. */
		mask-image: linear-gradient(
			to bottom,
			black calc(100% - 88px),
			rgba(0, 0, 0, 0.55) calc(100% - 56px),
			rgba(0, 0, 0, 0.12) calc(100% - 28px),
			transparent
		);
		-webkit-mask-image: linear-gradient(
			to bottom,
			black calc(100% - 88px),
			rgba(0, 0, 0, 0.55) calc(100% - 56px),
			rgba(0, 0, 0, 0.12) calc(100% - 28px),
			transparent
		);
		scrollbar-width: thin;
		scrollbar-color: var(--scrollbar-thumb) transparent;
	}

	.view-slide {
		min-height: 100%;
	}

	/* Luna parte su scroll por dentro (retrato fijo + detalle): necesita
	   altura definida, no min-height — si no, la vista crece y scrollea el pane. */
	.view-slide.tall {
		height: 100%;
	}

	/* Luna parte su scroll por dentro (su detalle tiene desvanecidos
	   propios): la cinta del pane sería un DOBLE fade de ~140px — fuera. */
	/* Luna ya trae sus propios fades en el wrapper del detalle: la cinta
	   del pane NUNCA debe apilarse — ni en reposo ni al scrollear (por eso
	   esta regla gana a .scrolled aunque venga después). */
	.pane-body.flat,
	.pane-body.flat.scrolled {
		mask-image: none;
		-webkit-mask-image: none;
	}

	/* Scrolleando: el mismo perfil en espejo arriba — a 28px del borde
	   el texto ya casi no existe, cero cuerpo en la esquina. */
	.pane-body.scrolled {
		mask-image: linear-gradient(
			to bottom,
			transparent,
			rgba(0, 0, 0, 0.12) 28px,
			rgba(0, 0, 0, 0.55) 56px,
			black 88px,
			black calc(100% - 88px),
			rgba(0, 0, 0, 0.55) calc(100% - 56px),
			rgba(0, 0, 0, 0.12) calc(100% - 28px),
			transparent
		);
		-webkit-mask-image: linear-gradient(
			to bottom,
			transparent,
			rgba(0, 0, 0, 0.12) 28px,
			rgba(0, 0, 0, 0.55) 56px,
			black 88px,
			black calc(100% - 88px),
			rgba(0, 0, 0, 0.55) calc(100% - 56px),
			rgba(0, 0, 0, 0.12) calc(100% - 28px),
			transparent
		);
	}

	/* ── Responsive ──────────────────────────────────────────────── */
	@media (max-width: 767px) {
		.sheet {
			flex-direction: column;
			border-radius: var(--radius-lg);
		}

		/* El aside se disuelve: logo arriba, contenido al centro,
		   y el selector de vistas como barra inferior (tab bar). */
		.side {
			display: contents;
		}

		.side-brand {
			order: -1;
			position: relative;
			display: flex;
			align-items: center;
			width: 100%;
			padding: 0.75rem 3rem 0.375rem 0.875rem; /* sin línea: la vista arranca de una */
		}

		/* La X vive arriba a la derecha, en la fila del logo */
		.mob-close {
			position: absolute;
			right: 0.625rem;
			top: 50%;
			transform: translateY(-50%);
			display: flex;
			align-items: center;
			justify-content: center;
			width: 34px;
			height: 34px;
			border: none;
			border-radius: var(--radius-full);
			background: transparent; /* sin fondo: solo el glifo */
			color: var(--text-secondary);
			cursor: pointer;
		}

		.mob-close:hover {
			background: var(--bg-secondary);
			color: var(--text-primary);
		}

		.pane {
			order: 0;
			position: relative;
		}

		/* Móvil usa solo la X de la fila del logo: la del panel no existe */
		.pane-header {
			display: none;
		}

		/* Barra inferior de vistas: sin scrollbar visible jamás */
		.side-nav {
			order: 1;
			flex: none;
			flex-direction: row;
			align-items: center;
			overflow-x: auto;
			gap: 0.375rem;
			padding: 0.5rem 0.875rem calc(0.5rem + env(safe-area-inset-bottom, 0px));
			border-top: 1px solid var(--border-subtle);
			scrollbar-width: none;
			-ms-overflow-style: none;
			touch-action: pan-x;
		}

		.side-nav::-webkit-scrollbar {
			display: none;
		}

		/* Degradado que anuncia más opciones: los chips se desvanecen
		   hacia el borde en vez de cortarse de golpe. */
		.side-nav.fade-right {
			mask-image: linear-gradient(to right, black calc(100% - 64px), transparent);
			-webkit-mask-image: linear-gradient(to right, black calc(100% - 64px), transparent);
		}

		.side-nav.fade-left.fade-right {
			mask-image: linear-gradient(to right, transparent, black 40px, black calc(100% - 64px), transparent);
			-webkit-mask-image: linear-gradient(to right, transparent, black 40px, black calc(100% - 64px), transparent);
		}

		.side-nav.fade-left {
			mask-image: linear-gradient(to right, transparent, black 40px);
			-webkit-mask-image: linear-gradient(to right, transparent, black 40px);
		}

		/* El cuerpo lee como página: sin barra de scroll visible en táctil */
		.pane-body {
			scrollbar-width: none;
			-ms-overflow-style: none;
		}

		.pane-body::-webkit-scrollbar {
			display: none;
		}

		.group {
			flex-direction: row;
			gap: 0.375rem;
		}

		.group-title {
			display: none;
		}

		.item {
			white-space: nowrap;
			padding: 0.3125rem 0.6875rem;
			border-radius: var(--radius-full);
		}

		.item-text {
			display: block;
		}

		.item.active {
			/* Active ligero: wash tenue en vez de bloque grueso */
			background: color-mix(in srgb, var(--text-primary) 9%, transparent);
		}

		.item.active .item-label {
			font-weight: 600;
		}

		.item-desc {
			display: none;
		}

		.admin-toggle {
			padding: 0.3125rem 0.6875rem;
		}

		.admin-toggle :global(svg:last-child) {
			display: none;
		}

		.side-foot {
			display: none;
		}

		.pane-body {
			flex: 1;
			min-height: 0;
			touch-action: pan-y;
		}
	}

	/* Teléfonos angostos: la lámina ocupa casi todo el alto */
	@media (max-width: 480px) {
		.scrim {
			padding: 0.5rem;
			align-items: stretch;
		}

		.sheet {
			width: 100%;
			height: 100%;
			border-radius: var(--radius-lg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sheet {
			transition: none !important;
		}
	}
</style>
