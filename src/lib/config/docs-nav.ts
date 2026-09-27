export interface DocsNavItem {
	title: string;
	slug: string;
}

export interface DocsNavSection {
	title: string;
	icon: string;
	items: DocsNavItem[];
}

export const docsNav: DocsNavSection[] = [
	{
		title: 'Visión general',
		icon: 'book',
		items: [{ title: 'Introducción', slug: 'overview/introduction' }]
	},
	{
		title: 'Guías',
		icon: 'compass',
		items: [
			{ title: 'Guía web', slug: 'guides/web-guide' },
			{ title: 'Guía de escritorio', slug: 'guides/desktop-guide' },
			{ title: 'Configurar LLM local', slug: 'guides/local-llm-setup' },
			{ title: 'Configurar TTS local', slug: 'guides/local-tts-setup' },
			{ title: 'Configurar OmniVoice', slug: 'guides/omnivoice' },
			{ title: 'Configurar STT local', slug: 'guides/local-stt-setup' },
			{ title: 'Solución de problemas', slug: 'guides/troubleshooting' }
		]
	},
	{
		title: 'Tecnología',
		icon: 'code',
		items: [
			{ title: 'Visión de la arquitectura', slug: 'technology/architecture' },
			{ title: 'Sistema de compañera', slug: 'technology/companion-system' },
			{ title: 'Grafo de memoria', slug: 'technology/memory-graph' }
		]
	},
	{
		title: 'Comunidad',
		icon: 'users',
		items: [{ title: 'Recursos', slug: 'community/resources' }]
	}
];
