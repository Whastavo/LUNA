<script lang="ts">
	import type { Snippet } from 'svelte';

	interface RowProps {
		title: string;
		description?: string;
		value?: string;
		href?: string;
		danger?: boolean;
		onclick?: () => void;
		control?: Snippet;
	}

	let { row }: { row: RowProps } = $props();
</script>

{#if row.href}
	<a class="row" href={row.href} target="_blank" rel="noopener noreferrer">
		{@render body()}
	</a>
{:else if row.onclick}
	<button class="row clickable" class:danger={row.danger} type="button" onclick={row.onclick}>
		{@render body()}
	</button>
{:else}
	<div class="row">
		{@render body()}
	</div>
{/if}

{#snippet body()}
	<span class="row-main">
		<span class="row-title">{row.title}</span>
		{#if row.description}<span class="row-desc">{row.description}</span>{/if}
	</span>
	{#if row.control}
		{@render row.control()}
	{:else if row.value}
		<span class="row-value">{row.value}</span>
	{/if}
	{#if (row.href || row.onclick) && !row.control}
		<svg class="chev" viewBox="0 0 320 512" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"/></svg>
	{/if}
{/snippet}

<style>
	.row {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		padding: 0.6875rem 0.25rem;
		border: none;
		background: transparent;
		font: inherit;
		color: inherit;
		text-align: left;
		text-decoration: none;
		cursor: default;
		transition: background 0.12s ease;
	}

	.clickable {
		cursor: pointer;
	}

	button.row:hover,
	a.row:hover {
		background: var(--accent-subtle);
	}


	button.row.danger .row-title {
		color: var(--color-error);
	}

	.row-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.row-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.row-desc {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		line-height: 1.4;
	}

	.row-value {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.chev {
		color: var(--text-tertiary);
		opacity: 0.6;
		flex-shrink: 0;
	}
</style>
