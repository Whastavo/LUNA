<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { cycleTheme, getIconName, getLabel } from '$lib/config/docs-theme-toggle.svelte';

	const themeIcon = $derived(getIconName());
	const themeLabel = $derived(getLabel());

	// Crossfade the whole page between themes where the browser supports it.
	function handleTheme() {
		if (document.startViewTransition) {
			document.startViewTransition(cycleTheme);
		} else {
			cycleTheme();
		}
	}
</script>

<footer class="site-footer">
	<div class="site-footer-inner">
		<div class="site-footer-top">
			<p class="site-footer-tagline">La compañera de IA que puedes ver y con la que puedes hablar.</p>

			<div class="site-footer-cols">
				<div class="site-footer-col">
					<h3>Producto</h3>
					<a href="/#features">Funciones</a>
					<a href="/descargar">Descargar</a>
					<a href="/app">Pruébala en vivo</a>
				</div>
				<div class="site-footer-col">
					<h3>Recursos</h3>
					<a href="/documentacion">Documentación</a>
					<a href="/blog">Blog</a>
				</div>
				<div class="site-footer-col">
					<h3>Legal</h3>
					<a href="/privacy">Política de Privacidad</a>
					<a href="/terms">Términos de Uso</a>
				</div>
			</div>
		</div>

		<div class="site-footer-bottom">
			<span>&copy; 2026 Whizzend.</span>
			<div class="site-footer-actions">
				<button
					type="button"
					onclick={handleTheme}
					class="site-footer-theme-btn"
					aria-label={`Tema: ${themeLabel}`}
					title={themeLabel}
				>
					<Icon name={themeIcon} size={15} />
				</button>
			</div>
		</div>
	</div>
</footer>

<style>
	.site-footer-inner {
		max-width: 80rem;
		margin: 0 auto;
		padding: clamp(4rem, 7vw, 6rem) var(--marketing-gutter) 2rem;
	}

	.site-footer-top {
		display: grid;
		grid-template-columns: minmax(16rem, 1fr) auto;
		gap: clamp(3rem, 8vw, 7.5rem);
		align-items: start;
	}

	.site-footer-tagline {
		max-width: 25rem;
		margin: 0;
		font-size: clamp(1.125rem, 1.7vw, 1.5rem);
		line-height: 1.35;
		letter-spacing: -0.025em;
		color: var(--text-primary);
		text-wrap: balance;
	}

	.site-footer-cols {
		display: grid;
		grid-template-columns: repeat(3, minmax(7.5rem, 1fr));
		gap: clamp(1.5rem, 3vw, 3rem);
	}

	.site-footer-col {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.625rem;
	}

	.site-footer-col h3 {
		margin: 0 0 0.375rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.site-footer-col a {
		position: relative;
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--text-primary);
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.site-footer-col a:hover {
		color: var(--text-secondary);
	}

	.site-footer-bottom {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: clamp(4rem, 8vw, 7rem);
	}

	.site-footer-bottom span {
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	.site-footer-actions {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		gap: 0.125rem;
	}

	.site-footer-theme-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: var(--radius-full);
		color: var(--text-tertiary);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: color 0.15s ease, transform 0.1s ease;
	}

	.site-footer-theme-btn:hover {
		color: var(--text-primary);
	}

	.site-footer-theme-btn:active {
		transform: scale(0.96);
	}

	.site-footer-theme-btn:focus-visible {
		outline: 1px solid var(--text-secondary);
		outline-offset: -4px;
	}

	@media (max-width: 960px) {
		.site-footer-inner {
			padding-top: 4rem;
		}

		.site-footer-top {
			grid-template-columns: 1fr;
			gap: 3rem;
		}

		.site-footer-tagline {
			max-width: 20rem;
		}
	}

	@media (max-width: 600px) {
		.site-footer-cols {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 2.5rem 1.5rem;
		}

		.site-footer-bottom {
			align-items: flex-end;
			margin-top: 4rem;
		}

		.site-footer-bottom span {
			max-width: 15rem;
		}
	}
</style>
