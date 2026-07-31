<script lang="ts">
	import { t } from 'svelte-i18n';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { Icon } from '$lib/components/ui';
	import './ai-services-settings.css';
</script>

<div class="service-group">
	<div class="service-header">
		<Icon name="mic" size={14} />
		<span>{$t('settings.stt.title')}</span>
	</div>
	<p class="stt-hint">{$t('onboarding.sttDescription')}</p>

	<span class="stt-sublabel">{$t('settings.stt.groqKey')}</span>
	<div class="api-key-row">
		<input
			type="password"
			class="api-key-input"
			placeholder={$t('settings.stt.groqKeyPlaceholder')}
			value={settingsStore.getProviderConfig('groq-stt').apiKey ?? ''}
			oninput={(e) => {
				const v = e.currentTarget.value;
				settingsStore.setProviderConfig('groq-stt', { apiKey: v });
				if (v) settingsStore.markProviderAdded('groq-stt');
				else settingsStore.removeProvider('groq-stt');
			}}
		/>
	</div>

	<span class="stt-sublabel">{$t('settings.stt.openaiKey') || 'Clave API de OpenAI (Whisper)'}</span>
	<div class="api-key-row">
		<input
			type="password"
			class="api-key-input"
			placeholder={$t('settings.stt.openaiKeyPlaceholder')}
			value={settingsStore.getProviderConfig('openai-stt').apiKey ?? ''}
			oninput={(e) => {
				const v = e.currentTarget.value;
				settingsStore.setProviderConfig('openai-stt', { apiKey: v });
				if (v) settingsStore.markProviderAdded('openai-stt');
				else settingsStore.removeProvider('openai-stt');
			}}
		/>
	</div>

	<span class="stt-sublabel">{$t('settings.stt.localServerLabel')}</span>
	<div class="api-key-row">
		<input
			type="text"
			class="api-key-input"
			placeholder={$t('settings.stt.localServerPlaceholder')}
			value={settingsStore.getProviderConfig('local-stt').baseUrl ?? ''}
			oninput={(e) => {
				const v = e.currentTarget.value.trim();
				settingsStore.setProviderConfig('local-stt', { baseUrl: v });
				if (v) settingsStore.markProviderAdded('local-stt');
				else settingsStore.removeProvider('local-stt');
			}}
		/>
	</div>
	<div class="api-key-row">
		<input
			type="text"
			class="api-key-input"
			placeholder={$t('settings.stt.localModelPlaceholder')}
			value={settingsStore.getProviderConfig('local-stt').modelId ?? ''}
			oninput={(e) => {
				settingsStore.setProviderConfig('local-stt', { modelId: e.currentTarget.value.trim() });
			}}
		/>
	</div>
</div>

<style>
	.stt-hint {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		margin: 0;
		line-height: 1.4;
	}

	.stt-sublabel {
		display: block;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-secondary);
		margin-top: 0.25rem;
	}
</style>
