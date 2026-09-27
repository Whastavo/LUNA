<script lang="ts">
	import { characterStore } from '$lib/stores/character.svelte';
	import { Icon } from '$lib/components/ui';
	import { settingsModal } from '$lib/stores/settings-modal.svelte';
	import { pop, fadeFast } from '$lib/utils/motion';

	interface Props {
		overlay?: boolean;
	}

	let { overlay = false }: Props = $props();
	let isExpanded = $state(false);

	const charState = $derived(characterStore.state);
	const moodInfo = $derived(characterStore.moodInfo);
	const affectionPercent = $derived(characterStore.affectionPercent);
	const isCompanionMode = $derived(characterStore.appMode === 'companion');

	// Stats config with colors for the vertical bars
	const datingStats = $derived([
		{ key: 'affection', label: 'Amor', icon: 'heart', value: affectionPercent, color: 'var(--stat-affection)' },
		{ key: 'trust', label: 'Confianza', icon: 'shield', value: charState.trust, color: 'var(--stat-trust)' },
		{ key: 'intimacy', label: 'Intimidad', icon: 'sparkles', value: charState.intimacy, color: 'var(--stat-intimacy)' },
		{ key: 'comfort', label: 'Comodidad', icon: 'home', value: charState.comfort, color: 'var(--stat-comfort)' },
		{ key: 'energy', label: 'Energía', icon: 'zap', value: charState.energy, color: 'var(--stat-energy)' },
		{ key: 'respect', label: 'Respeto', icon: 'award', value: charState.respect, color: 'var(--stat-respect)' }
	]);

	const companionStats = $derived([
		{ key: 'energy', label: 'Energía', icon: 'zap', value: charState.energy, color: 'var(--stat-energy)' },
		{ key: 'chats', label: 'Chats', icon: 'message-circle', value: Math.min(charState.totalInteractions, 100), color: 'var(--color-success)' }
	]);
</script>

{#if overlay}
	<!-- Overlay mode: compact circular button -->
	<div class="overlay-status-wrapper">
		{#if isExpanded}
			<div
				class="overlay-expanded-panel glass-panel"
				transition:pop={{ base: 'translateX(-50%)', y: 10, duration: 220 }}
				class:high-affection={!isCompanionMode && charState.affection > 500}
			>
				<div class="status-details">
					<div class="stat-bars" class:companion-mode={isCompanionMode}>
						{#each isCompanionMode ? companionStats : datingStats as stat, i}
							<div class="stat-bar-wrapper" style="--delay: {i}; --bar-color: {stat.color}">
								<div class="stat-icon">
									<Icon name={stat.icon} size={14} />
								</div>
								<span class="stat-label">{stat.label}</span>
								<div class="stat-bar-track">
									<div class="stat-bar-fill" style="width: {stat.value}%"></div>
								</div>
								<span class="stat-value">{Math.round(stat.value)}</span>
							</div>
						{/each}
					</div>

					{#if !isCompanionMode}
						<div class="quick-stats">
							<div class="quick-stat">
								<Icon name="calendar" size={11} />
								<span>{charState.daysKnown}d</span>
							</div>
							<div class="quick-stat">
								<Icon name="message-circle" size={11} />
								<span>{charState.totalInteractions}</span>
							</div>
							{#if charState.currentStreak > 1}
								<div class="quick-stat streak">
									<Icon name="flame" size={11} />
									<span>{charState.currentStreak}</span>
								</div>
							{/if}
						</div>
					{:else if charState.currentStreak > 1}
						<div class="quick-stats">
							<div class="quick-stat streak">
								<Icon name="flame" size={11} />
								<span>{charState.currentStreak} días seguidos</span>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<button
			class="overlay-status-btn glass-chip"
			onclick={() => isExpanded = !isExpanded}
			aria-label={isExpanded ? 'Contraer estado' : 'Mostrar estado'}
			title={isExpanded ? 'Contraer estado' : 'Mostrar estado'}
			style="--mood-color: {moodInfo.color}"
		>
			{#key isExpanded}
				<span class="icon-inner" in:fadeFast={{ duration: 150 }}>
					{#if isExpanded}
						<Icon name="x" size={20} />
					{:else}
						<Icon name={moodInfo.icon} size={20} />
					{/if}
				</span>
			{/key}
		</button>
	</div>
{:else}
	<!-- Standard mode: full status panel -->
	<div
		class="status-container glass-chip"
		class:expanded={isExpanded}
		class:high-affection={!isCompanionMode && charState.affection > 500}
	>
		<div class="status-title">
			<span class="title-icon" style="color: {moodInfo.color}"><Icon name="heart" size={16} /></span>
			<span class="title-label">Estado de conexión</span>
			<span class="title-mood">{moodInfo.description}</span>
		</div>
		{#if isExpanded}
			<div class="status-details" transition:pop={{ duration: 200, y: 8 }}>
				<div class="stat-bars" class:companion-mode={isCompanionMode}>
					{#each isCompanionMode ? companionStats : datingStats as stat, i}
						<div class="stat-bar-wrapper" style="--delay: {i}; --bar-color: {stat.color}">
							<div class="stat-icon">
								<Icon name={stat.icon} size={14} />
							</div>
							<span class="stat-label">{stat.label}</span>
							<div class="stat-bar-track">
								<div class="stat-bar-fill" style="width: {stat.value}%"></div>
							</div>
							<span class="stat-value">{Math.round(stat.value)}</span>
						</div>
					{/each}
				</div>

				{#if !isCompanionMode}
					<div class="quick-stats">
						<div class="quick-stat">
							<Icon name="calendar" size={11} />
							<span>{charState.daysKnown}d</span>
						</div>
						<div class="quick-stat">
							<Icon name="message-circle" size={11} />
							<span>{charState.totalInteractions}</span>
						</div>
						{#if charState.currentStreak > 1}
							<div class="quick-stat streak">
								<Icon name="flame" size={11} />
								<span>{charState.currentStreak}</span>
							</div>
						{/if}
						<button type="button" class="quick-stat profile-link" onclick={() => settingsModal.show('luna')}>
							<span>Perfil</span>
							<Icon name="arrow-right" size={11} />
						</button>
					</div>
				{:else if charState.currentStreak > 1}
					<div class="quick-stats">
						<div class="quick-stat streak">
							<Icon name="flame" size={11} />
							<span>{charState.currentStreak} day streak</span>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<button class="status-toggle" onclick={() => isExpanded = !isExpanded}>
			<span class="mood-icon" style="color: {moodInfo.color}">
				<Icon name={isExpanded ? 'chevron-down' : 'chevron-up'} size={16} />
			</span>
			<span class="mood-label">{isExpanded ? 'Ocultar' : 'Ver detalle'}</span>
			<span class="chevron">
				<Icon name="arrow-right" size={14} />
			</span>
		</button>
	</div>
{/if}

<style>
	.status-container {
		position: fixed;
		bottom: 10.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 35;
		width: min(560px, calc(100vw - 2rem));
		border-radius: 20px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		color: var(--chrome-text);
	}

	.status-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.85rem 1.1rem 0.35rem;
	}

	.title-icon {
		display: flex;
	}

	.title-label {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--chrome-text);
		text-shadow: 0 1px 2px var(--chrome-text-shadow);
	}

	.title-mood {
		margin-left: auto;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--chrome-text-dim);
	}

	.status-container.high-affection {
		box-shadow: 0 0 0 1px var(--stat-affection), var(--shadow-sm);
	}

	/* Toggle Button */
	.status-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.55rem 1.1rem 0.7rem;
		background: transparent;
		border: none;
		cursor: pointer;
		color: rgba(255, 255, 255, 0.85);
		font-family: inherit;
		transition: background 0.15s;
	}

	.mood-icon {
		display: flex;
		flex-shrink: 0;
	}

	.mood-label {
		font-size: 0.78rem;
		font-weight: 500;
		color: var(--chrome-text-dim);
		text-align: left;
	}

	.chevron {
		display: flex;
		flex-shrink: 0;
		margin-left: auto;
		opacity: 0.8;
		color: var(--chrome-text-dim);
	}

	.status-toggle:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	/* Expanded Content */
	.status-details {
		padding: 0.5rem 1.1rem 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* Horizontal stat bars in a 2-column grid (like the reference layout) */
	.stat-bars {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.65rem 1.5rem;
	}

	.stat-bars.companion-mode {
		grid-template-columns: 1fr;
	}

	.stat-bar-wrapper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		animation: slideUp 0.3s ease-out backwards;
		animation-delay: calc(var(--delay) * 40ms);
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.stat-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		border-radius: var(--radius-full);
		color: var(--bar-color);
		background: color-mix(in srgb, var(--bar-color) 18%, transparent);
	}

	.stat-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--chrome-text);
		width: 5rem;
		flex-shrink: 0;
	}

	.stat-bar-track {
		flex: 1;
		height: 7px;
		background: var(--chrome-wash-strong);
		border-radius: var(--radius-full);
		position: relative;
		overflow: hidden;
	}

	.stat-bar-fill {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		background: var(--bar-color);
		border-radius: var(--radius-full);
		transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.stat-value {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--chrome-text);
		font-variant-numeric: tabular-nums;
		width: 2rem;
		text-align: right;
		flex-shrink: 0;
	}

	@media (max-width: 560px) {
		.stat-bars {
			grid-template-columns: 1fr;
		}
	}

	/* Quick Stats */
	.quick-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		justify-content: center;
	}

	.quick-stat {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--chrome-text-dim);
		padding: 0.3rem 0.5rem;
		background: var(--chrome-wash);
		border-radius: var(--radius-full);
	}

	.quick-stat.streak {
		color: var(--color-warning);
		background: color-mix(in srgb, var(--color-warning) 12%, transparent);
	}

	.quick-stat.profile-link {
		color: var(--chrome-text);
		text-decoration: none;
		background: var(--chrome-wash-strong);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.quick-stat.profile-link:hover {
		background: var(--chrome-wash);
	}

	/* Overlay mode: compact circular button */
	.overlay-status-wrapper {
		position: relative;
	}

	.overlay-status-btn {
		width: 48px;
		height: 48px;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
		position: relative;
		overflow: hidden;
		color: var(--chrome-text);
	}

	.overlay-status-btn:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
	}

	.overlay-status-btn:active {
		transform: translateY(0) scale(0.96);
	}

	.overlay-status-btn .icon-inner {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--mood-color, var(--text-primary));
	}

	/* Expanded panel floating above the controls, centered in viewport */
	.overlay-expanded-panel {
		position: fixed;
		bottom: 5.5rem;
		left: 50%;
		transform: translateX(-50%);
		border-radius: var(--radius-lg);
		white-space: nowrap;
	}

	.overlay-expanded-panel.high-affection {
		box-shadow: 0 0 0 1px var(--stat-affection), var(--shadow-lg);
	}
</style>
