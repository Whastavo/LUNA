<script lang="ts">
	import { accountStore } from '$lib/stores/account.svelte';
	import { COIN_PACKS, CREDIT_PACKS } from '$lib/config/economy';
	import { nextMilestone } from '$lib/stores/daily-reward-logic';
	import KitRow from '../kit.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { fadeFast } from '$lib/utils/motion';
	import '../modal-kit.css';

	const balance = $derived(accountStore.coins);
	const daily = $derived(accountStore.dailyCheck);
	const streak = $derived(accountStore.daily.streak);
	const credits = $derived(accountStore.credits);

	let flash = $state<string | null>(null);

	function flashMsg(msg: string) {
		flash = msg;
		setTimeout(() => (flash = null), 2200);
	}

	function claim() {
		const result = accountStore.claimDaily();
		if (result) {
			const total = result.coins + result.milestoneBonus;
			flashMsg(
				result.milestoneBonus > 0
					? `+${total} lunas · ¡hito de racha! 🌙`
					: `+${total} lunas ganadas 🌙`
			);
		}
	}

	function topUp(id: string) {
		if (accountStore.buyCoinPack(id)) {
			flashMsg('Recarga agregada a tu saldo');
		}
	}

	function buyCredits(id: string) {
		if (accountStore.buyCreditPack(id)) {
			flashMsg('Créditos agregados');
		}
	}
</script>

<div class="set-view">
	<header class="set-header">
		<h2>Lunas</h2>
		<p>La moneda de la casa: outfits, accesorios, animaciones y colecciones.</p>
	</header>

	<!-- Saldo -->
	<section class="balance">
		<span class="balance-label">Tu saldo</span>
		<span class="balance-amount">{balance.toLocaleString('es')}</span>
		<span class="balance-credits">{credits} créditos premium</span>
		{#if flash}
			<span class="flash" transition:fadeFast>{flash}</span>
		{/if}
	</section>

	<hr class="set-divider" />

	<!-- Recompensa diaria (funcional) -->
	<section class="set-section">
		<h3>Recompensa diaria</h3>
		<div class="daily set-glass">
			<div class="daily-main">
				<span class="daily-amount">
					<Icon name="gift" size={15} />
					{daily.amount} lunas hoy
				</span>
				<span class="daily-streak">
					Racha de {streak} {streak === 1 ? 'día' : 'días'} · próxima meta: día {nextMilestone(streak)}
				</span>
			</div>
			{#if daily.canClaim}
				<button class="set-btn" type="button" onclick={claim}>Reclamar</button>
			{:else}
				<span class="daily-done">
					<Icon name="check" size={12} />
					Reclamado hoy
				</span>
			{/if}
		</div>
		<KitRow row={{ title: 'Momentos especiales', description: 'Ciertos acontecimientos con Luna traen lunas', value: 'Variable' }} />
	</section>

	<hr class="set-divider" />

	<!-- Recargar lunas -->
	<section class="set-section">
		<h3>Recargar lunas</h3>
		<div class="packs">
			{#each COIN_PACKS as pack (pack.id)}
				<button class="pack" type="button" onclick={() => topUp(pack.id)}>
					{#if pack.badge}<span class="pack-badge">{pack.badge}</span>{/if}
					<span class="pack-amount">
						{pack.coins.toLocaleString('es')}{#if pack.bonusCoins}<em>&nbsp;+{pack.bonusCoins}</em>{/if}
					</span>
					<span class="pack-name">{pack.name}</span>
					<span class="pack-price">{pack.priceLabel}</span>
				</button>
			{/each}
		</div>
	</section>

	<hr class="set-divider" />

	<!-- Créditos premium -->
	<section class="set-section">
		<h3>Créditos premium</h3>
		<p class="section-lead">Minutos de conversación con los modelos de voz y chat más avanzados.</p>
		<div class="packs credits">
			{#each CREDIT_PACKS as pack (pack.id)}
				<button class="pack" type="button" onclick={() => buyCredits(pack.id)}>
					<span class="pack-amount">{pack.credits}</span>
					<span class="pack-name">{pack.name}</span>
					<span class="pack-price">{pack.priceLabel}</span>
				</button>
			{/each}
		</div>
		<p class="set-note">Demostración de interfaz: las recargas agregan saldo localmente, sin cobro real todavía.</p>
	</section>
</div>

<style>
	.balance {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.1875rem;
		align-items: flex-start;
	}

	.balance-label {
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-tertiary);
	}

	.balance-amount {
		font-size: 2.25rem;
		font-weight: 700;
		letter-spacing: -0.025em;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	.balance-credits {
		font-size: 0.7813rem;
		color: var(--text-secondary);
	}

	.flash {
		position: absolute;
		top: 0.75rem;
		right: 1rem;
		padding: 0.3125rem 0.6875rem;
		border-radius: var(--radius-full);
		background: var(--accent);
		color: var(--accent-contrast);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.daily {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.875rem 1.25rem;
	}

	.daily-main {
		display: flex;
		flex-direction: column;
		gap: 0.1875rem;
		min-width: 0;
	}

	.daily-amount {
		display: inline-flex;
		align-items: center;
		gap: 0.4375rem;
		font-size: 0.9375rem;
		font-weight: 640;
		color: var(--text-primary);
	}

	.daily-amount :global(svg) {
		color: var(--accent);
	}

	.daily-streak {
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	.daily-done {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.7813rem;
		color: var(--color-success);
		white-space: nowrap;
	}

	.packs {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.625rem;
		padding: 0.25rem 0 0.5rem;
	}

	.packs.credits {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.pack {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
		padding: 0.75rem 0.875rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		background: var(--bg-secondary);
		font: inherit;
		color: inherit;
		cursor: pointer;
		transition: border-color 0.14s ease, background 0.14s ease, transform 0.14s ease;
	}

	.pack:hover {
		border-color: var(--border-light);
		background: var(--bg-tertiary);
		transform: translateY(-1px);
	}

	.pack:active {
		transform: scale(0.98);
	}

	.pack-badge {
		position: absolute;
		top: -0.5rem;
		right: 0.625rem;
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-full);
		background: var(--accent);
		color: var(--accent-contrast);
		font-size: 0.625rem;
		font-weight: 640;
		letter-spacing: 0.04em;
	}

	.pack-amount {
		font-size: 0.9375rem;
		font-weight: 640;
		color: var(--text-primary);
	}

	.pack-amount em {
		font-style: normal;
		font-size: 0.75rem;
		font-weight: 590;
		color: var(--color-success);
	}

	.pack-name {
		font-size: 0.7188rem;
		color: var(--text-tertiary);
	}

	.pack-price {
		font-size: 0.7813rem;
		color: var(--text-secondary);
	}

	@media (max-width: 767px) {
		.packs {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.packs.credits {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
