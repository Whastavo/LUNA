<script lang="ts">
	import { marketingImage } from '$lib/utils/marketing-images';
	import { page } from '$app/state';
	import { getSortedPosts } from '$lib/utils/blog-posts';
	import { formatDate } from '$lib/utils/format-date';
	import { sectionUrl } from '$lib/config/links';

	// Newest posts for the Blog hover dropdown. blog-posts uses an eager glob, so
	// this resolves synchronously at build time and is safe to read during SSR.
	const recentPosts = getSortedPosts().slice(0, 4);

	const pathname = $derived(page.url.pathname);
	const onHome = $derived(pathname === '/');
	const onBlog = $derived(pathname.startsWith('/blog'));

	let menuOpen = $state(false);
	let scrolled = $state(false);

	// The nav sits flush and borderless at the top of the page, then condenses
	// into a glass bar once the page scrolls.
	$effect(() => {
		const onScroll = () => (scrolled = window.scrollY > 8);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	// Close the mobile menu on navigation.
	$effect(() => {
		void pathname;
		menuOpen = false;
	});

	$effect(() => {
		const desktop = window.matchMedia('(min-width: 769px)');
		const closeOnDesktop = () => { if (desktop.matches) menuOpen = false; };
		desktop.addEventListener('change', closeOnDesktop);
		return () => desktop.removeEventListener('change', closeOnDesktop);
	});

	// Escape closes the mobile menu while it is open.
	$effect(() => {
		if (!menuOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') menuOpen = false;
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	// Scrolling the page dismisses the open menu: the sheet is anchored to
	// the bar, so a moving page behind it reads as broken. once:true — the
	// first scroll tick closes; internal sheet scrolling never hits window.
	$effect(() => {
		if (!menuOpen) return;
		const close = () => (menuOpen = false);
		window.addEventListener('scroll', close, { passive: true, once: true });
		return () => window.removeEventListener('scroll', close);
	});
</script>	<nav aria-label="Navegación principal" class="site-nav" class:scrolled={scrolled || menuOpen} class:menu-open={menuOpen}>
	<div class="site-nav-inner">
		<a href="/" class="site-nav-brand" aria-label="Inicio de Luna">
			<img src="/brand-assets/logo.svg" alt="Luna" class="site-nav-logo" />
		</a>

		<div class="site-nav-links">
			<a href="/#features" class="site-nav-link" class:active={onHome}>Funciones</a>

			<!-- Blog + recent-posts dropdown. Reveal is pure hover/focus-within, no
			     click state; the Blog link itself still navigates to /blog. -->
			<div class="nav-item">
				<a href="/blog" class="site-nav-link" class:active={onBlog}>Blog</a>

				{#if recentPosts.length}
					<div class="nav-dropdown">
						<div class="nav-dropdown-card">
							{#each recentPosts as post (post.slug)}
								<a href="/blog/{post.slug}" class="nav-dropdown-row">
									<img class="nav-dropdown-thumb" {...marketingImage(post.image, '48px', true)} alt="" loading="lazy" />
									<span class="nav-dropdown-text">
										<span class="nav-dropdown-title">{post.title}</span>
										<time class="nav-dropdown-date" datetime={post.date}>{formatDate(post.date)}</time>
									</span>
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</div>

		</div>

		<div class="site-nav-right">
			<a href={sectionUrl('app')} class="site-nav-try">Pruébala</a>
			<a href="/descargar" class="btn btn-primary btn-sm site-nav-cta">Descargar</a>
			<button
				type="button"
				class="site-nav-burger"
				onclick={() => (menuOpen = !menuOpen)}
				aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
				aria-expanded={menuOpen}				aria-controls="site-nav-mobile"
		>
			<!-- Apple-style hamburger (SF Symbols line.3.horizontal): hairline
		     strokes with round caps that morph into an X when open. Sized to
		     optically match the brand mark beside it. -->
			<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
				<!-- Modern two-line menu glyph (three lines are yesterday): the pair
				     morphs into a clean X centered on the 24px grid. -->
				<line class="burger-line burger-line--top" x1="3.5" y1="9" x2="20.5" y2="9" />
				<line class="burger-line burger-line--bot" x1="3.5" y1="15" x2="20.5" y2="15" />
			</svg>
		</button>
		</div>
	</div>
</nav>

<!-- Sheet lives OUTSIDE the <nav>: the nav's backdrop-filter makes it a
     containing block, so a fixed child clamps to the bar's box and the scrim
     could never cover the page below. As a SIBLING stacked under the nav it
     reads as ONE continuous sheet with the bar — same tint, same blur —
     separated by a hairline that only exists while the menu is open. -->
<div
	id="site-nav-mobile"
	class="site-nav-mobile"
	class:open={menuOpen}
	aria-hidden={!menuOpen}
	inert={!menuOpen}
>
	<div class="site-nav-mobile-links">
		<a href="/#features" class="site-nav-mobile-link" onclick={() => (menuOpen = false)}>Funciones</a>
		<a href="/blog" class="site-nav-mobile-link" onclick={() => (menuOpen = false)}>Blog</a>
	</div>
	<div class="site-nav-mobile-actions">
		<a
			href={sectionUrl('app')}
			class="btn btn-block site-nav-mobile-try"
			onclick={() => (menuOpen = false)}>Pruébala en vivo</a
		>
		<a
			href="/descargar"
			class="btn btn-primary btn-block"
			onclick={() => (menuOpen = false)}>Descargar</a
		>
	</div>
</div>

<!-- Full-viewport dim behind the open sheet. Sits UNDER both the nav and
     the sheet so it can never tint them — only the page below. -->
<button
	type="button"
	class="site-nav-backdrop"
	class:open={menuOpen}
	aria-label="Cerrar menú"
	aria-hidden={!menuOpen}
	disabled={!menuOpen}
	tabindex="-1"
	onclick={() => (menuOpen = false)}
></button>

<style>
	/* Neutral expo greys in dark: the global tokens are blue-tinted */
	:global(.dark) .site-nav {
		--bg-primary: #131316;
		--bg-secondary: #1a1a1e;
		--bg-tertiary: #232327;
	}

	.site-nav {
		position: sticky;
		top: 0;
		z-index: 50;
		background: transparent;
		-webkit-backdrop-filter: blur(14px) saturate(1.4);
		backdrop-filter: blur(14px) saturate(1.4);
		border-bottom: 1px solid transparent;
		transition: background 0.3s ease;
	}

	/* Apple-minimal: frosted background on scroll, never a divider line */
	.site-nav.scrolled {
		background: color-mix(in srgb, var(--bg-page) 72%, transparent);
	}	/* Open menu: the bar leads the sheet. 85% tint (near-solid — page text
	   must NOT read through) + a hairline that only exists while open: the
	   one visible seam between the bar and the unfolded menu. */
	.site-nav.menu-open {
		background: color-mix(in srgb, var(--bg-page) 85%, transparent);
		-webkit-backdrop-filter: blur(24px) saturate(1.5);
		backdrop-filter: blur(24px) saturate(1.5);
		border-bottom-color: color-mix(in srgb, var(--text-primary) 6%, transparent);
	}

	.site-nav-inner {
		max-width: 80rem;
		margin: 0 auto;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		align-items: center;
		padding: 0.9rem var(--marketing-gutter);
	}

	.site-nav-brand {
		display: inline-flex;
		grid-column: 1;
		justify-self: start;
		align-items: center;
		text-decoration: none;
	}

	/* Logo reads black in light, white in dark. The SVG's own media query
	   follows the OS, not the site theme — force the glyph via filter so the
	   mark is always visible in BOTH themes regardless of OS setting. */
	.site-nav-logo {
		height: 1.125rem;
		width: auto;
		filter: brightness(0);
		opacity: 0.85;
	}

	:global(.dark) .site-nav-logo {
		filter: brightness(0) invert(1);
		opacity: 0.95;
	}

	.site-nav-links {
		display: flex;
		grid-column: 2;
		justify-self: center;
		align-items: center;
		gap: 1.75rem;
	}

	.site-nav-link {
		font-size: 0.875rem;
		color: var(--text-secondary);
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.site-nav-link:hover,
	.site-nav-link.active {
		color: var(--text-primary);
	}

	/* Blog item anchors the hover/focus dropdown */
	.nav-item {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.nav-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		z-index: 60;
		/* Invisible bridge so moving the cursor from Blog down to the panel
		   keeps it open across the visual gap */
		padding-top: 0.75rem;
		opacity: 0;
		visibility: hidden;
		transform: translateY(-4px);
		pointer-events: none;
		transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease;
	}

	.nav-item:hover .nav-dropdown,
	.nav-item:focus-within .nav-dropdown {
		opacity: 1;
		visibility: visible;
		transform: none;
		pointer-events: auto;
	}	.nav-dropdown-card {
		width: 20rem;
		max-width: calc(100vw - 2rem);
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: 0.375rem;
		/* Real liquid glass, popover-grade: a solid frosted sheet (72% tint +
		   strong blur) like Apple's menus — glassy, never see-through. */
		background: color-mix(in srgb, var(--bg-page) 72%, transparent);
		-webkit-backdrop-filter: blur(24px) saturate(1.5);
		backdrop-filter: blur(24px) saturate(1.5);
		border: 1px solid var(--lg-hairline);
		box-shadow:
			inset 0 1px 0 var(--lg-hairline-top),
			0 16px 40px -16px rgba(0, 0, 0, 0.28);
		border-radius: var(--radius-lg);
	}

	.nav-dropdown-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: background 0.15s ease;
	}

	.nav-dropdown-row:hover {
		/* Alpha wash, not a solid fill: the row tints the glass instead of
		   covering it (expo.dev-style hover). */
		background: var(--hover-wash);
	}

	.nav-dropdown-thumb {
		width: 3rem;
		height: 3rem;
		flex-shrink: 0;
		object-fit: cover;
		border-radius: var(--radius-md);
		background: var(--bg-tertiary);
	}

	.nav-dropdown-text {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.nav-dropdown-title {
		font-size: 0.8125rem;
		font-weight: 600;
		line-height: 1.35;
		color: var(--text-primary);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.nav-dropdown-date {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.site-nav-right {
		display: flex;
		grid-column: 3;
		justify-self: end;
		align-items: center;
		gap: 0.625rem;
	}

	/* Quiet companion to the Descargar CTA: ghost pill, hairline edge.
	   Box-matched to .btn-sm's rendered height (same font metrics, tighter
	   pad: the btn stack measures ~27.6px tall) so both CTAs sit identical. */
	.site-nav-try {
		display: inline-flex;
		align-items: center;
		padding: 0.2rem 0.95rem;
		border-radius: var(--radius-full);
		border: 1px solid color-mix(in srgb, var(--text-primary) 18%, transparent);
		background: transparent;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text-primary);
		text-decoration: none;
		transition: background 0.2s ease, border-color 0.2s ease;
	}

	.site-nav-try:hover {
		background: color-mix(in srgb, var(--text-primary) 8%, transparent);
		border-color: color-mix(in srgb, var(--text-primary) 30%, transparent);
	}

	/* Hamburger (mobile only): bare icon, no plate — Apple-minimal. */
	.site-nav-burger {
		display: none;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: var(--radius-full);
		color: var(--text-primary);
		background: transparent;
		border: none;
		cursor: pointer;
		transition-property: color, opacity, scale;
		transition-duration: 180ms;
		transition-timing-function: ease-out;
	}

	.site-nav-burger:hover {
		opacity: 0.65;
	}

	.site-nav-burger:active {
		scale: 0.92;
	}

	.burger-line {
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
		transform-box: view-box;
		transform-origin: 12px 12px;
		transition-property: transform, opacity;
		transition-duration: 320ms, 200ms;
		transition-timing-function: cubic-bezier(0.2, 0, 0, 1), ease;
	}

	/* Morph to X: translate first (rightmost) to the center of the grid,
	   then rotate about it — lines at y=9/15 meet at 12 with ±3px. */
	.site-nav.menu-open .burger-line--top {
		transform: rotate(45deg) translateY(3px);
	}

	.site-nav.menu-open .burger-line--bot {
		transform: rotate(-45deg) translateY(-3px);
	}

	/* Mobile menu sheet: a SIBLING of the nav, fixed flush under the bar at
	   the same tint + blur — bar and sheet read as ONE continuous slab, with
	   the hairline (bar's border-bottom, only while open) as the sole seam. */
	.site-nav-mobile {
		position: fixed;
		top: 4.625rem;
		left: 0;
		right: 0;
		z-index: 48; /* under the nav (50), over the scrim (47) */
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-height: calc(100dvh - 4.625rem);
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 0.625rem 1rem 1.25rem;
		background: color-mix(in srgb, var(--bg-page) 85%, transparent);
		-webkit-backdrop-filter: blur(24px) saturate(1.5);
		backdrop-filter: blur(24px) saturate(1.5);
		box-shadow:
			0 12px 28px -12px rgba(0, 0, 0, 0.2),
			0 28px 54px -28px rgba(0, 0, 0, 0.22);
		opacity: 0;
		visibility: hidden;
		transform: translateY(-8px);
		pointer-events: none;
		/* NOTE: no `filter` here — any filter value (even blur(0)) disables the
		   element's own backdrop-filter in Chromium, which left the panel as a
		   flat transparent tint instead of glass. Animate opacity only. */
		transition-property: opacity, transform, visibility;
		transition-duration: 200ms, 200ms, 0s;
		transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
		transition-delay: 0s, 0s, 0s, 200ms;
	}

	.site-nav-mobile.open {
		opacity: 1;
		visibility: visible;
		transform: none;
		pointer-events: auto;
		transition-delay: 0s;
	}

	/* Full-viewport scrim behind the open menu. A SIBLING of the nav: inside
	   the nav (which has backdrop-filter → containing block) its fixed box
	   resolved against the nav's 74px bar and the page below stayed uncovered.
	   Covers the WHOLE viewport (top: 0): bar and sheet then compose over the
	   same dimmed page — identical tint, identical blur, ONE material. Blur is
	   a whisper (2px): the page stays recognizable behind the glass. */
	.site-nav-backdrop {
		position: fixed;
		inset: 0;
		z-index: 47; /* under the sheet (48) and the nav (50): dims the page only */
		border: none;
		padding: 0;
		background: rgba(0, 0, 0, 0.4);
		-webkit-backdrop-filter: blur(2px);
		backdrop-filter: blur(2px);
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition-property: opacity, visibility;
		transition-duration: 220ms, 0s;
		transition-timing-function: ease-out;
		transition-delay: 0s, 220ms;
	}

	.site-nav-backdrop.open {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
		transition-delay: 0s;
	}

	.site-nav-mobile-links {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.site-nav-mobile-link {
		display: flex;
		min-height: 3rem;
		align-items: center;
		padding: 0 0.875rem;
		border-radius: var(--radius-md);
		font-size: 1rem;
		font-weight: 500;
		color: var(--text-primary);
		text-decoration: none;
		transition-property: color, background-color;
		transition-duration: 150ms;
		transition-timing-function: ease-out;
	}

	.site-nav-mobile-link:hover {
		/* Alpha wash over the glass sheet — a tint, never a solid block. */
		background: var(--hover-wash);
	}

	.site-nav-mobile-actions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		padding-top: 0.25rem;
	}

	/* Mobile "Pruébala en vivo": the same transparent ghost pill as the
	   desktop nav (no fill, hairline edge) beside the solid Descargar. */
	.site-nav-mobile-try {
		background: transparent;
		border: 1px solid color-mix(in srgb, var(--text-primary) 18%, transparent);
		color: var(--text-primary);
	}

	.site-nav-mobile-try:hover:not(:disabled) {
		background: color-mix(in srgb, var(--text-primary) 8%, transparent);
	}

	@media (max-width: 768px) {
		.site-nav-links {
			display: none;
		}

		.site-nav-cta,
		.site-nav-try {
			display: none;
		}

		.site-nav-burger {
			display: inline-flex;
		}
	}

	@media (min-width: 769px) {
		.site-nav-mobile,
		.site-nav-backdrop {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.nav-dropdown {
			transform: none;
			transition: opacity 0.18s ease, visibility 0.18s ease;
		}

		.site-nav-mobile,
		.site-nav-backdrop,
		.site-nav-burger {
			transform: none;
			filter: none;
			transition: none;
		}

		.burger-line {
			transition: none;
		}
	}
</style>
