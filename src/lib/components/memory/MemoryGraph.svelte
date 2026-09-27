<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { FactCategory } from '$lib/types/memory';
	import {
		getFactsWithEmbeddings,
		buildGraph,
		filterGraph,
		getConnectedNodes,
		categoryColors,
		type GraphData,
		type GraphNode,
		type GraphFilters
	} from '$lib/services/memory-graph';

	let container: HTMLDivElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let graph: any = null;

	// Fecha en UTC y en español (meses abreviados)
	const MONTHS_UTC = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;
	function formatMemoryDate(value: string | number | Date): string {
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return String(value);
		return `${d.getUTCDate()} ${MONTHS_UTC[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
	}
	let {
		selectedId = $bindable(null),
		categories = $bindable<FactCategory[]>(['user', 'relationship', 'shared_experience']),
		onInspect,
		onOpenFacts,
		expanded = false
	}: {
		/** Id del nodo seleccionado, bindable (0.15.0): el padre puede abrir el detalle. */
		selectedId?: number | null;
		/** Categorías visibles, bindable (0.15.0): compartidas entre grafo embebido y expandido. */
		categories?: FactCategory[];
		/** Abrir este recuerdo en la lista de Recuerdos (0.15.0). */
		onInspect?: (id: number) => void;
		/** Ir a la lista de recuerdos desde el estado vacío. */
		onOpenFacts?: () => void;
		/** Modo expandido (0.15.0): el contenedor crece a pantalla completa. */
		expanded?: boolean;
	} = $props();
	let graphData = $state<GraphData>({ nodes: [], links: [] });
	let fullGraphData = $state<GraphData>({ nodes: [], links: [] });
	let loading = $state(true);
	let error = $state<string | null>(null);
	let noMemories = $state(false);
	let selectedNode = $state<GraphNode | null>(null);
	let hoveredNode = $state<GraphNode | null>(null);
	let isDarkMode = $state(true);
	let loadRetry = $state(0);

	// Filter state (0.15.0): las categorías viven en el padre (bindable) para que
	// el grafo embebido y el expandido compartan el mismo estado.
	const showUser = $derived(categories.includes('user'));
	const showRelationship = $derived(categories.includes('relationship'));
	const showSharedExperience = $derived(categories.includes('shared_experience'));
	function toggleCategory(category: FactCategory) {
		categories = categories.includes(category)
			? categories.filter((value) => value !== category)
			: [...categories, category];
	}
	const similarityThreshold = 0.5; // Fixed threshold

	// Detect dark mode
	function checkDarkMode() {
		if (browser) {
			isDarkMode = document.documentElement.classList.contains('dark');
		}
	}

	// Build filters from current toggle states (not derived to avoid object identity issues)
	function buildFilters(): GraphFilters {
		return {
			categories: new Set<FactCategory>(
				[
					showUser && 'user',
					showRelationship && 'relationship',
					showSharedExperience && 'shared_experience'
				].filter(Boolean) as FactCategory[]
			),
			minSimilarity: similarityThreshold
		};
	}

	// Update graph when filter toggles change
	$effect(() => {
		// Track the individual toggle values (not a derived object)
		const _u = showUser;
		const _r = showRelationship;
		const _s = showSharedExperience;

		// Only run if we have data
		if (fullGraphData.nodes.length === 0) return;

		// Build filters and update graph
		const filters = buildFilters();
		const newGraphData = filterGraph(fullGraphData, filters);
		graphData = newGraphData;

		// Update the force-graph visualization (use queueMicrotask to avoid blocking)
		queueMicrotask(() => {
			updateGraphData();
		});
	});

	// Update graph data (triggers physics recalculation)
	function updateGraphData() {
		if (!graph) return;

		graph.graphData({
			nodes: graphData.nodes.map((node) => ({ ...node })),
			links: graphData.links.map((link) => ({ ...link }))
		});

		applyStyles();
	}

	// Apply visual styles without resetting physics
	function applyStyles() {
		if (!graph) return;

		checkDarkMode();

		const connectedToSelected = selectedNode
			? getConnectedNodes(graphData, selectedNode.id)
			: null;

		// Colors that work in both modes
		const baseLinkColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';
		const highlightLinkColor = isDarkMode ? 'rgba(1, 178, 255, 0.8)' : 'rgba(0, 153, 221, 0.8)';
		const dimmedLinkColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
		const dimmedNodeColor = isDarkMode ? '#333' : '#ddd';

		graph
			.nodeColor((node: GraphNode) => {
				if (selectedNode) {
					if (node.id === selectedNode.id) return categoryColors[node.category];
					if (connectedToSelected?.has(node.id)) return categoryColors[node.category];
					return dimmedNodeColor;
				}
				return categoryColors[node.category];
			})
			.linkColor((link: { source: GraphNode | number; target: GraphNode | number }) => {
				if (!selectedNode) return baseLinkColor;

				// Check if this link connects to the selected node
				const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
				const targetId = typeof link.target === 'object' ? link.target.id : link.target;

				if (sourceId === selectedNode.id || targetId === selectedNode.id) {
					return highlightLinkColor;
				}
				return dimmedLinkColor;
			})
			.linkWidth((link: { source: GraphNode | number; target: GraphNode | number }) => {
				if (!selectedNode) return 1;

				const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
				const targetId = typeof link.target === 'object' ? link.target.id : link.target;

				if (sourceId === selectedNode.id || targetId === selectedNode.id) {
					return 2;
				}
				return 0.5;
			})
			.linkDirectionalParticleColor(() => isDarkMode ? '#00b2ff' : '#0099dd');
	}

	function handleNodeClick(node: GraphNode) {
		if (selectedNode?.id === node.id) {
			selectedNode = null;
			selectedId = null;
		} else {
			selectedNode = node;
		}
		applyStyles();
	}

	function handleBackgroundClick() {
		selectedNode = null;
		selectedId = null;
		applyStyles();
	}

	function resetView() {
		if (graph) {
			fitOrCenter();
			selectedNode = null;
			selectedId = null;
			applyStyles();
		}
	}

	/** Auto-encuadre (0.15.0): con conexiones llena el contenedor; con
	 *  recuerdos sueltos (sin links) el zoom de un nodo único lo vuelve
	 *  gigante — queda a zoom neutro y centrado. */
	function fitOrCenter() {
		if (!graph) return;
		if (graphData.links.length > 0) {
			graph.zoomToFit(400, 50);
		} else {
			graph.zoom(1, 0);
			graph.centerAt(0, 0, 0);
		}
	}

	async function initGraph() {
		if (!browser) return;

		try {
			loading = true;
			error = null;
			noMemories = false;

			// Load facts
			const facts = await getFactsWithEmbeddings();

			// Sin recuerdos aún: estado amigable (0.15.0 "No connected memories
			// yet"), no un error — la lista de Recuerdos sigue siendo el camino.
			if (facts.length === 0) {
				noMemories = true;
				loading = false;
				return;
			}

			// Build graph
			fullGraphData = buildGraph(facts, 0); // Build with threshold 0, filter later
			graphData = filterGraph(fullGraphData, buildFilters());

			// Initialize force-graph
			const ForceGraph = (await import('force-graph')).default;

			// Component may have been destroyed while we awaited facts/module load;
			// constructing the graph now would leave its rAF loop running forever
			if (destroyed) return;

			checkDarkMode();

			graph = new ForceGraph(container)
				.backgroundColor('transparent')
				// Nodo legible: relSize 3 hace una burbuja visible a zoom neutro
				.nodeRelSize(3)
				.nodeVal(1)
				.nodeId('id')
				.linkSource('source')
				.linkTarget('target')
				// Animated particles flowing along links
				.linkDirectionalParticles(2)
				.linkDirectionalParticleSpeed(0.005)
				.linkDirectionalParticleWidth(1.5)
				// Dynamic physics like the example
				.d3AlphaDecay(0.02)
				.d3VelocityDecay(0.3)
				.warmupTicks(0)
				.cooldownTicks(Infinity)
				// Interactions
				.onNodeClick((node) => handleNodeClick(node as GraphNode))
				.onNodeHover((node) => {
					hoveredNode = node as GraphNode | null;
					container.style.cursor = node ? 'pointer' : 'grab';
				})
				.onBackgroundClick(() => handleBackgroundClick());

			updateGraphData();

			// Fit to view after a short delay
			setTimeout(() => {
				fitOrCenter();
			}, 500);

			loading = false;
		} catch (e) {
			console.error('Failed to initialize memory graph:', e);
			error = 'No se pudo cargar el grafo de memoria';
			loading = false;
		}
	}

	let destroyed = false;

	onMount(() => {
		void initGraph();
	});

	// Reintentar (0.15.0): el error ofrece recargar sin recargar la app
	$effect(() => {
		if (loadRetry > 0) void initGraph();
	});

	// Sincroniza la selección externa (0.15.0): el padre puede preseleccionar
	$effect(() => {
		const id = selectedId;
		if (id === null || id === undefined) return;
		const node = graphData.nodes.find((n) => n.id === id);
		if (node && selectedNode?.id !== id) selectedNode = node;
	});

	onDestroy(() => {
		destroyed = true;
		if (graph) {
			graph._destructor?.();
		}
	});

	// Handle resize (0.15.0): ResizeObserver sobre el contenedor — el grid
	// cambia al abrir el panel de detalles y window.resize no se dispara
	$effect(() => {
		if (!browser) return;

		const handleResize = () => {
			if (graph && container) {
				graph.width(container.clientWidth).height(container.clientHeight);
			}
		};

		const ro = new ResizeObserver(handleResize);
		ro.observe(container);
		window.addEventListener('resize', handleResize);
		return () => {
			ro.disconnect();
			window.removeEventListener('resize', handleResize);
		};
	});

	// Watch for theme changes
	$effect(() => {
		if (!browser) return;

		const observer = new MutationObserver(() => {
			const wasDark = isDarkMode;
			checkDarkMode();
			if (wasDark !== isDarkMode && graph) {
				applyStyles();
			}
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		return () => observer.disconnect();
	});
</script>

<div class="memory-graph" class:expanded>
	<!-- Controls (0.15.0): toggles en fila + reset a la derecha, en flujo -->
	<div class="controls">
		<div class="category-toggles" role="group" aria-label="Categorías del grafo">
				<label class="category-toggle" style="--cat-color: {categoryColors.user}">
					<input type="checkbox" checked={showUser} onchange={() => toggleCategory('user')} />
					<span class="toggle-dot"></span>
					<span>Usuario</span>
				</label>
				<label class="category-toggle" style="--cat-color: {categoryColors.relationship}">
					<input type="checkbox" checked={showRelationship} onchange={() => toggleCategory('relationship')} />
					<span class="toggle-dot"></span>
					<span>Relación</span>
				</label>
				<label class="category-toggle" style="--cat-color: {categoryColors.shared_experience}">
					<input type="checkbox" checked={showSharedExperience} onchange={() => toggleCategory('shared_experience')} />
					<span class="toggle-dot"></span>
					<span>Compartido</span>
				</label>		</div>

		<button class="reset-btn" onclick={resetView} disabled={loading || !graphData.nodes.length}>Restablecer vista</button>
	</div>

	<!-- Inspeccionar un recuerdo (0.15.0): selector accesible por teclado -->
	<label class="memory-picker">
		<span>Inspeccionar un recuerdo</span>
		<select
			value={selectedNode?.id ?? ''}
			onchange={(event) => {
				const id = event.currentTarget.value ? Number(event.currentTarget.value) : null;
				selectedId = id;
				selectedNode = id === null ? null : (graphData.nodes.find((n) => n.id === id) ?? null);
				applyStyles();
			}}
			disabled={!graphData.nodes.length}
		>
			<option value="">Elige un recuerdo</option>
			{#each graphData.nodes as node (node.id)}
				<option value={node.id}>{node.content.length > 90 ? `${node.content.slice(0, 90)}…` : node.content}</option>
			{/each}
		</select>
	</label>

	<!-- Graph layout (0.15.0): canvas + panel lateral de detalles en grid -->
	<div class="graph-layout" class:has-selection={!!selectedNode}>
		<div class="graph-container" bind:this={container}>
		{#if loading}
			<div class="loading">
				<div class="spinner"></div>
				<span>Cargando recuerdos...</span>
			</div>
		{/if}

		{#if error}
			<div class="error-message">
				<p>El grafo no se pudo cargar. Tus recuerdos siguen intactos en Recuerdos.</p>
				<button class="reset-btn" type="button" onclick={() => loadRetry++}>Reintentar</button>
			</div>
		{/if}

		{#if noMemories && !loading && !error}
			<!-- Estado vacío amigable (0.15.0 "No connected memories yet") -->
			<div class="empty-state">
				<h3>Todavía no hay recuerdos conectados</h3>
				<p>
					El grafo muestra los recuerdos cuando sus conexiones estén listas. Igual puedes leer y
					administrar todos los recuerdos guardados en Recuerdos.
				</p>
				{#if onOpenFacts}<button class="reset-btn" type="button" onclick={onOpenFacts}>Ver recuerdos</button>{/if}
			</div>
		{/if}

		{#if !loading && !error && graphData.nodes.length === 0 && fullGraphData.nodes.length > 0}
			<div class="filtered-empty">
				<p>Ningún recuerdo coincide con estas categorías.</p>
				<button
					class="reset-btn"
					type="button"
					onclick={() => (categories = ['user', 'relationship', 'shared_experience'])}
				>
					Mostrar todas
				</button>
			</div>
		{/if}
		</div>

		<!-- Panel lateral de detalles (0.15.0 selected-detail) -->
		{#if selectedNode}
			<aside class="selected-detail" aria-label="Detalles del recuerdo">
				<div class="detail-header">
					<span class="detail-category" style="background: {categoryColors[selectedNode.category]}">
						{selectedNode.category.replace('_', ' ')}
					</span>
					<button class="close-btn" onclick={() => { selectedNode = null; selectedId = null; }} aria-label="Cerrar detalles">×</button>
				</div>
				<div class="detail-content">{selectedNode.content}</div>
				<dl class="detail-meta">
					<dt>Importancia</dt>
					<dd>{selectedNode.importance}</dd>
					{#if selectedNode.confidence !== undefined}<dt>Confianza</dt>
						<dd>{Math.round(selectedNode.confidence * 100)}%</dd>{/if}
					<dt>Referenciado</dt>
					<dd>{selectedNode.referenceCount}×</dd>
					<dt>Creado</dt>
					<dd>{formatMemoryDate(selectedNode.createdAt)}</dd>
				</dl>
				{#if onInspect && selectedNode.id !== undefined}
					<button class="open-in-facts" type="button" onclick={() => onInspect(selectedNode!.id!)}>
						Abrir en Recuerdos →
					</button>
				{/if}
			</aside>
		{/if}
	</div>

	<!-- Tooltip -->
	{#if hoveredNode}
		<div class="tooltip glass-panel">
			<div class="tooltip-category" style="color: {categoryColors[hoveredNode.category]}">
				{hoveredNode.category.replace('_', ' ')}
			</div>
			<div class="tooltip-content">{hoveredNode.content}</div>
			<div class="tooltip-meta">
				Importancia: {hoveredNode.importance} · Referenciado: {hoveredNode.referenceCount}x
			</div>
		</div>
	{/if}

	<!-- Stats -->
	<div class="stats">
		{graphData.nodes.length} recuerdos · {graphData.links.length} conexiones
	</div>
</div>

<style>
	.memory-graph {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		width: 100%;
		min-height: 0;
		/* Transparente: el vidrio del modal se ve a través — nunca una losa
		   opaca (el --bg-page dentro del glass resuelve a negro/bruto) */
		background: transparent;
	}

	.memory-graph.expanded {
		flex: 1;
		min-height: 0;
		height: auto;
	}

	/* Controles en flujo (0.15.0): toggles en fila, reset a la derecha */
	.controls {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem;
		z-index: 10;
	}

	.category-toggles {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.category-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.4375rem;
		padding: 0.3125rem 0.75rem;
		border-radius: 999px;
		background: var(--accent-subtle);
		font-size: 0.75rem;
		font-weight: 540;
		color: var(--text-secondary);
		cursor: pointer;
		transition: background 0.14s ease, color 0.14s ease;
	}

	.category-toggle:hover {
		color: var(--text-primary);
	}

	.category-toggle input {
		display: none;
	}

	.toggle-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--cat-color);
		opacity: 0.25;
		transition: opacity 0.15s;
	}

	.category-toggle input:checked + .toggle-dot {
		opacity: 1;
	}

	.category-toggle:has(input:checked) {
		color: var(--text-primary);
	}

	.reset-btn {
		padding: 0.5rem 0.75rem;
		background: var(--chrome-wash);
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		font-size: 0.8125rem;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}

	.reset-btn:hover {
		background: color-mix(in srgb, var(--bg-tertiary), var(--text-primary) 8%);
		color: var(--text-primary);
	}

	.reset-btn:active {
		background: color-mix(in srgb, var(--bg-tertiary), var(--text-primary) 8%);
	}

	/* Selector de inspección (0.15.0): su propia fila bajo los toggles */
	.memory-picker {
		z-index: 6;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.7188rem;
		color: var(--text-secondary);
	}

	.memory-picker select {
		padding: 0.4375rem 0.5625rem;
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		font: inherit;
		font-size: 0.7813rem;
		outline: none;
	}

	/* Abrir en Recuerdos (0.15.0) */
	.open-in-facts {
		margin-top: 0.5rem;
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--border-subtle);
		border-radius: 999px;
		background: transparent;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 540;
		color: var(--text-primary);
		cursor: pointer;
		transition: background 0.14s ease, border-color 0.14s ease;
	}

	.open-in-facts:hover {
		background: var(--accent-subtle);
	}

	/* Layout del grafo (0.15.0): canvas + detalle lateral en grid */
	.graph-layout {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 0.75rem;
	}

	.graph-layout.has-selection {
		grid-template-columns: minmax(0, 1fr) 280px;
	}

	.graph-container {
		position: relative;
		min-height: 0;
		height: clamp(300px, 55dvh, 620px);
		/* Superficie sutil LITERAL: los tokens (--bg-secondary) dentro del
		   glass del modal se remapean a lavados enormes — esto es el mismo
		   wash sutil que los inputs, en ambos modos */
		background: color-mix(in srgb, var(--text-primary) 4.5%, transparent);
		border: 1px solid color-mix(in srgb, var(--text-primary) 11%, transparent);
		border-radius: 14px;
		overflow: hidden;
	}

	.memory-graph.expanded .graph-container {
		height: auto;
		flex: 1;
		min-height: 320px;
		/* Sobre vidrio propio del modal expandido: lavado algo más alto
		   para que el canvas se sienta superficie, no un hoyo */
		background: color-mix(in srgb, var(--text-primary) 7%, transparent);
	}

	.selected-detail {
		padding: 1rem;
		min-width: 0;
		align-self: start;
		border: 1px solid var(--border-subtle);
		border-radius: 14px;
		background: var(--bg-secondary);
		font-size: 0.8125rem;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.detail-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.detail-category {
		display: inline-flex;
		padding: 0.1875rem 0.5625rem;
		border-radius: 999px;
		font-size: 0.6875rem;
		font-weight: 600;
		color: #fff;
	}

	.detail-header .close-btn {
		border: none;
		background: transparent;
		color: var(--text-tertiary);
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
		padding: 0.125rem 0.375rem;
		border-radius: 6px;
	}

	.detail-header .close-btn:hover {
		color: var(--text-primary);
		background: var(--accent-subtle);
	}

	.detail-content {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		line-height: 1.45;
		color: var(--text-primary);
	}

	.detail-meta {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.375rem 0.75rem;
		margin: 0;
		font-size: 0.75rem;
	}

	.detail-meta dt {
		color: var(--text-tertiary);
	}

	.detail-meta dd {
		margin: 0;
		color: var(--text-primary);
		overflow-wrap: anywhere;
	}

	@media (max-width: 1100px) {
		.graph-layout.has-selection {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.filtered-empty,
	.empty-state {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1.5rem;
		color: var(--text-secondary);
		font-size: 0.8125rem;
		text-align: center;
		pointer-events: auto;
	}

	.empty-state h3 {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.empty-state p {
		margin: 0;
		max-width: 380px;
		line-height: 1.5;
	}

	.filtered-empty p {
		margin: 0;
	}

	.loading,
	.error-message {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		color: var(--text-secondary);
	}

	.error-message p {
		margin: 0;
		max-width: 320px;
		text-align: center;
		line-height: 1.5;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--border-light);
		border-top-color: #00b2ff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.tooltip {
		position: fixed;
		bottom: 5rem;
		left: 50%;
		transform: translateX(-50%);
		border-radius: var(--radius-lg);
		padding: 0.75rem 1rem;
		max-width: 400px;
		z-index: 20;
		pointer-events: none;
		box-shadow: var(--shadow-lg);
	}

	.tooltip-category {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.25rem;
	}

	.tooltip-content {
		font-size: 0.875rem;
		color: var(--text-primary);
		line-height: 1.4;
		margin-bottom: 0.5rem;
	}

	.tooltip-meta {
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	/* Stats como línea simple (0.15.0): sin caja flotante */
	.stats {
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}
</style>
