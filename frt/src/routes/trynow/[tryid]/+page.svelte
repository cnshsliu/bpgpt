<script lang="ts">
	import type { PageData } from './$types';
	import InputTryId from '../_InputTryId.svelte';
	import TryNow from '../_TryNow.svelte';

	export let data: PageData;

	let { what, tryid } = data;
	$: ({ what, tryid } = data);
</script>

<div class="container">
	{#if what.error}
		<InputTryId
			{tryid}
			msg={`${tryid} does not exist`} />
	{:else}
		<TryNow
			bind:tryid
			bind:what />
	{/if}
</div>
