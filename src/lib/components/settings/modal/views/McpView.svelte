<script lang="ts">
	import { onMount } from 'svelte';
	import { mcpStore } from '$lib/stores/mcp.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { McpTransport } from '$lib/types/mcp';
	import { parseEnvLines, parseQuotedArgs } from '$lib/services/mcp/protocol';
	import '../modal-kit.css';

	// Gestión de servidores MCP (funcionalidad de utsuwa 0.15.0).
	// HTTP funciona en todos los runtimes (escritorio vía plugin de Tauri, web
	// vía proxy propio); stdio solo existe en el despliegue web con servidor —
	// como en 0.15.0, el selector de transporte lo oculta en escritorio.
	let showForm = $state(false);
	let editingId = $state<string | null>(null);
	let transport = $state<McpTransport>('http');
	let name = $state('');
	let url = $state('');
	let command = $state('');
	let args = $state('');
	let envText = $state('');
	let token = $state('');
	/** Tipo de auth HTTP (0.15.0): None o Bearer con token obligatorio. */
	let authType = $state<'none' | 'bearer'>('none');
	let injectAsUser = $state(false);
	let formError = $state('');

	/** stdio spawns processes server-side: solo el despliegue web lo ofrece. */
	let stdioAvailable = $state(false);
	onMount(async () => {
		// Web con servidor: el proxy de MCP existe solo si MCP_ENABLED optó in.
		try {
			const res = await fetch('/api/mcp/tools', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ servers: [] })
			});
			stdioAvailable = res.ok;
		} catch {
			stdioAvailable = false;
		}
		// Como en 0.15.0: la vista refresca herramientas (y re-sondea la
		// capacidad) al abrirse, sin recarga completa.
		void mcpStore.refreshTools();
	});

	const editing = $derived(editingId ? mcpStore.servers.find((s) => s.id === editingId) : null);

	function openAdd() {
		editingId = null;
		transport = 'http';
		name = '';
		url = '';
		command = '';
		args = '';
		envText = '';
		token = '';
		authType = 'none';
		injectAsUser = false;
		formError = '';
		showForm = true;
	}

	function openEdit(id: string) {
		const server = mcpStore.servers.find((s) => s.id === id);
		if (!server) return;
		editingId = id;
		transport = server.transport;
		name = server.name;
		url = server.url ?? '';
		command = server.command ?? '';
		args = (server.args ?? []).join(' ');
		envText = server.env
			? Object.entries(server.env)
					.map(([k, v]) => `${k}=${v}`)
					.join('\n')
			: '';
		token = server.auth?.type === 'bearer' ? server.auth.token : '';
		authType = server.auth?.type === 'bearer' ? 'bearer' : 'none';
		injectAsUser = server.injectResultsAsUser ?? false;
		formError = '';
		showForm = true;
	}

	function save() {
		const trimmedName = name.trim();
		if (!trimmedName) {
			formError = 'Ponle un nombre al servidor.';
			return;
		}
		if (transport === 'http') {
			const trimmedUrl = url.trim();
			if (!trimmedUrl) {
				formError = 'La URL del servidor es obligatoria.';
				return;
			}
			if (!/^https?:\/\//i.test(trimmedUrl)) {
				formError = 'La URL debe empezar por http:// o https://';
				return;
			}
			if (authType === 'bearer' && !token.trim()) {
				formError = 'El token es obligatorio para autenticación Bearer.';
				return;
			}
			const config = {
				name: trimmedName,
				transport: 'http' as const,
				url: trimmedUrl,
				auth: authType === 'bearer' ? ({ type: 'bearer', token: token.trim() } as const) : ({ type: 'none' } as const),
				injectResultsAsUser: injectAsUser,
				enabled: editing ? editing.enabled : true
			};
			if (editing) mcpStore.updateServer(editing.id, config);
			else mcpStore.addServer(config);
		} else {
			// stdio: el proxy hace fail-closed con MCP_STDIO_ALLOWED_COMMANDS.
			const trimmedCommand = command.trim();
			if (!trimmedCommand) {
				formError = 'El comando del servidor es obligatorio.';
				return;
			}
			const config = {
				name: trimmedName,
				transport: 'stdio' as const,
				command: trimmedCommand,
				args: parseQuotedArgs(args),
				env: envText.trim() ? parseEnvLines(envText) : undefined,
				injectResultsAsUser: injectAsUser,
				enabled: editing ? editing.enabled : true
			};
			if (editing) mcpStore.updateServer(editing.id, config);
			else mcpStore.addServer(config);
		}
		showForm = false;
	}

	function toggle(id: string) {
		mcpStore.toggleServer(id);
	}

	function remove(id: string) {
		mcpStore.removeServer(id);
		if (editingId === id) showForm = false;
	}
</script>

<div class="set-view">
	<header class="set-header">
		<h2>Herramientas (MCP)</h2>
		<p>Conecta servidores de herramientas que Luna puede usar al conversar.</p>
	</header>

	<!-- Capacidad (0.15.0): explica por qué nada funciona si el deployment
			tiene MCP apagado, y aclara el modo escritorio -->
	{#if mcpStore.capability === 'none'}
		<section class="set-section">
			<p class="cap-notice">
				<strong>MCP desactivado en este servidor</strong>
				<span>
					Quien administra este despliegue no habilitó MCP (se activa con
					<code>MCP_ENABLED=server</code>). No se enviará ninguna petición MCP.
				</span>
			</p>
		</section>
	{:else if mcpStore.capability === 'client'}
		<section class="set-section">
			<p class="cap-notice">
				<strong>Modo escritorio</strong>
				<span>Los servidores HTTP se conectan directo. Los comandos locales (stdio) solo existen en la versión web con servidor.</span>
			</p>
		</section>
	{/if}

	{#if mcpStore.serverEnabled}
	{#if mcpStore.servers.length === 0 && !showForm}
		<section class="set-section">
			<p class="empty">
				Aún no hay servidores. Conéctate a uno — por ejemplo Home Assistant o cualquier servidor
				MCP compatible — y sus herramientas quedarán disponibles para Luna.
			</p>
			<button class="set-btn" type="button" onclick={openAdd}>Añadir servidor</button>
		</section>
	{:else}
		<section class="set-section">
			{#each mcpStore.servers as server (server.id)}
				<div class="line">
					<span class="status" class:ok={server.enabled}></span>
					<span class="line-main">
						<span class="line-label">
							{server.name}
							{#if server.transport === 'http' && server.auth?.type === 'bearer'}<span class="badge">auth</span>{/if}
							<span class="badge">{server.transport === 'http' ? 'HTTP' : 'local'}</span>
						</span>
						<span class="line-url">{server.transport === 'http' ? server.url : `${server.command} ${(server.args ?? []).join(' ')}`}</span>
						{#if server.enabled && mcpStore.serverErrors.find((e) => e.serverId === server.id)}
							<span class="line-error">{mcpStore.serverErrors.find((e) => e.serverId === server.id)?.message}</span>
						{/if}
					</span>
					<button class="icon-btn" type="button" aria-label="Editar {server.name}" onclick={() => openEdit(server.id)}>
						<Icon name="code" size={12} />
					</button>
					<button class="set-switch" class:on={server.enabled} type="button" role="switch" aria-checked={server.enabled} aria-label="Activar {server.name}" onclick={() => toggle(server.id)}></button>
					<button class="icon-btn danger" type="button" aria-label="Quitar {server.name}" onclick={() => remove(server.id)}>
						<svg viewBox="0 0 384 512" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3l105.4 105.3c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>
					</button>
				</div>
			{/each}
			<div class="actions">
				<button class="set-btn" type="button" onclick={openAdd}>Añadir servidor</button>
				<button class="set-btn ghost" type="button" disabled={mcpStore.isLoadingTools} onclick={() => mcpStore.refreshTools()}>
					{mcpStore.isLoadingTools ? 'Buscando…' : 'Actualizar herramientas'}
				</button>
			</div>
		</section>
	{/if}

	{#if mcpStore.tools.length > 0}
		<hr class="set-divider" />
		<section class="set-section">
			<h3>Herramientas descubiertas</h3>
			<p class="section-lead">Lo que Luna puede hacer con tus servidores activos.</p>
			<div class="tools">
				{#each mcpStore.tools as tool (tool.serverId + tool.name)}
					<span class="tool">
						<span class="tool-name">{tool.name}</span>
						<span class="tool-server">{tool.serverName}</span>
						{#if tool.description}<span class="tool-desc">{tool.description}</span>{/if}
					</span>
				{/each}
			</div>
		</section>
	{:else if mcpStore.enabledServers.length > 0 && !mcpStore.isLoadingTools && mcpStore.serverErrors.length === 0}
		<hr class="set-divider" />
		<section class="set-section">
			<p class="section-lead">No hay herramientas aún. Revisa que tus servidores MCP estén corriendo.</p>
		</section>
	{:else if mcpStore.toolsError}
		<hr class="set-divider" />
		<section class="set-section">
			<p class="line-error">{mcpStore.toolsError}</p>
		</section>
	{/if}

	{#if showForm}
		<hr class="set-divider" />
		<section class="set-section form" aria-label={editing ? 'Editar servidor' : 'Nuevo servidor'}>
			<h3>{editing ? 'Editar servidor' : 'Nuevo servidor'}</h3>
			{#if stdioAvailable || editing?.transport === 'stdio'}
				<div class="seg" role="tablist" aria-label="Tipo de conexión">
					<button class="seg-btn" class:active={transport === 'http'} type="button" onclick={() => (transport = 'http')}>URL (HTTP)</button>
					<button class="seg-btn" class:active={transport === 'stdio'} type="button" onclick={() => (transport = 'stdio')}>Comando local</button>
				</div>
			{/if}
			<label class="field">
				<span>Nombre</span>
				<input type="text" bind:value={name} placeholder="Casa, Trabajo…" />
			</label>
			{#if transport === 'http'}
				<label class="field">
					<span>URL del servidor</span>
					<input type="url" bind:value={url} placeholder="http://homeassistant.local:8123/api/mcp" />
				</label>
				<div class="field">
					<span>Autenticación</span>
					<div class="seg" role="tablist" aria-label="Autenticación">
						<button class="seg-btn" class:active={authType === 'none'} type="button" onclick={() => (authType = 'none')}>Sin auth</button>
						<button class="seg-btn" class:active={authType === 'bearer'} type="button" onclick={() => (authType = 'bearer')}>Bearer</button>
					</div>
				</div>
				{#if authType === 'bearer'}
					<label class="field">
						<span>Token de acceso</span>
						<input type="password" bind:value={token} placeholder="Token de larga duración" autocomplete="off" />
					</label>
				{/if}
			{:else}
				<label class="field">
					<span>Comando</span>
					<input type="text" bind:value={command} placeholder="npx" />
				</label>
				<label class="field">
					<span>Argumentos <em>(opcional)</em></span>
					<input type="text" bind:value={args} placeholder="-y @modelcontextprotocol/server-everything" />
				</label>
				<label class="field">
					<span>Variables de entorno <em>(opcional, una KEY=valor por línea)</em></span>
					<textarea class="env-area" rows="3" bind:value={envText} placeholder="# API_KEY=abc123"></textarea>
				</label>
			{/if}
			<div class="line">
				<span class="line-label">Resultados como mensaje</span>
				<span class="line-desc">Ayuda a modelos locales que ignoran el rol de herramienta</span>
				<button class="set-switch" class:on={injectAsUser} type="button" role="switch" aria-checked={injectAsUser} aria-label="Resultados como mensaje" onclick={() => (injectAsUser = !injectAsUser)}></button>
			</div>
			{#if formError}<p class="line-error">{formError}</p>{/if}
			<div class="actions">
				<button class="set-btn" type="button" onclick={save}>{editing ? 'Guardar' : 'Conectar'}</button>
				<button class="set-btn ghost" type="button" onclick={() => (showForm = false)}>Cancelar</button>
			</div>
		</section>
	{/if}
	{/if}
</div>

<style>
	.empty {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		max-width: 34rem;
		margin: 0 0 0.875rem;
	}

	/* Aviso de capacidad (0.15.0): deshabilitado / modo escritorio */
	.cap-notice {
		display: flex;
		flex-direction: column;
		gap: 0.1875rem;
		margin: 0;
	}

	.cap-notice strong {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.cap-notice span {
		font-size: 0.7813rem;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.cap-notice code {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.7188rem;
		padding: 0.0625rem 0.3125rem;
		border-radius: 5px;
		background: var(--accent-subtle);
	}

	.badge {
		display: inline-block;
		padding: 0.0313rem 0.375rem;
		margin-left: 0.375rem;
		border-radius: 999px;
		background: var(--accent-subtle);
		font-size: 0.625rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: var(--text-secondary);
		vertical-align: 1px;
	}

	.tool-server {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--text-secondary);
		opacity: 0.75;
		flex-shrink: 0;
		padding: 0.0313rem 0.4375rem;
		border-radius: 999px;
		background: var(--accent-subtle);
	}

	.line {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5625rem 0.25rem;
		min-width: 0;
	}

	.status {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--border-subtle);
		flex-shrink: 0;
	}

	.status.ok {
		background: var(--color-success, #22c55e);
		box-shadow: 0 0 6px rgba(34, 197, 94, 0.45);
	}

	.line-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.0625rem;
	}

	.line-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.line-url {
		font-size: 0.75rem;
		color: var(--text-secondary);
		opacity: 0.65;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.line-error {
		font-size: 0.75rem;
		color: var(--color-error);
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		flex-shrink: 0;
		transition: background 0.12s ease, color 0.12s ease;
	}

	.icon-btn:hover {
		background: var(--accent-subtle);
		color: var(--text-primary);
	}

	.icon-btn.danger:hover {
		color: var(--color-error);
	}

	.actions {
		display: flex;
		gap: 0.625rem;
		padding: 0.75rem 0.25rem 0;
		flex-wrap: wrap;
	}

	.set-btn.ghost {
		opacity: 0.75;
	}

	.tools {
		display: flex;
		flex-direction: column;
	}

	.tool {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		padding: 0.4375rem 0.25rem;
		min-width: 0;
	}

	.tool + .tool {
		border-top: 1px solid var(--accent-subtle);
	}

	.tool-name {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-primary);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		flex-shrink: 0;
	}

	.tool-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
		opacity: 0.7;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3125rem;
	}

	.field span {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.field span em {
		font-style: normal;
		opacity: 0.6;
	}

	.field input {
		padding: 0.5rem 0.6875rem;
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		font: inherit;
		font-size: 0.8125rem;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.field input:focus {
		border-color: var(--accent);
	}

	.seg {
		display: inline-flex;
		gap: 0.25rem;
		padding: 0.25rem;
		border-radius: 10px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		align-self: flex-start;
	}

	.seg-btn {
		padding: 0.3125rem 0.75rem;
		border: none;
		border-radius: 7px;
		background: transparent;
		font: inherit;
		font-size: 0.7813rem;
		font-weight: 500;
		color: var(--text-secondary);
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease;
	}

	.seg-btn:hover {
		color: var(--text-primary);
	}

	.seg-btn.active {
		background: var(--bg-primary);
		color: var(--text-primary);
		font-weight: 600;
	}

	.env-area {
		resize: vertical;
		min-height: 2.75rem;
		padding: 0.5rem 0.6875rem;
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		font: inherit;
		font-size: 0.7813rem;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.env-area:focus {
		border-color: var(--accent);
	}

	.section-lead {
		font-size: 0.75rem;
		color: var(--text-secondary);
		margin: 0 0 0.25rem;
	}

	@media (max-width: 640px) {
		.line {
			flex-wrap: wrap;
		}

		.line-main {
			flex-basis: 100%;
			order: 2;
			padding-left: 1.0625rem;
		}

		.status,
		.icon-btn,
		.set-switch {
			order: 1;
		}

		.line .set-switch {
			margin-left: auto;
		}
	}
</style>
