<script lang="ts">
	import { slideOpen, fadeFast } from '$lib/utils/motion';
	import { characterStore } from '$lib/stores/character.svelte';
	import { vrmStore } from '$lib/stores/vrm.svelte';
	import { getCompletedEvents } from '$lib/services/storage/events';
	import { allEvents } from '$lib/data/events';
	import { STAGE_ORDER } from '$lib/engine/stages';
	import type { AppMode } from '$lib/types/character';
	import { bondState, weeklyPulse, momentsFromCharacter } from '$lib/config/bond';
	import { settingsModal } from '$lib/stores/settings-modal.svelte';
	import { accountStore } from '$lib/stores/account.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import LunaAvatar from '../LunaAvatar.svelte';
	import '../modal-kit.css';

	const character = $derived(characterStore.state);
	const mood = $derived(characterStore.moodInfo);
	const bond = $derived(bondState(character));
	const pulse = $derived(weeklyPulse(character));
	const lastCause = $derived(character.mood.causes[character.mood.causes.length - 1]);
	// Ícono consistente: si el nombre no existe en el set, cae a uno genérico
	// (nada de emojis del sistema que cambian entre plataformas).
	const MOOD_ICON_FALLBACK: Record<string, string> = {
		'alert-circle': 'warning',
		'circle-help': 'help-circle'
	};
	const moodIcon = $derived(
		MOOD_ICON_FALLBACK[mood.icon] ?? mood.icon ?? 'circle'
	);

	// ── Modo: elección inmediata, sin avisos ────────────────────────────
	interface ModeDef {
		id: AppMode;
		title: string;
		desc: string;
		icon: string;
	}
	const MODES: ModeDef[] = [
		{
			id: 'companion',
			title: 'Compañía',
			desc: 'Presencia serena, sin marcador.',
			icon: 'sparkles'
		},
		{
			id: 'dating_sim',
			title: 'Historia',
			desc: 'El vínculo crece por etapas.',
			icon: 'heart'
		}
	];

	function pickMode(mode: AppMode) {
		if (mode !== character.appMode) characterStore.setAppMode(mode);
	}

	// ── Pista de etapas ─────────────────────────────────────────────────
	const STAGE_SHORT: Record<string, string> = {
		stranger: 'Desconocida',
		acquaintance: 'Conocidos',
		friend: 'Amistad',
		close_friend: 'Cercanía',
		romantic_interest: 'Algo más',
		dating: 'Juntos',
		committed: 'Confianza',
		soulmate: 'Alma gemela'
	};
	const stageIdx = $derived(STAGE_ORDER.indexOf(character.relationshipStage));
	const isDating = $derived(character.appMode === 'dating_sim' && stageIdx >= 0);

	// Desvanecido derecho: solo cuando el track desborda.
	let trackEl = $state<HTMLDivElement | null>(null);
	let trackFade = $state(false);
	$effect(() => {
		const el = trackEl;
		if (!el) return;
		const measure = () => (trackFade = el.scrollWidth > el.clientWidth + 4);
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	});

	// ── Estadísticas internas: cada modo mide lo suyo ───────────────────
	// Historia → las 5 de relación. Compañía → solo energía (sin marcador),
	// igual que el flujo de personalidad del modal.
	let statsOpen = $state(false);
	const stats = $derived.by(() => {
		if (character.appMode !== 'dating_sim') {
			return [
				{ key: 'energy', label: 'Energía', value: Math.round(character.energy), color: 'var(--ctp-peach)' }
			];
		}
		return [
			{ key: 'trust', label: 'Confianza', value: character.trust, color: 'var(--ctp-green)' },
			{ key: 'intimacy', label: 'Intimidad', value: character.intimacy, color: 'var(--ctp-mauve)' },
			{ key: 'comfort', label: 'Comodidad', value: character.comfort, color: 'var(--ctp-sky)' },
			{ key: 'respect', label: 'Respeto', value: character.respect, color: 'var(--ctp-teal)' },
			{ key: 'energy', label: 'Energía', value: Math.round(character.energy), color: 'var(--ctp-peach)' }
		];
	});
	const statsNote = $derived(
		character.appMode === 'dating_sim'
			? 'Lo que Luna siente por dentro — solo para curiosos.'
			: 'En compañía solo se registran el ánimo y la energía: la relación no lleva marcador.'
	);

	// ── Apariencia: importación directa + eliminar ──────────────────────
	let fileInput = $state<HTMLInputElement | null>(null);
	function importVrm() {
		fileInput?.click();
	}
	async function onFilePicked(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) await vrmStore.addModel(file);
		input.value = '';
	}
	let confirmDelete = $state<string | null>(null);
	async function deleteVrm(id: string) {
		await vrmStore.removeModel(id);
		confirmDelete = null;
	}

	// Tope de 4 apariencias a la vista: con más modelos la lista scrollea
	// por dentro (fade al filo) y la vista no se hace interminable. Se mide
	// la 4.ª fila real — funciona igual en flex (PC) y en la grid de 2
	// columnas de tablet, donde son 2 filas de a pares.
	let skinList = $state<HTMLDivElement | null>(null);
	let skinFade = $state(false);
	$effect(() => {
		const el = skinList;
		if (!el) return;
		// Reacción al catálogo: leer models.length registra la dependencia
		const rows = el.querySelectorAll<HTMLElement>(':scope > .skin-row');
		if (rows.length > 4) {
			// offsetTop es relativo al offsetParent (no a la lista): normalizo
			// con la primera fila para que el tope sea correcto en cualquier anidación.
			const base = rows[0].offsetTop;
			const fourth = rows[3];
			el.style.maxHeight = `${fourth.offsetTop - base + fourth.offsetHeight}px`;
		} else {
			el.style.maxHeight = '';
		}
		const update = () =>
			(skinFade =
				el.scrollHeight > el.clientHeight + 4 &&
				el.scrollTop + el.clientHeight < el.scrollHeight - 4);
		update();
		el.addEventListener('scroll', update, { passive: true });
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => {
			el.removeEventListener('scroll', update);
			ro.disconnect();
		};
	});

	// Desvanecidos del scroll del detalle: el filo nunca corta seco.
	/* IMPORTANTE: el fade INFERIOR es SIEMPRE (como la cinta del panel en las
	   otras vistas, que nunca se apaga) — si fuera condicional, al volver
	   arriba desaparecería y el filo quedaria duro. El superior solo vive
	   cuando hay recorrido por encima. */
	let detailEl = $state<HTMLElement | null>(null);
	let detailFadeTop = $state(false);
	let detailFadeBottom = $state(true);
	$effect(() => {
		const el = detailEl;
		if (!el) return;
		const update = () => {
			const max = el.scrollHeight - el.clientHeight;
			detailFadeTop = el.scrollTop > 4;
			detailFadeBottom = true;
		};
		update();
		el.addEventListener('scroll', update, { passive: true });
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => {
			el.removeEventListener('scroll', update);
			ro.disconnect();
		};
	});

	// ── Momentos + logros ───────────────────────────────────────────────
	let eventRecords = $state<{ eventId: string; completedAt: Date }[]>([]);
	let completedIds = $state<string[]>([]);
	$effect(() => {
		getCompletedEvents().then((records) => {
			eventRecords = records;
			completedIds = records.map((r) => r.eventId);
		});
	});

	const eventNames = $derived(new Map(allEvents.map((e) => [e.id, e.name])));
	const moments = $derived(momentsFromCharacter(character, completedIds, eventNames));

	const TYPE_STYLE: Record<string, { label: string; color: string }> = {
		milestone: { label: 'Hito', color: 'var(--ctp-yellow)' },
		anniversary: { label: 'Aniversario', color: 'var(--ctp-pink)' },
		conditional: { label: 'Desbloqueado', color: 'var(--ctp-mauve)' },
		random: { label: 'Sorpresa', color: 'var(--ctp-teal)' },
		scheduled: { label: 'Evento', color: 'var(--ctp-sky)' }
	};
	const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
	const achievements = $derived.by(() => {
		return eventRecords
			.map((record) => {
				const def = allEvents.find((e) => e.id === record.eventId);
				if (!def) return null;
				const d = new Date(record.completedAt);
				return {
					id: record.eventId,
					name: def.name,
					type: def.type as string,
					when: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`,
					at: d.getTime()
				};
			})
			.filter((a): a is NonNullable<typeof a> => a !== null)
			.sort((a, b) => b.at - a.at);
	});
</script>

<div class="set-view">
	<div class="sheet">
		<!-- ── Retrato: identidad abierta, ánimo sobre la foto ──────────── -->
		<aside class="portrait">
			<div class="portrait-head">
				<span class="portrait-frame">
					<LunaAvatar size={128} rounded={false} />						<span
							class="portrait-mood"
							style={`color: ${mood.color}; background: color-mix(in srgb, ${mood.color} 16%, #1b1b21); border-color: color-mix(in srgb, ${mood.color} 45%, #1b1b21)`}
						title={`${mood.description}${lastCause ? ` · ${lastCause}` : ''}`}
					>
					<Icon name={moodIcon} size={10} />
					{mood.name}
					</span>
				</span>
				<div class="portrait-id">
					<h2 class="portrait-name">{character.name || 'Luna'}</h2>
					{#if character.daysKnown > 0}
						<span class="portrait-days">
							{character.daysKnown === 1 ? '1 día' : `${character.daysKnown} días`} conociéndose
						</span>
					{/if}
				</div>
			</div>

			<div class="portrait-side">
			<span class="kicker mid">Modo</span>
					<div class="mode-list" role="radiogroup" aria-label="Modo de la app">
				{#each MODES as m (m.id)}
					<button
						class="mode-row"
						class:on={character.appMode === m.id}
						type="button"
						role="radio"
						aria-checked={character.appMode === m.id}
						onclick={() => pickMode(m.id)}
					>
						<span
							class="mode-ic"
							style={`color: ${m.id === 'dating_sim' ? 'var(--ctp-pink)' : 'var(--ctp-blue)'}`}
						>
							<Icon name={m.icon} size={13} />
						</span>
						<span class="mode-copy">
							<span class="mode-title">{m.title}</span>
							<span class="mode-desc">{m.desc}</span>
						</span>
						<span class="mode-check">
							{#if character.appMode === m.id}
								<Icon name="check" size={11} strokeWidth={2.5} />
							{/if}
						</span>
					</button>
				{/each}
			</div>

			<p class="portrait-coins">
				<Icon name="coins" size={11} />
				{accountStore.coins.toLocaleString('es')} lunas
			</p>
			</div>
		</aside>

		<!-- El fade vive en un wrapper FIJO (no scrollea): así el 100% del
		     gradiente es siempre el alto visible — si la máscara va sobre el
		     scroller, algunos motores la pintan contra el scrollHeight y el
		     desvanecido se estira enormemente. -->
		<div class="detail-wrap" class:fade-top={detailFadeTop} class:fade-bottom={detailFadeBottom}>
			<div class="detail" bind:this={detailEl}>
			<section class="blk">
				<span class="kicker">Tu vínculo</span>
				<div class="bond-head">
					<p class="bond-state">{bond.label}</p>
					<p class="bond-line">{bond.line}</p>
				</div>					<div class="stage-slot">
						{#if isDating}
							<div
								class="track"
								class:fade={trackFade}
								bind:this={trackEl}
								role="img"
								aria-label={`Etapa actual: ${bond.label}. Camino de ${STAGE_ORDER.length} etapas.`}
							>
								{#each STAGE_ORDER as s, i (s)}
									<span class="node" class:done={i < stageIdx} class:current={i === stageIdx}>
										<span class="dot"></span>
										<span class="node-label">{STAGE_SHORT[s] ?? s}</span>
									</span>
									{#if i < STAGE_ORDER.length - 1}
										<span class="link" class:done={i < stageIdx} aria-hidden="true"></span>
									{/if}
								{/each}
							</div>
						{:else if character.appMode === 'companion'}
							<p class="bond-alt">
								En modo compañía la amistad fluye sin marcador: lo que viven juntos queda en su memoria.
							</p>
						{:else}
							<p class="bond-alt">Ya no hay peldaños: la historia sigue sola.</p>
						{/if}
					</div>

				<div class="bond-foot">
					<div class="pulse" role="img" aria-label="Actividad reciente: {pulse.activityLine}">
						{#each [0, 1, 2, 3] as dot (dot)}
							<span class="pulse-dot" class:lit={dot < pulse.level}></span>
						{/each}
						<span class="pulse-text">{pulse.activityLine}</span>
					</div>
					<span class="foot-sep" aria-hidden="true"></span>
					<button
						class="stats-toggle"
						type="button"
						onclick={() => (statsOpen = !statsOpen)}
						aria-expanded={statsOpen}
					>
						{statsOpen ? 'Ocultar estadísticas' : 'Estadísticas internas'}
						<span class={`chev ${statsOpen ? 'flip' : ''}`}><Icon name="chevron-down" size={10} /></span>
					</button>
				</div>
				{#if statsOpen}
					<div class="stats-grid" transition:slideOpen>
						<p class="stats-note">{statsNote}</p>
						{#each stats as stat (stat.key)}
							<div class="stat">
								<span class="stat-head">
									<span class="stat-label" style={`color: ${stat.color}`}>{stat.label}</span>
									<span class="stat-num">{stat.value}</span>
								</span>
								<span class="stat-bar">
									<span
										class="stat-fill"
										style={`width: ${Math.min(100, stat.value)}%; background: ${stat.color}`}
									></span>
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<div class="detail-cols">
				<section class="blk">
					<span class="kicker">Momentos</span>
					{#if moments.length <= 1}
						<p class="bond-alt">Su historia juntos apenas comienza. Todo momento empieza con un hola.</p>
					{/if}
					<div class="moments">
						{#each moments.slice(0, 6) as moment (moment.id)}
							<div class="moment">
								<span class="moment-rail" aria-hidden="true"></span>
								<div class="moment-body">
									<span class="moment-title">{moment.title}</span>
									<span class="moment-detail">{moment.detail}</span>
								</div>
							</div>
						{/each}
					</div>

					{#if achievements.length > 0}
						<span class="kicker spaced">Logros</span>
						<div class="achievements">
							{#each achievements as ach (`${ach.id}-${ach.at}`)}
								<div class="achievement">
									<span
										class="achievement-dot"
										style={`background: ${TYPE_STYLE[ach.type]?.color ?? 'var(--text-tertiary)'}`}
									></span>
									<div class="achievement-body">
										<span class="achievement-name">{ach.name}</span>
										<span class="achievement-when">
											{ach.when} · {TYPE_STYLE[ach.type]?.label ?? 'Momento'}
										</span>
									</div>
									<Icon name="check" size={11} strokeWidth={2.5} />
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<aside class="blk">
					<span class="kicker">Su apariencia</span>
					<div class="skin-list" class:fade={skinFade} bind:this={skinList}>
						{#each vrmStore.models as model (model.id)}
							<div
								class="skin-row"
								class:active={model.id === vrmStore.activeModelId}
							>
								<button
									class="skin-main"
									type="button"
									onclick={() => vrmStore.setActiveModel(model.id)}
								>
									<span class="skin-thumb">
										{#if vrmStore.getModelPortrait(model.id, 'bust')}
											<img src={vrmStore.getModelPortrait(model.id, 'bust')} alt={model.name} />
										{:else}
											<Icon name="user" size={15} />
										{/if}
									</span>
									<span class="skin-name">{model.name}</span>
								</button>
								<span class="skin-check">
									{#if model.id === vrmStore.activeModelId}
										<Icon name="check" size={11} strokeWidth={2.5} />
									{/if}
								</span>
								{#if !model.isDefault}
									{#if confirmDelete === model.id}
										<span class="skin-confirm">
											<button
												class="confirm-yes"
												type="button"
												onclick={() => deleteVrm(model.id)}
											>
												Eliminar
											</button>
											<button
												class="confirm-no"
												type="button"
												onclick={() => (confirmDelete = null)}
											>
												Cancelar
											</button>
										</span>
									{:else}
										<button
											class="skin-delete"
											type="button"
											aria-label="Eliminar {model.name}"
											onclick={() => (confirmDelete = model.id)}
										>
											<Icon name="trash" size={12} />
										</button>
									{/if}
								{/if}
							</div>
						{/each}
					</div>
					<button class="skin-row add" type="button" onclick={importVrm}>
						<span class="skin-thumb dashed"><Icon name="upload" size={13} /></span>
						<span class="skin-name muted">Importar modelo…</span>
					</button>
					<input
						bind:this={fileInput}
						type="file"
						accept=".vrm,model/gltf-binary"
						onchange={onFilePicked}
						hidden
					/>

					<div class="skin-sep" role="separator"></div>

					<button
						class="skin-row"
						type="button"
						onclick={() => settingsModal.pushOverlay('vestuario')}
					>
						<span class="skin-thumb iconed" style="color: var(--ctp-pink)">
							<Icon name="shirt" size={13} />
						</span>
						<span class="skin-name">Vestuario</span>
						<span class="skin-value">Original</span>
						<span class="skin-chev">
							<svg viewBox="0 0 320 512" width="9" height="9" fill="currentColor" aria-hidden="true"><path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"/></svg>
						</span>
					</button>
				</aside>
			</div>
		</div>
		</div>
	</div>
</div>

<style>
	/* ── Hoja: dos zonas fijas, SOLO el detalle scrollea ─────────────── */
	/* La vista llena el alto del panel y parte el scroll: retrato fijo a
	   la izquierda, detalle con scroll propio a la derecha. Nada de sticky:
	   el overflow:hidden del sheet del modal anula su recorrido en Safari. */
	.set-view {
		height: 100%;
		overflow: hidden;
		/* Sin padding inferior: si no, el fade del detalle termina 2.75rem
		   ANTES del borde del panel y el ojo lo lee como desvanecido doble
		   (88px del fade + 44px de colchón muerto). En las otras vistas el
		   padding scrollea con el contenido; aquí el filo debe ser el borde. */
		padding-bottom: 0;
	}

	.sheet {
		display: grid;
		grid-template-columns: 240px minmax(0, 1fr);
		grid-template-rows: minmax(0, 1fr);
		gap: 0;
		height: 100%;
		width: 100%;
		max-width: 66rem;
		margin-inline: auto;
	}

	/* ── Retrato: columna fija, nunca scrollea con el contenido ──────── */
	.portrait {
		min-height: 0;
		overflow-y: auto; /* solo si el viewport es muy bajo */
		scrollbar-width: none;
		display: flex;
		flex-direction: column;
		padding: 0.75rem 2rem 0.5rem 0.25rem;
	}

	.portrait::-webkit-scrollbar {
		display: none;
	}

	/* Desktop: portrait-side desaparece y sus hijos fluyen como siempre */
	.portrait-side {
		display: contents;
	}

	.portrait-head {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		width: 100%;
	}

	.portrait-frame {
		position: relative;
		display: inline-block;
		padding: 4px;
		border-radius: 24px;
		background: linear-gradient(
			165deg,
			color-mix(in srgb, var(--accent) 45%, transparent),
			color-mix(in srgb, var(--accent) 8%, transparent) 70%
		);
		box-shadow: var(--shadow-md);
	}

	.portrait-frame :global(img),
	.portrait-frame :global(.avatar-wrap) {
		border-radius: 20px;
	}

	/* Radio interior anidado: 24px fuera − 4px de padding = 20px. Sin esto
	   el --radius-md del avatar deja esquinas más cerradas que el marco y
	   el borde inferior se ve cortado. */
	.portrait-frame :global(.luna-avatar) {
		border-radius: 20px;
	}

	/* El ánimo vive SOBRE la foto, como badge de estado */
	.portrait-mood {
		position: absolute;
		bottom: -0.6875rem;
		left: 50%;
		transform: translateX(-50%);
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.3125rem 0.6875rem;
		border: 1px solid transparent;
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		font-weight: 620;
		white-space: nowrap;
		box-shadow: var(--shadow-sm);
	}

	.portrait-id {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3125rem;
		margin-top: 1.375rem;
	}

	.portrait-name {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 720;
		letter-spacing: -0.022em;
		color: var(--text-primary);
		line-height: 1.1;
	}

	.portrait-days {
		font-size: 0.7813rem;
		color: var(--text-tertiary);
	}

	/* ── Bloques y kickers ────────────────────────────────────────────── */
	.kicker {
		display: block;
		margin-bottom: 0.875rem;
		font-size: 0.6875rem;
		font-weight: 620;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-tertiary);
	}

	.kicker.mid {
		margin-top: 2.125rem;
	}

	.kicker.spaced {
		margin-top: 2.25rem;
	}

	.blk {
		min-width: 0;
	}

	/* Filas de modo: abiertas, con hairlines */
	.mode-list {
		width: 100%;
	}

	.mode-row {
		display: flex;
		align-items: center;
		gap: 0.6875rem;
		width: 100%;
		padding: 0.75rem 0.125rem;
		border: none;
		border-top: 1px solid var(--border-subtle);
		background: transparent;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
		transition: opacity 0.14s ease;
	}

	.mode-row:last-child {
		border-bottom: 1px solid var(--border-subtle);
	}

	.mode-row:not(.on) {
		opacity: 0.72;
	}

	.mode-row:not(.on):hover {
		opacity: 1;
	}

	.mode-ic {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		flex-shrink: 0;
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, currentColor 10%, transparent);
	}

	.mode-copy {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.0625rem;
		min-width: 0;
	}

	.mode-title {
		font-size: 0.8438rem;
		font-weight: 620;
		color: var(--text-primary);
	}

	.mode-row.on .mode-title {
		color: var(--accent);
	}

	.mode-desc {
		font-size: 0.7188rem;
		color: var(--text-tertiary);
		line-height: 1.35;
	}

	.mode-check {
		/* Slot reservado: la fila no crece al aparecer el check */
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
		width: 20px;
		flex-shrink: 0;
		color: var(--accent);
	}

	.portrait-coins {
		display: flex;
		align-items: center;
		gap: 0.4375rem;
		margin: 1.25rem 0 0;
		padding-left: 0.125rem;
		font-size: 0.7813rem;
		color: var(--text-tertiary);
	}

	/* ── Detalle: la ÚNICA zona con scroll ───────────────────────────── */
	/* Wrapper FIJO: no scrollea — por eso el 100% de su gradiente es
	   siempre el alto visible y el fade mide lo que debe en cualquier motor. */
	.detail-wrap {
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
		border-left: 1px solid var(--border-subtle);
	}

	.detail {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 3rem;
		min-width: 0;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		/* Colchón inferior = zona de fade (88px) + aire: la última fila
		   (Vestuario) reposa ENCIMA del desvanecido al llegar al fondo,
		   igual que el contenido de las otras vistas con su padding. */
		padding: 0.75rem 1rem 6.5rem 2.75rem;
		scrollbar-width: thin;
		scrollbar-color: var(--scrollbar-thumb) transparent;
	}

	/* Desvanecidos del filo: la MISMA curva de la cinta del pane, invertida
	   abajo (88px de recorrido, la caída fuerte en el tramo final). Cero
	   invención: idéntico en carácter al resto de vistas. */
	.detail-wrap.fade-bottom {
		mask-image: linear-gradient(
			to bottom,
			#000 calc(100% - 88px),
			rgba(0, 0, 0, 0.55) calc(100% - 56px),
			rgba(0, 0, 0, 0.12) calc(100% - 28px),
			transparent
		);
		-webkit-mask-image: linear-gradient(
			to bottom,
			#000 calc(100% - 88px),
			rgba(0, 0, 0, 0.55) calc(100% - 56px),
			rgba(0, 0, 0, 0.12) calc(100% - 28px),
			transparent
		);
	}

	.detail-wrap.fade-top {
		mask-image: linear-gradient(
			to bottom,
			transparent,
			rgba(0, 0, 0, 0.12) 28px,
			rgba(0, 0, 0, 0.55) 56px,
			#000 88px
		);
		-webkit-mask-image: linear-gradient(
			to bottom,
			transparent,
			rgba(0, 0, 0, 0.12) 28px,
			rgba(0, 0, 0, 0.55) 56px,
			#000 88px
		);
	}

	.detail-wrap.fade-top.fade-bottom {
		mask-image: linear-gradient(
			to bottom,
			transparent,
			rgba(0, 0, 0, 0.12) 28px,
			rgba(0, 0, 0, 0.55) 56px,
			#000 88px,
			#000 calc(100% - 88px),
			rgba(0, 0, 0, 0.55) calc(100% - 56px),
			rgba(0, 0, 0, 0.12) calc(100% - 28px),
			transparent
		);
		-webkit-mask-image: linear-gradient(
			to bottom,
			transparent,
			rgba(0, 0, 0, 0.12) 28px,
			rgba(0, 0, 0, 0.55) 56px,
			#000 88px,
			#000 calc(100% - 88px),
			rgba(0, 0, 0, 0.55) calc(100% - 56px),
			rgba(0, 0, 0, 0.12) calc(100% - 28px),
			transparent
		);
	}

	.detail-cols {
		display: grid;
		grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
		gap: 3rem;
		align-items: start;
	}

	/* ── Vínculo ──────────────────────────────────────────────────────── */
	.bond-head {
		display: flex;
		align-items: baseline;
		gap: 1.125rem;
		flex-wrap: wrap;
	}

	.bond-state {
		margin: 0;
		font-size: 1.3125rem;
		font-weight: 680;
		letter-spacing: -0.015em;
		color: var(--text-primary);
	}

	.bond-line {
		margin: 0;
		font-size: 0.8438rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	/* Slot estable: el track y el copy de compañía ocupan lo mismo */
	.stage-slot {
		display: flex;
		align-items: flex-start;
		min-height: 64px;
		margin-top: 0.375rem;
	}

	.bond-alt {
		margin: 0.625rem 0 0;
		font-size: 0.8125rem;
		color: var(--text-tertiary);
		line-height: 1.5;
		max-width: 34rem;
	}

	/* Pista de etapas con desvanecido derecho cuando desborda */
	.track {
		display: flex;
		align-items: flex-start;
		gap: 0.25rem;
		width: 100%;
		overflow-x: auto;
		padding: 0.25rem 2px 0.5rem;
		scrollbar-width: none;
	}

	.track::-webkit-scrollbar {
		display: none;
	}

	.track.fade {
		mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 52px), transparent);
		-webkit-mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 52px), transparent);
	}

	.node {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: var(--radius-full);
		background: var(--bg-tertiary);
		border: 1.5px solid var(--border-light);
		transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.node.done .dot {
		background: var(--ctp-mauve);
		border-color: var(--ctp-mauve);
	}

	.node.current .dot {
		width: 13px;
		height: 13px;
		background: var(--ctp-pink);
		border-color: var(--ctp-pink);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--ctp-pink) 22%, transparent);
	}

	.node-label {
		max-width: 68px;
		font-size: 0.6563rem;
		font-weight: 550;
		color: var(--text-tertiary);
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.node.current .node-label {
		color: var(--text-primary);
		font-weight: 640;
	}

	.node.done .node-label {
		color: var(--text-secondary);
	}

	.link {
		flex: 1 0 14px;
		min-width: 14px;
		height: 1.5px;
		margin-top: 4px;
		background: var(--border-light);
	}

	.link.done {
		background: color-mix(in srgb, var(--ctp-mauve) 55%, transparent);
	}

	.bond-foot {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		flex-wrap: wrap;
		margin-top: 0.375rem;
	}

	.foot-sep {
		width: 1px;
		height: 12px;
		background: var(--border-subtle);
	}

	.pulse {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.pulse-dot {
		width: 5px;
		height: 5px;
		border-radius: var(--radius-full);
		background: var(--bg-tertiary);
		transition: background 0.2s ease;
	}

	.pulse-dot.lit {
		background: var(--ctp-mauve);
		box-shadow: 0 0 6px color-mix(in srgb, var(--ctp-mauve) 50%, transparent);
	}

	.pulse-text {
		margin-left: 0.375rem;
		font-size: 0.7813rem;
		color: var(--text-tertiary);
	}

	.stats-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0;
		border: none;
		background: transparent;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 560;
		color: var(--text-tertiary);
		cursor: pointer;
		transition: color 0.14s ease;
	}

	.stats-toggle:hover {
		color: var(--text-primary);
	}

	.chev {
		display: inline-flex;
		transition: transform 0.18s var(--ease-brand);
	}

	.chev.flip {
		transform: rotate(180deg);
	}

	.stats-grid {
		display: grid;
		/* Auto-fit: las 5 de historia se reparten; la energía sola de
		   compañía toma una columna ancha sin dejar huecos. */
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 0.8125rem 1.75rem;
		padding-top: 0.9375rem;
	}

	.stats-note {
		grid-column: 1 / -1;
		margin: 0;
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.stat-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.stat-label {
		font-size: 0.7188rem;
		font-weight: 590;
	}

	.stat-num {
		font-size: 0.75rem;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.stat-bar {
		display: block;
		height: 3px;
		border-radius: var(--radius-full);
		background: var(--bg-tertiary);
		overflow: hidden;
	}

	.stat-fill {
		display: block;
		height: 100%;
		border-radius: var(--radius-full);
		transition: width 0.4s var(--ease-brand);
	}

	/* ── Momentos ─────────────────────────────────────────────────────── */
	.moments {
		display: flex;
		flex-direction: column;
	}

	.moment {
		position: relative;
		display: flex;
		gap: 0.875rem;
		padding: 0.5rem 0;
	}

	.moment-rail {
		width: 1px;
		align-self: stretch;
		background: var(--border-light);
	}

	.moment:first-child .moment-rail {
		background: linear-gradient(180deg, var(--stat-intimacy) 0%, var(--border-light) 100%);
	}

	.moment-body {
		display: flex;
		flex-direction: column;
		gap: 0.0625rem;
		padding-bottom: 0.25rem;
	}

	.moment-title {
		font-size: 0.875rem;
		font-weight: 540;
		color: var(--text-primary);
	}

	.moment-detail {
		font-size: 0.7813rem;
		color: var(--text-tertiary);
		line-height: 1.4;
	}

	.achievements {
		display: flex;
		flex-direction: column;
	}

	.achievement {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5625rem 0;
		color: var(--text-tertiary);
	}

	.achievement + .achievement {
		border-top: 1px solid var(--border-subtle);
	}

	.achievement-dot {
		width: 7px;
		height: 7px;
		border-radius: var(--radius-full);
		flex-shrink: 0;
	}

	.achievement-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.0625rem;
		min-width: 0;
	}

	.achievement-name {
		font-size: 0.8438rem;
		font-weight: 540;
		color: var(--text-primary);
	}

	.achievement-when {
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	/* ── Apariencia ───────────────────────────────────────────────────── */
	.skin-list {
		display: flex;
		flex-direction: column;
		/* Aire entre filas: el hover y el active no se pegan entre sí */
		gap: 0.1875rem;
		overflow-y: auto;
		scrollbar-width: none;
	}

	.skin-list::-webkit-scrollbar {
		display: none;
	}

	/* Fade al filo mientras quede recorrido de scroll */
	.skin-list.fade {
		mask-image: linear-gradient(to bottom, #000 calc(100% - 40px), transparent);
		-webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 40px), transparent);
	}

	.skin-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		width: 100%;
		padding: 0.1875rem 0.375rem;
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		font: inherit;
		color: inherit;
		/* Ancla la confirmación superpuesta (ver .skin-confirm): al
		   activarse NADA re-fluye — la pastilla flota sobre la fila. */
		position: relative;
		transition: background 0.13s ease;
	}

	.skin-row:hover {
		background: var(--bg-secondary);
	}

	.skin-row.active {
		background: var(--accent-subtle);
	}

	.skin-main {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
		padding: 0.3125rem 0;
		border: none;
		background: transparent;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}

	.skin-thumb {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		flex-shrink: 0;
		border-radius: var(--radius-sm);
		background: var(--bg-tertiary);
		color: var(--text-tertiary);
		overflow: hidden;
	}

	.skin-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.skin-thumb.dashed {
		border: 1px dashed var(--border-light);
		background: transparent;
	}

	.skin-thumb.iconed {
		background: color-mix(in srgb, currentColor 10%, transparent);
	}

	.skin-name {
		flex: 1;
		font-size: 0.8438rem;
		font-weight: 550;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.skin-name.muted {
		color: var(--text-tertiary);
		font-weight: 500;
	}

	.skin-check {
		/* Slot reservado: la fila no crece al activarse */
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		flex-shrink: 0;
		color: var(--accent);
	}

	.skin-delete {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		flex-shrink: 0;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--text-tertiary);
		cursor: pointer;
		opacity: 0;
		transition: color 0.13s ease, background 0.13s ease, opacity 0.13s ease;
	}

	.skin-row:hover .skin-delete,
	.skin-delete:focus-visible {
		opacity: 1;
	}

	.skin-delete:hover {
		color: var(--color-error);
		background: color-mix(in srgb, var(--color-error) 10%, transparent);
	}

	.skin-confirm {
		/* Confirmación superpuesta anclada al borde DERECHO de la fila:
		   nunca empuja el layout ni desborda el panel (antes salía
		   disparada fuera de la lista, cortada). Vidrio oscuro acorde
		   al chrome — legible sobre cualquier fondo en ambos temas. */
		position: absolute;
		top: 50%;
		right: 0.25rem;
		transform: translateY(-50%);
		display: inline-flex;
		align-items: center;
		gap: 0.3125rem;
		padding: 0.25rem 0.3125rem;
		border-radius: var(--radius-full);
		background: rgba(24, 24, 28, 0.92);
		backdrop-filter: blur(10px) saturate(1.3);
		-webkit-backdrop-filter: blur(10px) saturate(1.3);
		box-shadow:
			inset 0 0 0 0.5px rgba(255, 255, 255, 0.16),
			0 4px 14px rgba(0, 0, 0, 0.28);
		z-index: 2;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.confirm-yes,
	.confirm-no {
		padding: 0.3125rem 0.5625rem;
		border: none;
		border-radius: var(--radius-full);
		font: inherit;
		font-size: 0.6875rem;
		font-weight: 600;
		cursor: pointer;
		transition: filter 0.13s ease, background 0.13s ease;
	}

	.confirm-yes:hover {
		filter: brightness(1.1);
	}

	.confirm-no:hover {
		background: rgba(255, 255, 255, 0.14);
	}

	.confirm-yes {
		background: var(--color-error);
		color: #fff;
	}

	.confirm-no {
		background: rgba(255, 255, 255, 0.09);
		color: var(--text-secondary);
	}

	.skin-value {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		white-space: nowrap;
	}

	.skin-chev {
		display: flex;
		align-items: center;
		color: var(--text-tertiary);
	}

	.skin-sep {
		height: 1px;
		margin: 0.75rem 0;
		background: var(--border-subtle);
	}


	/* ── Tablet: perfil + modo fijos arriba, detalle scrollea abajo ── */
	@media (max-width: 980px) {
		.sheet {
			grid-template-columns: 1fr;
			grid-template-rows: auto minmax(0, 1fr);
		}

		.portrait {
			overflow: visible;
			display: grid;
			grid-template-columns: minmax(0, auto) minmax(0, 1fr);
			gap: 0 2.5rem;
			align-items: start;
			padding: 0.25rem 0.25rem 1.25rem;
		}

		.portrait-side {
			display: flex;
			flex-direction: column;
		}

		.kicker.mid {
			margin-top: 0;
		}

		.portrait-coins {
			margin-top: 1rem;
		}

		.skin-row:not(:hover) .skin-delete {
			opacity: 1;
		}

		/* Apariencia en 2 columnas: 4 modelos visibles sin largota */
		.skin-list {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.25rem 0.875rem;
		}

		.portrait-head {
			flex-direction: column;
			align-items: center;
			gap: 0;
			text-align: center;
		}

		.portrait-frame :global(img),
		.portrait-frame :global(.avatar-wrap) {
			max-width: 96px;
		}

		.portrait-id {
			align-items: center;
			margin-top: 0.875rem;
		}

		.detail-wrap {
			border-left: none;
			border-top: 1px solid var(--border-subtle);
		}

		.detail {
			padding: 2rem 0.25rem 6.5rem;
		}

		.detail-cols {
			grid-template-columns: 1fr;
			gap: 2.75rem;
		}
	}

	@media (max-width: 640px) {
		.bond-head {
			flex-direction: column;
			gap: 0.25rem;
		}

		/* Teléfono: MISMA grid de tablet (avatar | MODO al lado) — el avatar
		   es ADAPTATIVO (clamp fluid): en teléfonos angostos encoge a 72px
		   y el MODO siempre cabe a la derecha. Solo si no cabe de verdad
		   (retrato horizontal extremo) caería abajo, nunca antes. */
		.portrait {
			gap: 0 1.125rem;
			padding-bottom: 1rem;
		}

		.portrait-frame :global(img),
		.portrait-frame :global(.avatar-wrap),
		.portrait-frame :global(.luna-avatar) {
			width: clamp(72px, 26vw, 96px) !important;
			height: clamp(72px, 26vw, 96px) !important;
		}

		.portrait-name {
			font-size: 1.1875rem;
		}

		.portrait-days {
			font-size: 0.7188rem;
		}

		.portrait-mood {
			padding: 0.25rem 0.5rem;
			font-size: 0.6875rem;
		}

		.mode-row {
			padding: 0.5625rem 0.125rem;
		}

		.mode-desc {
			font-size: 0.6875rem;
		}

		.detail {
			padding: 1.5rem 0.25rem 1.5rem;
		}
	}
</style>
