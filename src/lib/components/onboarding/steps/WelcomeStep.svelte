<script lang="ts">
	interface Props {
		onNext: () => void;
	}

	let { onNext }: Props = $props();
</script>

<div class="ob-step ob-step--center">
	<div class="logo-container">
		<img src="/brand-assets/logo.svg" alt="Luna" class="logo" />
	</div>

	<p class="ob-subtitle">Unos cuantos pasos suaves para dar vida a tu compañera.</p>

	<button class="btn btn-primary btn-lg btn-block" onclick={onNext}>
		Empezar
	</button>
</div>

<style>
	.logo-container {
		display: flex;
		justify-content: center;
	}

	.logo {
		height: 30px;
		width: auto;
	}
</style>
