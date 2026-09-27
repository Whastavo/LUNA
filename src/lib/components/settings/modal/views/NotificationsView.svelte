<script lang="ts">
	import { displayStore } from '$lib/stores/display.svelte';
	import '../modal-kit.css';

	// Preferencias de notificación (persistencia ligera, local).
	const KEY = 'luna-notifications';
	interface NotifPrefs {
		messages: boolean;
		reminders: boolean;
		moments: boolean;
		quietStart: string;
		quietEnd: string;
		quiet: boolean;
	}

	const DEFAULTS: NotifPrefs = {
		messages: true,
		reminders: true,
		moments: true,
		quietStart: '23:00',
		quietEnd: '08:00',
		quiet: false
	};

	let prefs = $state<NotifPrefs>({ ...DEFAULTS });

	if (typeof localStorage !== 'undefined') {
		try {
			const saved = localStorage.getItem(KEY);
			if (saved) prefs = { ...DEFAULTS, ...JSON.parse(saved) };
		} catch {
			// preferencias por defecto
		}
	}

	function persist() {
		localStorage.setItem(KEY, JSON.stringify(prefs));
	}

	function toggle(key: keyof NotifPrefs) {
		prefs[key] = !prefs[key] as never;
		persist();
		if (key === 'waitTone' as never) return;
	}

	// El tono de espera real vive en displayStore; lo espejamos.
	const waitTone = $derived(displayStore.waitToneEnabled);
	function toggleWaitTone() {
		displayStore.setWaitToneEnabled(!waitTone);
	}
</script>

<div class="set-view">
	<header class="set-header">
		<h2>Notificaciones</h2>
		<p>Cuándo y cómo quieres que te alcance.</p>
	</header>

	<section class="set-section">
		<div class="line">
			<span class="line-label">Sus mensajes</span>
			<span class="line-desc">Cuando te escribe sin que le hayas hablado</span>
			<button class="set-switch" class:on={prefs.messages} type="button" role="switch" aria-checked={prefs.messages} aria-label="Sus mensajes" onclick={() => toggle('messages')}></button>
		</div>
		<div class="line">
			<span class="line-label">Recordatorios</span>
			<span class="line-desc">Tus tareas y temporizadores</span>
			<button class="set-switch" class:on={prefs.reminders} type="button" role="switch" aria-checked={prefs.reminders} aria-label="Recordatorios" onclick={() => toggle('reminders')}></button>
		</div>
		<div class="line">
			<span class="line-label">Momentos especiales</span>
			<span class="line-desc">Aniversarios y acontecimientos de su historia</span>
			<button class="set-switch" class:on={prefs.moments} type="button" role="switch" aria-checked={prefs.moments} aria-label="Momentos especiales" onclick={() => toggle('moments')}></button>
		</div>
	</section>

	<hr class="set-divider" />

	<section class="set-section">
		<h3>Horarios</h3>
		<div class="line">
			<span class="line-label">No molestar</span>
			<span class="line-desc">Silencia todo en el intervalo elegido</span>
			<button class="set-switch" class:on={prefs.quiet} type="button" role="switch" aria-checked={prefs.quiet} aria-label="No molestar" onclick={() => toggle('quiet')}></button>
		</div>
		{#if prefs.quiet}
			<div class="times">
				<label class="time">
					<span>Desde</span>
					<input type="time" bind:value={prefs.quietStart} onchange={persist} />
				</label>
				<label class="time">
					<span>Hasta</span>
					<input type="time" bind:value={prefs.quietEnd} onchange={persist} />
				</label>
			</div>
		{/if}
		<div class="line">
			<span class="line-label">Tono de espera</span>
			<span class="line-desc">Un ping suave mientras ella escribe</span>
			<button class="set-switch" class:on={waitTone} type="button" role="switch" aria-checked={waitTone} aria-label="Tono de espera" onclick={toggleWaitTone}></button>
		</div>
	</section>
</div>

<style>
	.line {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5625rem 0.25rem;
	}


	.line-label {
		flex-shrink: 0;
		min-width: 11rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.88);
	}

	.line-desc {
		flex: 1;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.times {
		display: flex;
		gap: 1.25rem;
		padding: 0.625rem 0.25rem;
	}

	.time {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.55);
	}

	.time input {
		padding: 0.3125rem 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.05);
		color: #fff;
		font: inherit;
		font-size: 0.8125rem;
	}

	.time input:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.3);
	}
</style>
