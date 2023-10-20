<script lang="ts">
	import TopArea from '$lib/homepage/toparea.svelte';
	import NaviCard from '$lib/homepage/navicard.svelte';
	import Prices from '$lib/homepage/price.svelte';
	import Features from '$lib/homepage/features.svelte';
	import UserGuides from '$lib/homepage/userguides.svelte';
	import FreeConsultant from '$lib/homepage/freeconsultant.svelte';
	import FAQ from '$lib/homepage/faq.svelte';

	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	onMount(async () => {});
</script>

<!-- This page cannot placed into (authed) (nouser) with the same name, -->
<!-- please keep it here. -->
<!-- and have different area displayed for authed or no-authed -->

<svelte:head>
	<title>Yarknode HyperAutomation</title>
	<meta
		name="description"
		content="Yarknode HyperAutomation" />
</svelte:head>
<div class="homepage">
	<TopArea />
	<UserGuides />
	<FreeConsultant />
	<Prices />
	{#if $page.data.user}
		<NaviCard />
	{:else}
		<Features />
	{/if}
	<FAQ />
</div>
