<script lang="ts">
	import { _ } from '$lib/i18n';
	import type { PageData } from './$types';
	import { whereAfterLogin } from '$lib/Stores';
	import { goto } from '$app/navigation';
	import InputTryId from '../InputTryId.svelte';

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
		<!-- <TryNow -->
		<!-- 	user={data.user} -->
		<!-- 	bind:tryid -->
		<!-- 	bind:what /> -->
	{/if}
</div>
