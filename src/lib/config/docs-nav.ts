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
		title: 'Overview',
		icon: 'book',
		items: [{ title: 'Introduction', slug: 'overview/introduction' }]
	},
	{
		title: 'Guides',
		icon: 'compass',
		items: [
			{ title: 'Guía Web', slug: 'guides/web-guide' },
			{ title: 'Guía de Escritorio', slug: 'guides/desktop-guide' },
			{ title: 'Configuración de LLM Local', slug: 'guides/local-llm-setup' },
			{ title: 'Configuración de TTS Local', slug: 'guides/local-tts-setup' },
			{ title: 'Configuración de STT Local', slug: 'guides/local-stt-setup' },
			{ title: 'Troubleshooting', slug: 'guides/troubleshooting' }
		]
	},
	{
		title: 'Technology',
		icon: 'code',
		items: [
			{ title: 'Descripción general de arquitectura', slug: 'technology/architecture' },
			{ title: 'Sistema de Compañera', slug: 'technology/companion-system' },
			{ title: 'Gráfico de Memoria', slug: 'technology/memory-graph' }
		]
	},
	{
		title: 'Community',
		icon: 'users',
		items: [
			{ title: 'Resources', slug: 'community/resources' },
			{ title: 'Contributing', slug: 'community/contributing' }
		]
	}
];
