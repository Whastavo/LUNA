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
		title: 'Visión General',
		icon: 'book',
		items: [{ title: 'Introducción', slug: 'overview/introduction' }]
	},
	{
		title: 'Guías',
		icon: 'compass',
		items: [
			{ title: 'Guía Web', slug: 'guides/web-guide' },
			{ title: 'Guía de Escritorio', slug: 'guides/desktop-guide' },
			{ title: 'Configuración LLM Local', slug: 'guides/local-llm-setup' },
			{ title: 'Configuración TTS Local', slug: 'guides/local-tts-setup' },
			{ title: 'Configuración STT Local', slug: 'guides/local-stt-setup' },
			{ title: 'Solución de Problemas', slug: 'guides/troubleshooting' }
		]
	},
	{
		title: 'Tecnología',
		icon: 'code',
		items: [
			{ title: 'Visión General de la Arquitectura', slug: 'technology/architecture' },
			{ title: 'Sistema de Compañera', slug: 'technology/companion-system' },
			{ title: 'Grafo de Memoria', slug: 'technology/memory-graph' }
		]
	},
	{
		title: 'Comunidad',
		icon: 'users',
		items: [
			{ title: 'Recursos', slug: 'community/resources' },
			{ title: 'Contribución', slug: 'community/contributing' }
		]
	}
];
