<script lang="ts">
	import { t } from 'svelte-i18n';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { getTTSProvider } from '$lib/services/providers/registry';
	import { Icon, ProviderDropdown, ModelDropdown } from '$lib/components/ui';
	import type { TtsSettingsState } from '$lib/stores/ai-services-settings.svelte';
	import './ai-services-settings.css';

	let { state }: { state: TtsSettingsState } = $props();
</script>

<div class="service-group">
	<div class="service-header">
		<Icon name="mic" size={14} />
		<span>{$t('settings.tts.title')}</span>
		<button
			class="service-toggle"
			class:enabled={state.isTTSEnabled}
			onclick={state.toggleTTS}
			aria-label={$t('settings.tts.title')}
		>
			<span class="toggle-track">
				<span class="toggle-thumb"></span>
			</span>
		</button>
	</div>

	{#if state.isTTSEnabled}
		<ProviderDropdown
			type="tts"
			value={state.speechSettings.activeProvider as string}
			onSelect={state.handleTTSProviderChange}
			placeholder={$t('settings.tts.selectProvider')}
		/>

		{#if state.speechSettings.activeProvider}
			{@const provider = getTTSProvider(state.speechSettings.activeProvider as string)}

			{#if provider?.requiresApiKey}
				<div class="api-key-row">
					<input
						type="password"
						class="api-key-input"
						class:error={state.ttsFetchError}
						placeholder={$t('settings.apiKey')}
						value={settingsStore.getProviderConfig(provider.id).apiKey ?? ''}
						oninput={(e) => state.handleApiKeyChange(provider.id, e.currentTarget.value)}
						onblur={state.handleTTSApiKeyBlur}
					/>
				</div>
			{/if}

			{#if !provider?.isLocal}
				<ModelDropdown
					models={state.ttsModels}
					value={state.speechSettings.activeModel as string}
					onSelect={state.handleTTSModelChange}
					placeholder={$t('settings.tts.selectModel')}
					isLoading={state.ttsIsLoading}
					onRefresh={state.ttsHasApiKey ? state.fetchTTSModels : undefined}
					disabled={!state.ttsHasApiKey}
					disabledMessage={$t('settings.enterApiKeyFirst')}
				/>
			{/if}

			{#if state.speechSettings.activeProvider === 'elevenlabs'}
				<div class="api-key-row">
					<input
						type="text"
						class="api-key-input"
						placeholder={$t('settings.tts.customVoiceIdOptional')}
						value={settingsStore.elevenLabsVoiceId}
						onchange={(e) => settingsStore.setElevenLabsVoiceId(e.currentTarget.value)}
					/>
				</div>
			{/if}

			{#if provider?.isLocal}
				<div class="api-key-row">
					<input
						type="text"
						class="api-key-input"
						list="local-tts-voices"
						placeholder={$t('settings.tts.voicePlaceholder')}
						value={state.speechSettings.activeVoiceId as string ?? ''}
						onchange={(e) => state.handleTTSVoiceChange(e.currentTarget.value)}
					/>
					<datalist id="local-tts-voices">
						{#each provider.voices ?? [] as voice}
							<option value={voice.id}>{voice.name}</option>
						{/each}
					</datalist>
				</div>
				<div class="api-key-row">
					<input
						type="text"
						class="api-key-input"
						placeholder={$t('settings.tts.modelOptionalPlaceholder')}
						value={state.speechSettings.activeModel as string ?? ''}
						onchange={(e) => state.handleTTSModelChange(e.currentTarget.value)}
					/>
				</div>
				<div class="api-key-row">
					<input
						type="text"
						class="api-key-input"
						placeholder={provider.defaultBaseUrl || 'http://localhost:8880/v1/'}
						value={settingsStore.getProviderConfig(provider.id).baseUrl ?? ''}
						onchange={(e) => settingsStore.setProviderConfig(provider.id, { baseUrl: e.currentTarget.value })}
					/>
				</div>
			{/if}
		{/if}
	{/if}
</div>
