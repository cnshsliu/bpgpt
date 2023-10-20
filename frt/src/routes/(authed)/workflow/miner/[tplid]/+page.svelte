<script lang="ts">
	import { onMount } from 'svelte';
	import { miningMode, currentTplid } from '$lib/Stores';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	export let data: PageData;
	let { user, tplid } = data;
	$: ({ user, tplid } = data);

	$currentTplid = tplid;
	$miningMode = true;
	goto('/workflow');

	onMount(() => {
		console.log(tplid);
	});
</script>

<div>
	{tplid}
</div>
