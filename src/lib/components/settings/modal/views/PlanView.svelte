<script lang="ts">
	import { accountStore } from '$lib/stores/account.svelte';
	import { PLANS, planAccentVar } from '$lib/config/economy';
	import KitRow from '../kit.svelte';
	import '../modal-kit.css';

	const plan = $derived(PLANS.find((p) => p.id === accountStore.plan) ?? PLANS[0]);

	function choose(id: (typeof PLANS)[number]['id']) {
		accountStore.setPlan(id);
	}
</script>

<div class="set-view">
	<header class="set-header">
		<h2>Plan</h2>
		<p>Lo que incluye tu suscripción y cómo gestionarla.</p>
	</header>

	<!-- Plan actual -->
	<section class="set-section">
		<h3>Plan actual</h3>
		<div class="current" style={`border-left: 2px solid ${planAccentVar(accountStore.plan)}`}>
			<div class="current-head">
				<span class="plan-name">{plan.name}</span>
				<span class="plan-price">{plan.priceLabel} · {plan.period}</span>
			</div>
			<span class="renew">
				{plan.id === 'free' ? 'No requiere renovación' : 'Se renueva el 3 de cada mes'}
			</span>
			<ul class="features">
				{#each plan.features as feature (feature)}
					<li>{feature}</li>
				{/each}
			</ul>
		</div>
		<KitRow row={{ title: 'Gestionar suscripción', description: 'Método de pago y facturas', value: 'Pronto' }} />
		<KitRow
			row={{
				title: 'Cancelar suscripción',
				description: 'Volver al plan Gratis al final del ciclo',
				value: plan.id === 'free' ? '—' : '',
				danger: plan.id !== 'free'
			}}
		/>
	</section>

	<hr class="set-divider" />

	<!-- Cambiar de plan -->
	<section class="set-section">
		<h3>Cambiar de plan</h3>
		<div class="options">
			{#each PLANS as p (p.id)}
				<button
					class="option"
					class:current={p.id === accountStore.plan}
					type="button"
					onclick={() => choose(p.id)}
				>
					<span class="option-head">
						<span class="option-name" style={`color: ${planAccentVar(p.id)}`}>{p.name}</span>
						{#if p.id === accountStore.plan}<span class="option-current">Actual</span>{/if}
					</span>
					<span class="option-price">{p.priceLabel}<em>{p.period}</em></span>
					<span class="option-line">{p.tagline}</span>
				</button>
			{/each}
		</div>
		<p class="set-note">
			Demostración de interfaz: el cambio de plan se guarda localmente, sin cobro real todavía.
		</p>
	</section>
</div>

<style>
	.current {
		/* Sin caja: el plan se lee directo sobre el vidrio, con su hairline de acento */
		padding: 0.25rem 0.25rem 0.25rem 1.125rem;
	}

	.current-head {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}

	.plan-name {
		font-size: 1.25rem;
		font-weight: 680;
		letter-spacing: -0.015em;
		color: var(--text-primary);
	}

	.plan-price {
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.renew {
		display: block;
		margin-top: 0.125rem;
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	.features {
		list-style: none;
		margin: 0.75rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.features li {
		position: relative;
		padding: 0.4375rem 0;
		padding-left: 1.125rem;
		font-size: 0.8438rem;
		color: var(--text-secondary);
	}

	.features li::before {
		content: '';
		position: absolute;
		left: 0.125rem;
		top: 50%;
		width: 4px;
		height: 4px;
		border-radius: 999px;
		background: var(--text-tertiary);
		transform: translateY(-50%);
	}

	.options {
		display: flex;
		flex-direction: column;
	}

	.option {
		display: flex;
		flex-direction: column;
		gap: 0.1875rem;
		padding: 0.875rem 0.25rem;
		border: none;
		background: transparent;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
		transition: background 0.13s ease;
	}

	.option:hover {
		background: var(--accent-subtle);
	}

	.option.current {
		cursor: default;
		background: transparent;
	}

	.option-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.option-name {
		font-size: 0.9375rem;
		font-weight: 620;
	}

	.option-current {
		padding: 0.125rem 0.4375rem;
		border-radius: 999px;
		background: var(--bg-tertiary);
		font-size: 0.625rem;
		font-weight: 640;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.option-price {
		font-size: 0.8438rem;
		color: var(--text-secondary);
	}

	.option-price em {
		font-style: normal;
		margin-left: 0.25rem;
		color: var(--text-tertiary);
	}

	.option-line {
		font-size: 0.7813rem;
		color: var(--text-tertiary);
	}
</style>
