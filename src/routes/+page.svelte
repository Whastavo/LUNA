<script lang="ts">
	import type { PageData } from './$types';
	import { t } from 'svelte-i18n';
	import { formatDate } from '$lib/utils/format-date';
	import { SITE_URL } from '$lib/config/site';
	import ProviderIcons from '$lib/components/icons/ProviderIcons.svelte';
	import SiteNav from '$lib/components/marketing/SiteNav.svelte';
	import SiteFooter from '$lib/components/marketing/SiteFooter.svelte';
	import { sectionUrl } from '$lib/config/links';
	import { reveal } from '$lib/utils/reveal';

	let { data }: { data: PageData } = $props();

	let allowVideo = $state(false);
	let videoReady = $state(false);

	$effect(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		allowVideo = !mq.matches;
		const sync = () => (allowVideo = !mq.matches);
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	});

	function pauseOffscreen(node: HTMLVideoElement) {
		if (typeof IntersectionObserver === 'undefined') return;
		const obs = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) node.play().catch(() => {});
				else node.pause();
			},
			{ threshold: 0.1 }
		);
		obs.observe(node);
		return { destroy: () => obs.disconnect() };
	}

	const heroWords = $derived($t('landing.heroHeadline').split(' '));

	const statementWords = $derived([
		...$t('landing.statementPart1').split(' ').map((w) => ({ w, muted: false })),
		...$t('landing.statementPart2').split(' ').map((w) => ({ w, muted: true }))
	]);

	const features = $derived([
		{
			title: $t('landing.feature1Title'),
			body: $t('landing.feature1Body'),
			shot: 'companion',
			alt: $t('landing.feature1Alt')
		},
		{
			title: $t('landing.feature2Title'),
			body: $t('landing.feature2Body'),
			shot: 'ar',
			alt: $t('landing.feature2Alt')
		},
		{
			title: $t('landing.feature3Title'),
			body: $t('landing.feature3Body'),
			shot: 'memory',
			alt: $t('landing.feature3Alt')
		},
		{
			title: $t('landing.feature4Title'),
			body: $t('landing.feature4Body'),
			shot: 'settings',
			alt: $t('landing.feature4Alt')
		}
	]);

	const WM = '/brand-assets/providers';
	const providers: {
		name: string;
		icon: string;
		wm: { light: string; dark: string } | null;
	}[] = [
		{ name: 'OpenAI', icon: 'openai', wm: { light: `${WM}/openai-wordmark-light.svg`, dark: `${WM}/openai-wordmark-dark.svg` } },
		{ name: 'Anthropic', icon: 'anthropic', wm: { light: `${WM}/anthropic-wordmark-light.svg`, dark: `${WM}/anthropic-wordmark-dark.svg` } },
		{ name: 'Google Gemini', icon: 'google', wm: { light: `${WM}/gemini-wordmark-light.svg`, dark: `${WM}/gemini-wordmark-dark.svg` } },
		{ name: 'DeepSeek', icon: 'deepseek', wm: { light: `${WM}/deepseek-wordmark-light.svg`, dark: `${WM}/deepseek-wordmark-dark.svg` } },
		{ name: 'xAI Grok', icon: 'xai', wm: { light: `${WM}/grok-wordmark-light.svg`, dark: `${WM}/grok-wordmark-dark.svg` } },
		{ name: 'Ollama', icon: 'ollama', wm: null },
		{ name: 'LM Studio', icon: 'lmstudio', wm: null },
		{ name: 'Groq Whisper', icon: 'groq', wm: { light: `${WM}/groq-wordmark-light.svg`, dark: `${WM}/groq-wordmark-dark.svg` } },
		{ name: 'ElevenLabs', icon: 'elevenlabs', wm: null }
	];
</script>

<svelte:head>
	<title>{$t('landing.metaTitle')}</title>
	<meta name="description" content={$t('landing.metaDescription')} />
	<link rel="canonical" href={SITE_URL} />
	<link rel="preload" as="image" href="/landing-page/hero-poster.jpg" />
	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={$t('landing.metaTitle')} />
	<meta property="og:description" content={$t('landing.metaDescription')} />
	<meta property="og:image" content={`${SITE_URL}/brand-assets/og-image.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:url" content={SITE_URL} />
	<meta property="og:site_name" content="Luna" />
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={$t('landing.metaTitle')} />
	<meta name="twitter:description" content={$t('landing.metaDescription')} />
	<meta name="twitter:image" content={`${SITE_URL}/brand-assets/og-image.png`} />
	<!-- Structured Data -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Luna',
		description: $t('landing.metaDescription'),
		url: SITE_URL,
		applicationCategory: 'DesktopApplication',
		operatingSystem: 'macOS, Web',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD'
		},
		license: 'https://www.gnu.org/licenses/agpl-3.0.html',
		author: {
			'@type': 'Organization',
			name: 'Ordinary Company Group LLC',
			url: SITE_URL
		}
	})}</script>`}
</svelte:head>

<div class="page-root overflow-x-clip grain">
	<SiteNav />
	<main>
		<!-- Hero: centered text with a contained video below -->
		<section class="hero">
			<div class="hero-copy">
				<span class="hero-fade hero-logo-wrap" style="--wd: 0ms">
					<img src="/brand-assets/logo.svg" alt="Luna" class="hero-logo" />
				</span>
				<h1 class="hero-title text-balance">
					{#each heroWords as word, i}<span class="hero-word" style="--wd: {120 + i * 50}ms"
							>{word}</span
						>{#if i < heroWords.length - 1}{' '}{/if}{/each}
				</h1>
				<p class="hero-fade hero-sub text-pretty" style="--wd: 650ms">
					{$t('landing.heroSubtitle')}
				</p>
				<div class="hero-fade hero-actions" style="--wd: 800ms">
					<a href={sectionUrl('app')} class="btn btn-primary btn-lg">{$t('landing.tryInBrowser')}</a>
					<a href="/download" class="btn btn-secondary btn-lg">{$t('landing.downloadDesktop')}</a>
					<a href={sectionUrl('docs')} class="hero-textlink"
						>{$t('landing.readDocs')} <span class="link-arrow">&rarr;</span></a
					>
				</div>
			</div>

			<div class="hero-media hero-media-enter" aria-hidden="true">
				<img
					class="hero-poster"
					src="/landing-page/hero-poster.jpg"
					alt=""
					width="1920"
					height="996"
				/>
				{#if allowVideo}
					<video
						use:pauseOffscreen
						class="hero-video"
						class:is-ready={videoReady}
						autoplay
						muted
						loop
						playsinline
						preload="auto"
						onplaying={() => (videoReady = true)}
					>
						<source src="/landing-page/hero-loop.webm" type="video/webm" />
						<source src="/landing-page/hero-loop.mp4" type="video/mp4" />
					</video>
				{/if}
			</div>
		</section>

		<!-- Provider strip -->
		<section class="py-20 md:py-28 overflow-hidden">
			<div class="max-w-5xl mx-auto px-6 text-center mb-12 md:mb-14">
				<p use:reveal class="reveal eyebrow justify-center mb-5">{$t('landing.bringOwnBrain')}</p>
				<h2
					use:reveal={60}
					class="reveal text-2xl md:text-3xl font-semibold text-[var(--text-primary)] tracking-tight text-balance"
					style="font-family: var(--font-sans);"
				>
					{$t('landing.providerHeading')}
				</h2>
			</div>

			<div use:reveal={120} class="reveal provider-marquee">
				<div class="provider-marquee-track">
					<div class="provider-marquee-group">
						{#each providers as provider}
							<span class="provider-logo" role="img" aria-label={provider.name} title={provider.name}>
								{#if provider.wm}
									<img class="provider-wordmark wm-light" src={provider.wm.light} alt="" loading="lazy" />
									<img class="provider-wordmark wm-dark" src={provider.wm.dark} alt="" loading="lazy" />
								{:else}
									<ProviderIcons provider={provider.icon} size={30} themed />
								{/if}
							</span>
						{/each}
					</div>
					<div class="provider-marquee-group" aria-hidden="true">
						{#each providers as provider}
							<span class="provider-logo">
								{#if provider.wm}
									<img class="provider-wordmark wm-light" src={provider.wm.light} alt="" loading="lazy" />
									<img class="provider-wordmark wm-dark" src={provider.wm.dark} alt="" loading="lazy" />
								{:else}
									<ProviderIcons provider={provider.icon} size={30} themed />
								{/if}
							</span>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<!-- Features: alternating media rows -->
		<section id="features" class="py-24 md:py-32">
			<div class="max-w-6xl mx-auto px-6">
				<h2
					use:reveal
					class="reveal max-w-2xl text-3xl md:text-4xl lg:text-5xl font-semibold text-[var(--text-primary)] tracking-tight text-balance mb-16 md:mb-24"
					style="font-family: var(--font-sans);"
				>
					{$t('landing.featuresHeading')}
				</h2>
				<div class="flex flex-col gap-24 md:gap-36">
					{#each features as f, i}
						<div use:reveal class="reveal feature-row" class:feature-row--rev={i % 2 === 1}>
							<div class="feature-media">
								<img
									class="feature-img feature-img--light"
									src={`/marketing/${f.shot}-light.webp`}
									alt={f.alt}
									loading="lazy"
								/>
								<img
									class="feature-img feature-img--dark"
									src={`/marketing/${f.shot}-dark.webp`}
									alt={f.alt}
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

		<!-- Latest from the blog -->
		{#if data.posts.length > 0}
			<section class="py-24 md:py-32">
				<div class="max-w-6xl mx-auto px-6">
					<div class="blog-head mb-12 md:mb-14">
						<div>
							<h2
								use:reveal
								class="reveal text-3xl md:text-4xl font-semibold text-[var(--text-primary)] tracking-tight text-balance"
								style="font-family: var(--font-sans);"
							>
								{$t('landing.blogHeading')}
							</h2>
							<p
								use:reveal={60}
								class="reveal text-lg text-[var(--text-secondary)] leading-relaxed text-pretty mt-3"
							>
								{$t('landing.blogSubtitle')}
							</p>
						</div>
						<a use:reveal={120} href="/blog" class="reveal btn btn-secondary shrink-0">
							{$t('landing.viewAllPosts')}
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
					<div class="grid md:grid-cols-3 gap-5 lg:gap-6">
						{#each data.posts as post, i}
							<a use:reveal={(i % 3) * 90} href="/blog/{post.slug}" class="reveal channel-card">
								<div class="channel-media">
									<img src={post.image} alt={post.title} loading="lazy" />
								</div>
								<div class="channel-body">
									<time datetime={post.date} class="channel-date">{formatDate(post.date)}</time>
									<h3 class="channel-title">{post.title}</h3>
									<span class="channel-cta btn btn-on-card btn-block">{$t('landing.readArticle')} →</span>
								</div>
							</a>
						{/each}
					</div>
				</div>
			</section>
		{/if}

		<!-- Closing CTA -->
		<section class="py-28 md:py-44">
			<div class="max-w-3xl mx-auto px-6 text-center">
				<h2
					use:reveal
					class="reveal text-4xl md:text-5xl lg:text-6xl font-semibold text-[var(--text-primary)] tracking-tight text-balance"
					style="font-family: var(--font-sans);"
				>
					{$t('landing.closingHeading')}
				</h2>
				<p
					use:reveal={80}
					class="reveal text-lg text-[var(--text-secondary)] leading-relaxed text-pretty max-w-xl mx-auto mt-5 mb-9"
				>
					{$t('landing.closingSubtitle')}
				</p>
				<div use:reveal={160} class="reveal flex flex-wrap items-center justify-center gap-3">
					<a href={sectionUrl('app')} class="btn btn-primary btn-lg">{$t('landing.tryInBrowser')}</a>
					<a href="/download" class="btn btn-secondary btn-lg">{$t('landing.downloadDesktop')}</a>
				</div>
			</div>
		</section>
	</main>
	<SiteFooter />
</div>

<style>
	/* Hero copy */
	.hero {
		padding: clamp(3rem, 8vw, 6rem) 1.5rem 0;
		max-width: 72rem;
		margin: 0 auto;
		text-align: center;
	}
	.hero-copy {
		max-width: 52rem;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.hero-logo-wrap {
		display: inline-block;
		margin-bottom: 1.25rem;
	}
	.hero-logo {
		height: 2rem;
		width: auto;
		filter: brightness(0);
		opacity: 0.9;
	}
	:global(.dark) .hero-logo {
		filter: none;
	}
	.hero-title {
		margin: 0 0 1.25rem;
		font-size: clamp(2.4rem, 5.5vw, 4.25rem);
		font-weight: 600;
		line-height: 1.08;
		letter-spacing: -0.035em;
		color: var(--text-primary);
	}
	.hero-word,
	.hero-fade {
		opacity: 0;
		filter: blur(10px);
		transform: translateY(6px);
		animation: wordBlurIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) var(--wd, 0ms) forwards;
	}
	.hero-word {
		display: inline-block;
	}
	@keyframes wordBlurIn {
		to {
			opacity: 1;
			filter: blur(0);
			transform: none;
		}
	}
	.hero-sub {
		margin: 0 auto;
		max-width: 40rem;
		color: var(--text-secondary);
		font-size: clamp(1.05rem, 1.6vw, 1.2rem);
		line-height: 1.6;
	}
	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 2rem;
	}
	.hero-textlink {
		margin-left: 0.5rem;
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--text-secondary);
		text-decoration: none;
		transition: color 0.15s ease;
	}
	.hero-textlink:hover {
		color: var(--accent);
	}
	.link-arrow {
		display: inline-block;
		transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.hero-textlink:hover .link-arrow {
		transform: translateX(3px);
	}
	.hero-media {
		position: relative;
		margin: clamp(2.5rem, 6vw, 4.5rem) auto 0;
		border-radius: var(--radius-xl);
		overflow: hidden;
		box-shadow: var(--shadow-xl);
		background: var(--bg-secondary);
		aspect-ratio: 16 / 9;
	}
	.hero-poster {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transform-origin: 50% 40%;
		animation: kenBurns 18s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
	}
	@keyframes kenBurns {
		from {
			transform: scale(1);
		}
		to {
			transform: scale(1.08);
		}
	}
	.hero-media-enter {
		animation: heroMediaIn 1s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
	}
	@keyframes heroMediaIn {
		from {
			opacity: 0;
			transform: translateY(44px) scale(0.965);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	.hero-video {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		opacity: 0;
		transition: opacity 1s ease;
	}
	.hero-video.is-ready {
		opacity: 1;
	}
	.provider-marquee {
		position: relative;
		width: 100%;
		overflow: hidden;
		-webkit-mask-image: linear-gradient(to right, transparent 0, #000 7%, #000 93%, transparent 100%);
		mask-image: linear-gradient(to right, transparent 0, #000 7%, #000 93%, transparent 100%);
	}
	.provider-marquee-track {
		display: flex;
		width: max-content;
		animation: providerMarquee 38s linear infinite;
	}
	.provider-marquee:hover .provider-marquee-track {
		animation-play-state: paused;
	}
	.provider-marquee-group {
		display: flex;
		align-items: center;
		gap: 3rem;
		padding-right: 3rem;
	}
	@keyframes providerMarquee {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(-50%);
		}
	}
	.provider-logo {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		transition: color 0.3s ease, opacity 0.3s ease;
	}
	.provider-logo:hover {
		color: var(--text-primary);
	}
	.provider-wordmark {
		height: 26px;
		width: auto;
		display: block;
	}
	.wm-dark {
		display: none;
	}
	:global(.dark) .wm-light {
		display: none;
	}
	:global(.dark) .wm-dark {
		display: block;
	}
	.feature-row {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
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
		max-width: 26rem;
	}
	.feature-h2 {
		margin: 0 0 1rem;
		font-size: clamp(1.6rem, 2.6vw, 2.1rem);
		font-weight: 600;
		line-height: 1.15;
		letter-spacing: -0.02em;
		color: var(--text-primary);
		text-wrap: balance;
	}
	.feature-body {
		font-size: 1rem;
		line-height: 1.65;
		color: var(--text-secondary);
	}
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
			gap: 4.5rem;
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
		.feature-row.reveal {
			transform: translate(36px, 20px);
		}
		.feature-row--rev.reveal {
			transform: translate(-36px, 20px);
		}
	}
	.statement {
		padding: clamp(5rem, 13vw, 10rem) 0;
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
	.st-word {
		display: inline-block;
		opacity: 0;
		filter: blur(10px);
		transform: translateY(6px);
	}
	.statement-text:global(.revealed) .st-word {
		animation: wordBlurIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) var(--wd, 0ms) forwards;
	}
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
	.reveal:global(.revealed) {
		opacity: 1;
		transform: none;
		filter: blur(0);
	}
	.blog-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
	}
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
		background: var(--gradient-aurora-cool);
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
		padding: 1.25rem;
	}
	.channel-date {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--text-tertiary);
	}
	.channel-title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
		line-height: 1.3;
		color: var(--text-primary);
		text-wrap: balance;
	}
	.channel-cta {
		margin-top: auto;
	}
	@media (prefers-reduced-motion: reduce) {
		.reveal {
			opacity: 1;
			transform: none;
			filter: none;
			transition: none;
		}
		.hero-video {
			transition: none;
		}
		.hero-poster {
			animation: none;
		}
		.hero-word,
		.hero-fade,
		.st-word {
			opacity: 1;
			filter: none;
			transform: none;
			animation: none;
		}
		.hero-media-enter {
			animation: none;
		}
		.provider-marquee-track,
		.feature-media {
			animation: none;
		}
		.channel-card:hover,
		.feature-media,
		.channel-media img {
			transform: none;
		}
	}
</style>
