<script lang="ts">
	import { Icon } from '$lib/components/ui';

	interface Props {
		name: string;
		systemPrompt: string;
		onNameChange: (name: string) => void;
		onSystemPromptChange: (prompt: string) => void;
		onNext: () => void;
		onBack: () => void;
	}

	let { name, systemPrompt, onNameChange, onSystemPromptChange, onNext, onBack }: Props = $props();

	const isValid = $derived(name.trim().length > 0);
</script>

<div class="ob-step">
	<div class="ob-head">
		<h2 class="ob-title">Nombra a tu compañera</h2>
		<p class="ob-subtitle">Dale a tu compañera de IA un nombre y una personalidad.</p>
	</div>

	<div class="ob-field">
		<label for="name" class="ob-label">Nombre</label>
		<input
			id="name"
			type="text"
			class="ob-input"
			value={name}
			oninput={(e) => onNameChange(e.currentTarget.value)}
			placeholder="Introduce un nombre..."
		/>
	</div>

	<div class="ob-field">
		<label for="personality" class="ob-label">Personalidad principal</label>
		<textarea
			id="personality"
			class="ob-textarea"
			value={systemPrompt}
			oninput={(e) => onSystemPromptChange(e.currentTarget.value)}
			placeholder="Describe su personalidad, estilo al hablar, trasfondo..."
			rows="5"
		></textarea>			<span class="ob-hint">Esto moldea cómo habla y se comporta tu compañera.</span>
	</div>

	<div class="ob-actions ob-actions--split">
		<button class="btn btn-secondary" onclick={onBack}>
			<Icon name="chevron-left" size={16} />
			Atrás
		</button>
		<button class="btn btn-primary" onclick={onNext} disabled={!isValid}>
			Siguiente
			<Icon name="chevron-right" size={16} />
		</button>
	</div>
</div>
