<script lang="ts">
	import { _ } from '$lib/i18n';
	import { breakpoint, showAdvancedSearch } from '$lib/Stores';
	import { createEventDispatcher } from 'svelte';
	export let BIZ: string;

	const dispatch = createEventDispatcher();
</script>

<div
	class="btn btn-primary m-0 p-1"
	color="primary"
	on:keydown={null}
	on:click|preventDefault={() => {
		dispatch('click');
	}}>
	{#if $showAdvancedSearch[BIZ]}
		<i class="bi bi-x-circle" />
	{:else}
		<i class="bi bi-search" />
	{/if}
	{#if $breakpoint > 1}
		{$_('button.toggleAdvancedSearch')}
	{/if}
</div>
