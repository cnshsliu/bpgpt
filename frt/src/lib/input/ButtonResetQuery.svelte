<script lang="ts">
	import { _ } from '$lib/i18n';
	import { breakpoint } from '$lib/Stores';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
</script>

<div
	class="btn btn-primary m-0 p-1"
	color="primary"
	on:keydown={() => {}}
	on:keyup={() => {}}
	on:keypress={() => {}}
	on:click|preventDefault={(_) => {
		dispatch('click');
	}}>
	<i class="bi bi-arrow-clockwise" />
	{#if $breakpoint > 1}
		{$_('button.resetQuery')}
	{/if}
</div>
