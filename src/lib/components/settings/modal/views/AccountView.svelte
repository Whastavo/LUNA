<script lang="ts">
	import { accountStore } from '$lib/stores/account.svelte';
	import { characterStore } from '$lib/stores/character.svelte';
	import { planAccentVar } from '$lib/config/economy';
	import Icon from '$lib/components/ui/Icon.svelte';
	import UserAvatar from '../UserAvatar.svelte';
	import '../modal-kit.css';

	// Perfil del usuario (no del personaje). La sesión real llegará después;
	// mientras tanto el nombre vive en este dispositivo.
	const USER_KEY = 'luna-user-name';
	function initialName(): string {
		if (typeof localStorage !== 'undefined') {
			return localStorage.getItem(USER_KEY) ?? 'Gustavo SA';
		}
		return 'Gustavo SA';
	}
	const userName = $state(initialName());
	let editing = $state(false);
	let draft = $state('');
	let saved = $state(false);

	function saveName() {
		const trimmed = draft.trim();
		if (trimmed && trimmed !== userName) {
			try {
				localStorage.setItem(USER_KEY, trimmed);
			} catch {
				/* sin persistencia disponible */
			}
		}
		editing = false;
		saved = true;
		setTimeout(() => (saved = false), 1600);
	}

	function startEdit() {
		draft = userName;
		editing = true;
	}

	const memberSince = $derived(
		new Date(characterStore.state.firstMet).toLocaleDateString('es', {
			month: 'long',
			year: 'numeric'
		})
	);
</script>

<div class="set-view account-main">
		<header class="set-header">
			<h2>Cuenta</h2>
			<p>Tu perfil, tu sesión y cómo te contactamos.</p>
		</header>

		<!-- Perfil directo sobre el vidrio: sin caja, como la referencia -->
		<section class="profile">
		<span class="pfp-wrap">
			<UserAvatar size={78} />
			<span class="pfp-cam" aria-hidden="true"><Icon name="camera" size={14} /></span>
		</span>
			<div class="pfp-info">
				{#if editing}
					<input
						class="name-input"
						bind:value={draft}
						onblur={saveName}
						onkeydown={(e) => e.key === 'Enter' && saveName()}
						maxlength={24}
						aria-label="Tu nombre"
					/>
				{:else}				<span class="pfp-name">
									{userName}
									<span class="verified" title="Cuenta verificada" aria-label="Cuenta verificada">
										<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
											<path d="M12 1.5l2.6 2 3.3-.3 1 3.1 2.8 1.8-1.2 3 1.2 3-2.8 1.8-1 3.1-3.3-.3-2.6 2-2.6-2-3.3.3-1-3.1L2.3 15l1.2-3-1.2-3 2.8-1.8 1-3.1 3.3.3z" />
											<path d="M10.7 14.9l-2.3-2.3 1.1-1.1 1.2 1.2 3.8-3.8 1.1 1.1z" fill="#fff" />
										</svg>
									</span>
								</span>
				{/if}
				<span class="pfp-mail">whastavo@mail.com</span>
				<span class="pfp-meta">
					<span class="plan-tag" style={`color: ${planAccentVar(accountStore.plan)}`}>
						<Icon name="crown" size={10} />
						Plan {accountStore.planName}
					</span>
					<span class="online-tag"><span class="dot"></span> En línea</span>
				</span>
				<span class="pfp-since">Miembro desde {memberSince}</span>
			</div>
			<button class="edit-btn" type="button" onclick={editing ? saveName : startEdit}>
				<Icon name="pencil" size={12} />
				{editing ? 'Guardar' : 'Editar perfil'}
			</button>		{#if saved}<span class="saved">Guardado</span>{/if}
	</section>

	<!-- Separación susurrada entre bloques, como la referencia -->
	<hr class="set-divider" />

		<!-- Información personal -->
		<section class="set-section">
			<h3>Información personal</h3>
			<div class="icon-rows">
				<button class="irow" type="button" onclick={startEdit}>
					<Icon name="user" size={15} />
					<span class="irow-label">Nombre</span>
					<span class="irow-value">{userName}</span>
					<Icon name="chevron-right" size={11} />
				</button>
				<div class="irow">
					<Icon name="file-text" size={15} />
					<span class="irow-label">Correo electrónico</span>
					<span class="irow-value">whastavo@mail.com</span>
					<Icon name="chevron-right" size={11} />
				</div>
				<div class="irow">
					<Icon name="globe" size={15} />
					<span class="irow-label">Idioma</span>
					<span class="irow-value">Español (Latam)</span>
					<Icon name="chevron-right" size={11} />
				</div>
				<div class="irow">
					<Icon name="clock" size={15} />
					<span class="irow-label">Zona horaria</span>
					<span class="irow-value">(GMT-05:00) Lima</span>
					<Icon name="chevron-right" size={11} />
				</div>
			</div>
		</section>

	<hr class="set-divider" />

		<!-- Cuenta y seguridad -->
		<section class="set-section">
			<h3>Cuenta y seguridad</h3>
			<div class="icon-rows">
				<div class="irow">
					<Icon name="link" size={15} />
					<span class="irow-label">Cuenta de Google</span>
					<span class="pill">Conectada</span>
					<Icon name="chevron-right" size={11} />
				</div>
				<div class="irow">
					<Icon name="lock" size={15} />
					<span class="irow-label">Contraseña</span>
					<span class="irow-value">Última hace 3 meses</span>
					<Icon name="chevron-right" size={11} />
				</div>
				<div class="irow">
					<Icon name="monitor" size={15} />
					<span class="irow-label">Dispositivos conectados</span>
					<span class="irow-value">2 dispositivos</span>
					<Icon name="chevron-right" size={11} />
				</div>
				<button class="irow" type="button" title="Disponible al conectar tu cuenta">
					<Icon name="external-link" size={15} />
					<span class="irow-label danger">Cerrar sesión</span>
					<span class="irow-value">Este dispositivo</span>
					<Icon name="chevron-right" size={11} />
				</button>
			</div>
		</section>

	</div>

<style>
	.account-main {
		max-width: none;
		margin: 0;
		padding: 2rem 2.5rem 2.75rem;
		display: flex;
		flex-direction: column;
		gap: 1.875rem;
	}

	/* Perfil: directo sobre el vidrio, sin tarjeta */
	.profile {
		position: relative;
		display: flex;
		align-items: center;
		gap: 1.125rem;
		padding: 0.25rem 0.25rem 0.5rem;
	}

	.pfp-wrap {
		position: relative;
		flex-shrink: 0;
		/* Anillo de 4px con gradiente del accent — la receta del retrato de
		   Luna. En círculo el piso sube a 25%: sin el piso, el gradiente
		   moría abajo y el anillo se veía cortado. */
		border-radius: var(--radius-full);
		padding: 4px;
		background: linear-gradient(
			165deg,
			color-mix(in srgb, var(--accent) 45%, transparent),
			color-mix(in srgb, var(--accent) 25%, transparent) 70%
		);
		box-shadow: var(--shadow-md);
	}

	.pfp-cam {
		position: absolute;
		/* Dentro de la foto (esquina inferior derecha): sobre el anillo
		   flotaba a medias y chocaba con el texto de al lado */
		right: 5px;
		bottom: 5px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: var(--radius-full);
		/* Vidrio oscuro legible sobre cualquier foto, claro u oscuro */
		background: rgba(20, 20, 24, 0.72);
		-webkit-backdrop-filter: blur(6px);
		backdrop-filter: blur(6px);
		border: 1px solid rgba(255, 255, 255, 0.28);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
		color: rgba(255, 255, 255, 0.92);
	}

	.pfp-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
		flex: 1;
	}

	.pfp-name {
		display: inline-flex;
		align-items: center;
		gap: 0.4375rem;
		font-size: 1.125rem;
		font-weight: 660;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	.verified {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: #3b82f6; /* azul verificado, como la referencia */
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
	}

	.name-input {
		width: 180px;
		padding: 0.125rem 0.375rem;
		margin-left: -0.375rem;
		border: 1px solid var(--accent);
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
		font: inherit;
		font-size: 1.0625rem;
		font-weight: 640;
		color: var(--text-primary);
	}

	.name-input:focus {
		outline: none;
	}

	.pfp-mail {
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.pfp-meta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.1875rem;
	}

	.plan-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.3125rem;
		padding: 0.1875rem 0.5625rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-full);
		background: var(--bg-secondary);
		font-size: 0.6875rem;
		font-weight: 620;
	}

	.online-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.3125rem;
		padding: 0.1875rem 0.5625rem;
		border-radius: var(--radius-full);
		background: color-mix(in srgb, var(--color-success) 12%, transparent);
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-success);
	}

	.dot {
		width: 5px;
		height: 5px;
		border-radius: var(--radius-full);
		background: var(--color-success);
	}

	.pfp-since {
		font-size: 0.7188rem;
		color: var(--text-tertiary);
	}

	.edit-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4375rem;
		padding: 0.5rem 0.9375rem;
		border: 1px solid var(--border-light);
		border-radius: var(--radius-full);
		background: transparent;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 590;
		color: var(--text-primary);
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.15s ease;
	}

	.edit-btn:hover {
		background: color-mix(in srgb, var(--text-primary) 5%, transparent);
	}

	.saved {
		position: absolute;
		top: 0.75rem;
		right: 0.875rem;
		font-size: 0.75rem;
		color: var(--color-success);
	}

	/* Filas con ícono */
	.icon-rows {
		display: flex;
		flex-direction: column;
	}

	.irow {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.6875rem 0.25rem;
		border: none;
		background: transparent;
		font: inherit;
		text-align: left;
		color: inherit;
		cursor: default;
		transition: background 0.12s ease;
	}

	button.irow {
		cursor: pointer;
	}

	button.irow:hover {
		background: color-mix(in srgb, var(--text-primary) 4%, transparent);
		border-radius: var(--radius-md);
	}

	.irow :global(svg:first-child) {
		color: var(--text-tertiary);
		flex-shrink: 0;
	}

	.irow :global(svg:last-child) {
		color: var(--text-tertiary);
		opacity: 0.6;
		flex-shrink: 0;
	}

	.irow-label {
		flex: 1;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.irow-label.danger {
		color: var(--color-error);
	}

	.irow-value {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.pill {
		padding: 0.1875rem 0.5625rem;
		border-radius: var(--radius-full);
		background: color-mix(in srgb, var(--color-success) 14%, transparent);
		font-size: 0.6875rem;
		font-weight: 620;
		color: var(--color-success);
	}


	/* Teléfonos: perfil compacto, chips en una línea sin encimar */
	@media (max-width: 520px) {
		.account-main {
			padding: 1.5rem 1.25rem 1.5rem;
			gap: 1.5rem;
		}

		/* Perfil en dos columnas REALES en teléfono también: avatar grande
		   a la izquierda y los datos rodeándolo a la derecha (como la
		   referencia). El flex-wrap apilaba todo — la grid garantiza la
		   composición en cualquier ancho. */
		.profile {
			display: grid;
			grid-template-columns: 72px minmax(0, 1fr);
			gap: 0.625rem 1rem;
			align-items: center;
			padding: 1.125rem;
		}

		.pfp-wrap {
			width: 84px;
			height: 84px;
		}

		/* El avatar LLENA el content-box del wrap: el anillo queda de 4px
		   uniformes en todo el círculo. Forzarle px fijos dejaba gradiente
		   sobrante en un lado — el anillo “deformado”. */
		.pfp-wrap :global(.user-avatar) {
			width: 100% !important;
			height: 100% !important;
		}



		.pfp-cam {
			width: 27px;
			height: 27px;
			right: 4px;
			bottom: 4px;
		}

		.pfp-info {
			min-width: 0;
		}

		.pfp-mail {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.pfp-meta {
			flex-wrap: wrap;
			gap: 0.375rem;
		}

		.edit-btn {
			grid-column: 1 / -1;
			margin-left: 0;
			align-self: auto;
			justify-content: center;
			padding: 0.4375rem 0.8125rem;
		}

		/* Los valores caben: se recortan con elipsis, jamás fuera de la card */
		.irow {
			gap: 0.5rem;
		}

		.irow-value {
			flex-shrink: 1;
			min-width: 0;
			max-width: 48%;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.irow {
			gap: 0.5rem;
		}

		.irow-value {
			max-width: 46%;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}
</style>
