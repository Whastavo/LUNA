<script lang="ts">
	import { getFacts, deleteFact, getSessions, getConversationTurns } from '$lib/services/storage/memory';
	import { memoryApi, getWorkingMemory } from '$lib/engine/memory';
	import { characterStore } from '$lib/stores/character.svelte';
	import { settingsModal } from '$lib/stores/settings-modal.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import MemoryGraph from '$lib/components/memory/MemoryGraph.svelte';
	import MemoryGraphModal from '$lib/components/memory/MemoryGraphModal.svelte';
	import { parseResponse, extractPotentialFacts } from '$lib/ai/response-parser';
	import type { Fact, FactCategory, SessionSummary, ConversationTurn } from '$lib/types/memory';
	import '../modal-kit.css';

	/**
	 * Memory workspace (funcionalidad 0.15.0 intacta) con piel nueva:
	 * tipografía jerárquica, hairlines, filas limpias y estados vacíos
	 * centrados — sin cajas sobre cajas.
	 */
	type Pane = 'graph' | 'facts' | 'sessions' | 'settings';
	let pane = $state<Pane>('graph');

	// ── Datos compartidos ──────────────────────────────────────────────────
	let graphSelectedId = $state<number | null>(null);
	let graphCategories = $state<FactCategory[]>(['user', 'relationship', 'shared_experience']);
	let graphExpanded = $state(false);
	const PAGE_SIZE = 25;
	let facts = $state<Fact[]>([]);
	let totalFacts = $state(0);
	let sessions = $state<SessionSummary[]>([]);
	let totalSessions = $state(0);
	let turns = $state<ConversationTurn[]>([]);
	let totalTurns = $state(0);
	let loading = $state(true);
	let loadError = $state(false);
	let retry = $state(0);
	let forgetting = $state<number | null>(null);
	let confirmId = $state<number | undefined>(undefined);
	let page = $state(0);
	let sessionPage = $state(0);
	let turnPage = $state(0);

	// ── Foco desde el grafo (0.15.0 factId) ───────────────────────────────
	let factId = $state<number | undefined>(undefined);

	// ── Filtros de recuerdos ───────────────────────────────────────────────
	let query = $state('');
	let category = $state<'all' | FactCategory>('all');

	// ── Composer avanzado (0.15.0): categoría + importancia ───────────────
	let draft = $state('');
	let draftCategory = $state<FactCategory>('user');
	let draftImportance = $state(50);
	let saving = $state(false);
	let notice = $state('');

	// ── Sesiones: actual vs guardadas ─────────────────────────────────────
	let sessionPane = $state<'current' | 'saved'>('current');

	// ── Ajustes → avanzado: Estado vs Parser test ─────────────────────────
	let advancedOpen = $state(false);
	let advancedPane = $state<'state' | 'parser'>('state');

	// ── Parser test (0.15.0): mensajes + muestras ─────────────────────────
	let testMessage = $state('Disfruto salir a caminar.');
	const FIRST_SAMPLE =
		'¡Qué bien suena!\n```json\n{"mood_change":{"emotion":"happy","intensity_delta":5},"new_memory":"Al usuario le gusta caminar."}\n```';
	let testResponse = $state(FIRST_SAMPLE);
	let testResult = $state('');
	const parserSamples = [
		{ label: 'Memoria y ánimo', text: FIRST_SAMPLE },
		{ label: 'Diálogo simple', text: 'Cuéntame más sobre tu día.' },
		{ label: 'Estado malformado', text: '¡Hola!\n```json\n{"mood_change":\n```' }
	];

	function runParserTest() {
		try {
			const parsed = parseResponse(testResponse, characterStore.name);
			testResult = JSON.stringify(
				{ ...parsed, potentialFacts: extractPotentialFacts(parsed.dialogue, testMessage) },
				null,
				2
			);
		} catch {
			testResult = 'Esta respuesta de muestra no se pudo interpretar.';
		}
	}

	$effect(() => {
		void pane;
		void query;
		void category;
		void factId;
		void retry;
		page = 0;
		sessionPage = 0;
		turnPage = 0;
		confirmId = undefined;
	});

	$effect(() => {
		void refresh();
	});

	async function refresh() {
		loading = true;
		loadError = false;
		try {
			const search = query.trim();
			const all = await getFacts({
				...(factId !== undefined ? {} : category !== 'all' ? { category } : {}),
				...(factId !== undefined ? {} : search ? { keywords: [search] } : {})
			});
			const focused = factId !== undefined ? all.filter((f) => f.id === factId) : all;
			totalFacts = focused.length;
			facts = focused.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

			// Sesiones y turnos completos: se paginan en cliente (0.15.0)
			const [allSessions, turns0] = await Promise.all([getSessions(), loadCurrentTurns()]);
			totalSessions = allSessions.length;
			sessions = allSessions.slice(sessionPage * PAGE_SIZE, (sessionPage + 1) * PAGE_SIZE);

			totalTurns = turns0.length;
			turns = turns0.slice(turnPage * PAGE_SIZE, (turnPage + 1) * PAGE_SIZE);
		} catch {
			loadError = true;
		} finally {
			loading = false;
		}
	}

	/** 0.15.0: la sesión activa, o la última guardada tras recargar. */
	async function loadCurrentTurns(): Promise<ConversationTurn[]> {
		let activeId = getWorkingMemory().currentSessionId;
		if (activeId === undefined) {
			const all = await getSessions();
			activeId = all[0]?.id;
		}
		if (activeId === undefined) return [];
		return getConversationTurns({ sessionId: activeId });
	}

	async function addMemory() {
		const text = draft.trim();
		if (!text || saving || text.length > 2000) return;
		saving = true;
		notice = '';
		try {
			await memoryApi.createFact({
				content: text,
				category: draftCategory,
				importance: draftImportance,
				confidence: 1,
				source: 'manual'
			});
			draft = '';
			factId = undefined;
			notice = 'Recuerdo guardado.';
			page = 0;
			await refresh();
		} catch {
			notice = 'No se pudo guardar. Tu texto sigue aquí para reintentar.';
		} finally {
			saving = false;
			setTimeout(() => (notice = ''), 4000);
		}
	}

	async function forget(id: number) {
		forgetting = id;
		await deleteFact(id);
		facts = facts.filter((f) => f.id !== id);
		totalFacts = Math.max(0, totalFacts - 1);
		forgetting = null;
		confirmId = undefined;
		notice = 'Recuerdo olvidado.';
		setTimeout(() => (notice = ''), 4000);
	}

	/** Abrir un hecho concreto desde el grafo (0.15.0 onInspect). */
	function inspectFact(id: number) {
		graphExpanded = false;
		query = '';
		category = 'all';
		factId = id;
		pane = 'facts';
	}

	function showAllFacts() {
		factId = undefined;
		page = 0;
	}

	const categoryLabel: Record<Fact['category'], string> = {
		user: 'Sobre ti',
		relationship: 'De ustedes',
		shared_experience: 'Vivido juntos'
	};

	const panes: { value: Pane; label: string; icon: string }[] = [
		{ value: 'graph', label: 'Grafo', icon: 'brain' },
		{ value: 'facts', label: 'Recuerdos', icon: 'layers' },
		{ value: 'sessions', label: 'Sesiones', icon: 'clock' },
		{ value: 'settings', label: 'Ajustes', icon: 'settings' }
	];

	function when(date: Date): string {
		const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
		if (days <= 0) return 'hoy';
		if (days === 1) return 'ayer';
		if (days < 7) return `hace ${days} días`;
		if (days < 30) return `hace ${Math.floor(days / 7)} sem`;
		return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
	}

	function fullDate(date: Date | undefined): string {
		return date ? new Date(date).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
	}

	const charState = $derived(characterStore.state);
	const modeLabel = $derived(charState.appMode === 'companion' ? 'Compañera' : 'Modo historia');
</script>

<div class="set-view">
	<header class="set-header">
		<h2>Memoria</h2>
		<p>Explora lo que Luna recuerda y mantenlo preciso.</p>
	</header>

	<!-- Navegación (0.15.0): pestañas del sistema, con ícono -->
	<div class="panes" role="tablist" aria-label="Vistas de memoria">
		{#each panes as p (p.value)}
			<button
				class="pane-btn"
				class:active={pane === p.value}
				type="button"
				role="tab"
				aria-selected={pane === p.value}
				onclick={() => (pane = p.value)}
			>
				<Icon name={p.icon} size={13} />
				<span>{p.label}</span>
			</button>
		{/each}
	</div>

	{#if notice}<p class="notice" role="status">{notice}</p>{/if}

	{#if pane === 'graph'}
		<!-- Grafo embebido (0.15.0) + Expandir -->
		<div class="graph-heading">
			<p class="hint">Las conexiones muestran similitudes entre recuerdos. Toca un nodo para ver sus detalles.</p>
			<button class="ghost-btn" type="button" onclick={() => (graphExpanded = true)}>
				<Icon name="external-link" size={13} />
				Expandir grafo
			</button>
		</div>
		{#if !graphExpanded}
			<div class="graph-host">
				<MemoryGraph
					bind:selectedId={graphSelectedId}
					bind:categories={graphCategories}
					onInspect={inspectFact}
					onOpenFacts={showAllFacts}
				/>
			</div>
		{/if}
		{#if graphExpanded}
			<MemoryGraphModal
				onClose={() => (graphExpanded = false)}
				bind:selectedId={graphSelectedId}
				bind:categories={graphCategories}
				onInspect={inspectFact}
				onOpenFacts={() => {
					graphExpanded = false;
					showAllFacts();
					pane = 'facts';
				}}
			/>
		{/if}
	{:else if pane === 'facts'}
		{#if factId !== undefined}
			<div class="focus-notice">
				<Icon name="brain" size={13} />
				<span>Elegido desde el grafo</span>
				<button class="ghost-btn" type="button" onclick={showAllFacts}>Mostrar todo</button>
			</div>
		{/if}

		<section class="block">
			<h3>Recuerdos guardados</h3>
			<p class="hint">Guardados en este dispositivo. Añadir o borrar un recuerdo afecta las conversaciones futuras.</p>
			<div class="filters">
				<label class="field-label">
					<span>Buscar recuerdos</span>
					<label class="field">
						<Icon name="search" size={13} />
						<input type="search" placeholder="Encuentra un recuerdo" bind:value={query} oninput={() => void refresh()} />
					</label>
				</label>
				<label class="field-label">
					<span>Categoría</span>
					<select class="select" bind:value={category} onchange={() => void refresh()} aria-label="Categoría">
						<option value="all">Todas las categorías</option>
						<option value="user">Sobre ti</option>
						<option value="relationship">De ustedes</option>
						<option value="shared_experience">Vivido juntos</option>
					</select>
				</label>
			</div>

			{#if loading}
				<p class="center-note" role="status">Traiendo sus recuerdos…</p>
			{:else if loadError}
				<div class="center-note error" role="alert">
					<span>No se pudieron cargar los recuerdos de este dispositivo.</span>
					<button class="ghost-btn" type="button" onclick={() => retry++}>Reintentar</button>
				</div>
			{:else if facts.length === 0}
				<div class="empty">
					<Icon name="brain" size={22} />
					<p>
						{query || category !== 'all'
							? 'Ningún recuerdo coincide con la búsqueda.'
							: factId !== undefined
								? 'Este recuerdo ya no está guardado. Muestra todo para ver los demás.'
								: 'Nada guardado todavía. Añade uno abajo o deja que crezcan conversando.'}
					</p>
				</div>
			{:else}
				<ul class="rows">
					{#each facts as fact (fact.id)}
						<li class="row">
							<div class="row-main">
								<p class="row-text">{fact.content}</p>
								<p class="row-meta">
									<span class="cat-dot" style="--cat: {fact.category === 'user' ? '#0a84ff' : fact.category === 'relationship' ? '#ff2d55' : '#30d158'}"></span>
									{categoryLabel[fact.category]} · Importancia {fact.importance} · {when(fact.createdAt)}
								</p>
							</div>
							{#if confirmId === fact.id}
								<div class="confirm">
									<span>¿Olvidar?</span>
									<button class="ghost-btn" type="button" disabled={forgetting === fact.id} onclick={() => (confirmId = undefined)}>Cancelar</button>
									<button class="danger-btn" type="button" disabled={forgetting === fact.id} onclick={() => fact.id !== undefined && forget(fact.id)}>
										{forgetting === fact.id ? 'Olvidando…' : 'Olvidar'}
									</button>
								</div>
							{:else}
								<button class="ghost-btn subtle" type="button" disabled={forgetting === fact.id} onclick={() => (confirmId = fact.id)} aria-label="Olvidar este recuerdo">
									<Icon name="trash" size={13} />
								</button>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			{#if !loading && !loadError}
				<nav class="pager" aria-label="Páginas de recuerdos">
					<span>{totalFacts} {totalFacts === 1 ? 'recuerdo' : 'recuerdos'} · Página {page + 1} de {Math.max(1, Math.ceil(totalFacts / PAGE_SIZE))}</span>
					<div class="pager-btns">
						<button class="ghost-btn" type="button" disabled={page === 0} onclick={() => { page--; void refresh(); }}>Anterior</button>
						<button class="ghost-btn" type="button" disabled={(page + 1) * PAGE_SIZE >= totalFacts} onclick={() => { page++; void refresh(); }}>Siguiente</button>
					</div>
				</nav>
			{/if}
		</section>

		<!-- Añadir un recuerdo (0.15.0 "Add a memory") -->
		<section class="block">
			<h3>Añadir un recuerdo</h3>
			<p class="hint">Guarda algo que quieres que Luna sepa.</p>
			<textarea
				class="textarea"
				rows="3"
				maxlength="2000"
				placeholder="Por ejemplo, prefiero té a café."
				bind:value={draft}
				onkeydown={(e) => {
					if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
						e.preventDefault();
						void addMemory();
					}
				}}
			></textarea>
			<div class="composer-grid">
				<label class="field-label">
					<span>Categoría</span>
					<select class="select" bind:value={draftCategory}>
						<option value="user">Sobre ti</option>
						<option value="relationship">De ustedes</option>
						<option value="shared_experience">Vivido juntos</option>
					</select>
				</label>
				<label class="field-label">
					<span>Importancia <em>{draftImportance}</em></span>
					<input type="range" min="0" max="100" step="5" bind:value={draftImportance} />
				</label>
			</div>
			<div class="composer-foot">
				<span class="hint">{notice || '⌘↵ para guardar'}</span>
				<button class="primary-btn" type="button" disabled={!draft.trim() || saving} onclick={addMemory}>
					{saving ? 'Guardando…' : 'Añadir recuerdo'}
				</button>
			</div>
		</section>
	{:else if pane === 'sessions'}
		<!-- Sesiones (0.15.0): Current / Saved con paginación -->
		<div class="subpanes" role="tablist" aria-label="Vistas de sesión">
			<button class="subpane" class:active={sessionPane === 'current'} type="button" onclick={() => (sessionPane = 'current')}>Conversación</button>
			<button class="subpane" class:active={sessionPane === 'saved'} type="button" onclick={() => (sessionPane = 'saved')}>Guardadas</button>
		</div>

		{#if sessionPane === 'current'}
			<section class="block">
				<h3>Conversación actual</h3>
				<p class="hint">Turnos guardados de esta sesión, o de la última tras recargar.</p>
				{#if loading}
					<p class="center-note" role="status">Buscando la sesión…</p>
				{:else if turns.length === 0}
					<div class="empty">
						<Icon name="message" size={22} />
						<p>Sin turnos guardados en esta sesión todavía.</p>
					</div>
				{:else}
					<ul class="rows">
						{#each turns as turn (turn.id)}
							<li class="row turn">
								<p class="turn-role" class:me={turn.role === 'user'}>{turn.role === 'user' ? 'Tú' : characterStore.name}</p>
								<div class="row-main">
									<p class="row-text">{turn.content}</p>
									<p class="row-meta">{when(new Date(turn.createdAt))}</p>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
				{#if !loading}
					<nav class="pager" aria-label="Páginas de turnos">
						<span>{totalTurns} {totalTurns === 1 ? 'turno' : 'turnos'} · Página {turnPage + 1} de {Math.max(1, Math.ceil(totalTurns / PAGE_SIZE))}</span>
						<div class="pager-btns">
							<button class="ghost-btn" type="button" disabled={turnPage === 0} onclick={() => { turnPage--; void refresh(); }}>Anterior</button>
							<button class="ghost-btn" type="button" disabled={(turnPage + 1) * PAGE_SIZE >= totalTurns} onclick={() => { turnPage++; void refresh(); }}>Siguiente</button>
						</div>
					</nav>
				{/if}
			</section>
		{:else}
			<section class="block">
				<h3>Sesiones guardadas</h3>
				<p class="hint">Resúmenes que el motor de memoria ya archivó.</p>
				{#if loading}
					<p class="center-note" role="status">Buscando sesiones…</p>
				{:else if sessions.length === 0}
					<div class="empty">
						<Icon name="calendar" size={22} />
						<p>Todavía no hay sesiones guardadas.</p>
					</div>
				{:else}
					<ul class="rows">
						{#each sessions as session (session.id)}
							<li class="row">
								<div class="row-main">
									<p class="row-text">{session.summary || 'Conversación sin resumen'}</p>
									<p class="row-meta">
										{fullDate(session.startedAt)} · {session.messageCount} mensajes
										{#if session.endedAt} · Último turno {when(new Date(session.endedAt))}{/if}
									</p>
									{#if session.keyTopics?.length}<p class="row-meta topics">Temas: {session.keyTopics.join(', ')}</p>{/if}
									{#if session.emotionalArc}<p class="row-meta">{session.emotionalArc}</p>{/if}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
				{#if !loading}
					<nav class="pager" aria-label="Páginas de sesiones">
						<span>{totalSessions} {totalSessions === 1 ? 'sesión' : 'sesiones'} · Página {sessionPage + 1} de {Math.max(1, Math.ceil(totalSessions / PAGE_SIZE))}</span>
						<div class="pager-btns">
							<button class="ghost-btn" type="button" disabled={sessionPage === 0} onclick={() => { sessionPage--; void refresh(); }}>Anterior</button>
							<button class="ghost-btn" type="button" disabled={(sessionPage + 1) * PAGE_SIZE >= totalSessions} onclick={() => { sessionPage++; void refresh(); }}>Siguiente</button>
						</div>
					</nav>
				{/if}
			</section>
		{/if}
	{:else}
		<!-- Ajustes (0.15.0): almacenamiento + herramientas avanzadas -->
		<section class="block">
			<h3>Almacenamiento de memoria</h3>
			<p class="hint">
				Los recuerdos se guardan en este dispositivo y se usan en conversaciones futuras. Añade o
				quita desde Recuerdos; haz copia o restáuralos desde Datos.
			</p>
			<button class="ghost-btn" type="button" onclick={() => settingsModal.goTo('datos')}>
				Ajustes de datos
				<Icon name="arrow-right" size={13} />
			</button>
		</section>

		<section class="block">
			<details class="advanced" bind:open={advancedOpen}>
				<summary>
					<Icon name="chevron-down" size={13} />
					Avanzado
				</summary>
				<p class="hint">
					Inspecciona el estado del personaje o prueba cómo se interpreta una respuesta. Estas
					herramientas no cambian tus datos guardados.
				</p>
				<div class="subpanes" role="tablist" aria-label="Herramientas avanzadas">
					<button class="subpane" class:active={advancedPane === 'state'} type="button" onclick={() => (advancedPane = 'state')}>Estado</button>
					<button class="subpane" class:active={advancedPane === 'parser'} type="button" onclick={() => (advancedPane = 'parser')}>Prueba de interpretación</button>
				</div>

				{#if advancedPane === 'state'}
					<dl class="state-list">
						<div class="state-row"><dt>Nombre</dt><dd>{charState.name}</dd></div>
						<div class="state-row"><dt>Modo</dt><dd>{modeLabel}</dd></div>
						<div class="state-row"><dt>Ánimo</dt><dd>{charState.mood.primary} · {charState.mood.intensity}%</dd></div>
						<div class="state-row"><dt>Vínculo</dt><dd>{characterStore.stageInfo.name}</dd></div>
						<div class="state-row"><dt>Energía</dt><dd>{charState.energy}</dd></div>
						<div class="state-row"><dt>Conversaciones</dt><dd>{charState.totalInteractions}</dd></div>
						{#if charState.appMode !== 'companion'}
							<div class="state-row"><dt>Cariño</dt><dd>{Math.round(charState.affection / 10)}</dd></div>
							<div class="state-row"><dt>Confianza</dt><dd>{charState.trust}</dd></div>
							<div class="state-row"><dt>Intimidad</dt><dd>{charState.intimacy}</dd></div>
							<div class="state-row"><dt>Comodidad</dt><dd>{charState.comfort}</dd></div>
							<div class="state-row"><dt>Respeto</dt><dd>{charState.respect}</dd></div>
						{/if}
					</dl>
				{:else}
					<div class="parser-test">
						<div class="pt-samples">
							{#each parserSamples as sample (sample.label)}
								<button
									class="ghost-btn"
									type="button"
									onclick={() => {
										testResponse = sample.text;
										testResult = '';
									}}
								>
									{sample.label}
								</button>
							{/each}
						</div>
						<label class="field-label">
							<span>Mensaje del usuario</span>
							<textarea class="textarea" rows="2" maxlength="2000" bind:value={testMessage}></textarea>
						</label>
						<label class="field-label">
							<span>Respuesta cruda del modelo</span>
							<textarea class="textarea" rows="6" maxlength="20000" bind:value={testResponse}></textarea>
						</label>
						<button class="primary-btn" type="button" onclick={runParserTest}>Interpretar muestra</button>
						{#if testResult}<pre class="pt-result" aria-label="Resultado del intérprete">{testResult}</pre>{/if}
					</div>
				{/if}
			</details>
		</section>
	{/if}
</div>

<style>
	/* ── Navegación del sistema ─────────────────────────────────────── */
	.panes {
		display: flex;
		gap: 0.25rem;
		padding: 0.1875rem;
		border-radius: 12px;
		background: var(--accent-subtle);
	}

	.pane-btn {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.4375rem 0.5rem;
		border: none;
		border-radius: 9px;
		background: transparent;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 540;
		color: var(--text-secondary);
		cursor: pointer;
		transition: background 0.14s ease, color 0.14s ease;
	}

	.pane-btn:hover {
		color: var(--text-primary);
	}

	.pane-btn.active {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	/* Sub-segmentados (Conversación/Guardadas · Estado/Parser) */
	.subpanes {
		display: inline-flex;
		gap: 0.1875rem;
		padding: 0.1875rem;
		border-radius: 999px;
		background: var(--accent-subtle);
		margin-bottom: 0.25rem;
	}

	.subpane {
		padding: 0.3125rem 0.875rem;
		border: none;
		border-radius: 999px;
		background: transparent;
		font: inherit;
		font-size: 0.7188rem;
		font-weight: 540;
		color: var(--text-secondary);
		cursor: pointer;
		transition: background 0.14s ease, color 0.14s ease;
	}

	.subpane:hover {
		color: var(--text-primary);
	}

	.subpane.active {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	/* ── Bloques tipográficos, sin cajas ─────────────────────────────── */
	.block {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.block h3 {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 640;
		color: var(--text-primary);
	}

	.hint {
		margin: 0;
		font-size: 0.7813rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.center-note {
		margin: 0;
		padding: 1.25rem 0;
		text-align: center;
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.center-note.error {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.625rem;
		color: var(--color-error);
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.625rem;
		padding: 2.25rem 1rem;
		text-align: center;
		color: var(--text-tertiary);
	}

	.empty p {
		margin: 0;
		max-width: 340px;
		font-size: 0.8125rem;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	/* ── Filas con hairlines ─────────────────────────────────────────── */
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.row {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.6875rem 0;
	}

	.row + .row {
		border-top: 1px solid var(--accent-subtle);
	}

	.row-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1875rem;
	}

	.row-text {
		margin: 0;
		font-size: 0.8438rem;
		color: var(--text-primary);
		line-height: 1.45;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.row-meta {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.7188rem;
		color: var(--text-tertiary);
	}

	.row-meta.topics {
		color: var(--text-secondary);
	}

	.cat-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--cat);
		flex-shrink: 0;
	}

	.turn {
		flex-direction: row;
	}

	.turn-role {
		margin: 0;
		flex-shrink: 0;
		width: 3.25rem;
		font-size: 0.7188rem;
		font-weight: 620;
		color: var(--accent-muted, var(--text-secondary));
	}

	.turn-role.me {
		color: var(--text-tertiary);
	}

	/* ── Filtros y campos ────────────────────────────────────────────── */
	.filters {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.filters > .field-label {
		flex: 1 1 200px;
		min-width: 0;
	}

	.filters .field {
		width: 100%;
	}

	.field {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.4375rem;
		padding: 0 0.6875rem;
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		background: var(--bg-secondary);
		color: var(--text-tertiary);
	}

	.field input {
		flex: 1;
		min-width: 0;
		border: none;
		background: transparent;
		padding: 0.4375rem 0;
		color: var(--text-primary);
		font: inherit;
		font-size: 0.7813rem;
		outline: none;
	}

	.field:focus-within {
		border-color: var(--accent);
		color: var(--text-secondary);
	}

	.select,
	.textarea {
		padding: 0.4375rem 0.6875rem;
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		font: inherit;
		font-size: 0.7813rem;
		outline: none;
	}

	.textarea {
		resize: vertical;
		line-height: 1.5;
		min-height: 4.5rem;
	}

	.select:focus,
	.textarea:focus {
		border-color: var(--accent);
	}

	.field-label {
		display: flex;
		flex-direction: column;
		gap: 0.3125rem;
		font-size: 0.7188rem;
		color: var(--text-secondary);
	}

	.field-label em {
		font-style: normal;
		font-weight: 620;
		color: var(--text-primary);
	}

	.field-label input[type='range'] {
		accent-color: var(--accent);
		width: 100%;
	}

	.composer-grid {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		flex-wrap: wrap;
	}

	.composer-grid > .field-label:first-child {
		min-width: 10rem;
	}

	.composer-grid > .field-label:last-child {
		flex: 1;
		min-width: 9rem;
	}

	.composer-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	/* ── Confirmación de olvido ──────────────────────────────────────── */
	.confirm {
		display: flex;
		align-items: center;
		gap: 0.4375rem;
		flex-shrink: 0;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.focus-notice {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.7813rem;
		color: var(--text-secondary);
		padding-bottom: 0.125rem;
	}

	/* ── Botones del sistema ─────────────────────────────────────────── */
	.ghost-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4375rem;
		padding: 0.4063rem 0.8125rem;
		border: 1px solid var(--border-subtle);
		border-radius: 9px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		font: inherit;
		font-size: 0.75rem;
		font-weight: 540;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.14s ease, border-color 0.14s ease;
	}

	.ghost-btn:hover:not(:disabled) {
		background: var(--bg-tertiary);
	}

	.ghost-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.ghost-btn.subtle {
		border-color: transparent;
		background: transparent;
		color: var(--text-tertiary);
		padding: 0.4063rem 0.5rem;
	}

	.ghost-btn.subtle:hover:not(:disabled) {
		color: var(--color-error);
		background: var(--accent-subtle);
	}

	.danger-btn {
		display: inline-flex;
		align-items: center;
		padding: 0.4063rem 0.8125rem;
		border: 1px solid color-mix(in srgb, var(--color-error) 38%, transparent);
		border-radius: 9px;
		background: transparent;
		color: var(--color-error);
		font: inherit;
		font-size: 0.75rem;
		font-weight: 540;
		cursor: pointer;
		white-space: nowrap;
	}

	.danger-btn:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-error) 10%, transparent);
	}

	.danger-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.primary-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4375rem;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 10px;
		background: var(--accent);
		color: var(--accent-contrast);
		font: inherit;
		font-size: 0.7813rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.15s var(--ease-brand), opacity 0.15s ease;
	}

	.primary-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		opacity: 0.92;
	}

	.primary-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	/* ── Grafo ───────────────────────────────────────────────────────── */
	.graph-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.graph-heading .hint {
		flex: 1 1 260px;
	}

	.graph-host {
		position: relative;
		/* Aire interior con wash literal: --bg-secondary dentro del glass
		   se remapea a un lavado enorme — este es el wash sutil del kit */
		padding: 0.875rem 1rem 0.625rem;
		border: 1px solid color-mix(in srgb, var(--text-primary) 11%, transparent);
		border-radius: 14px;
		background: color-mix(in srgb, var(--text-primary) 4.5%, transparent);
	}

	/* ── Paginación ──────────────────────────────────────────────────── */
	.pager {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
		padding-top: 0.5rem;
		border-top: 1px solid var(--accent-subtle);
		font-size: 0.7188rem;
		color: var(--text-tertiary);
	}

	.pager-btns {
		display: flex;
		gap: 0.4375rem;
	}

	/* ── Ajustes → avanzado ──────────────────────────────────────────── */
	.advanced summary {
		display: flex;
		align-items: center;
		gap: 0.4375rem;
		cursor: pointer;
		list-style: none;
		font-size: 0.8125rem;
		font-weight: 640;
		color: var(--text-primary);
		padding: 0.125rem 0;
	}

	.advanced summary::-webkit-details-marker {
		display: none;
	}

	.advanced summary :global(svg) {
		transition: transform 0.18s ease;
	}

	.advanced[open] summary :global(svg) {
		transform: rotate(180deg);
	}

	.advanced .subpanes {
		margin-top: 0.5rem;
	}

	.state-list {
		margin: 0.25rem 0 0;
	}

	.state-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 0;
		font-size: 0.8125rem;
	}

	.state-row + .state-row {
		border-top: 1px solid var(--accent-subtle);
	}

	.state-row dt {
		color: var(--text-secondary);
	}

	.state-row dd {
		margin: 0;
		color: var(--text-primary);
		font-weight: 500;
		overflow-wrap: anywhere;
	}

	/* ── Parser test ─────────────────────────────────────────────────── */
	.parser-test {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		margin-top: 0.25rem;
	}

	.pt-samples {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4375rem;
	}

	.pt-result {
		margin: 0;
		padding: 0.6875rem 0.75rem;
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		background: var(--bg-secondary);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.7188rem;
		line-height: 1.5;
		color: var(--text-primary);
		overflow: auto;
		max-height: 16rem;
		white-space: pre-wrap;
	}

	.notice {
		margin: 0;
		font-size: 0.7813rem;
		color: var(--color-success);
	}
</style>
