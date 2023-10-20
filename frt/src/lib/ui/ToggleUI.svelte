<script lang="ts">
	import { _ } from '$lib/i18n';
	import { UiSection } from '$lib/Stores';
</script>

<div
	class="btn btn-primary m-0 p-1"
	color="primary"
  role="none"
	on:keydown={null}
	on:click|preventDefault={() => {
		$UiSection['show'] = !$UiSection['show'];
	}}>
	{#if $UiSection['show']}
		<i class="bi bi-x-circle" />
	{:else}
		<i class="bi bi-search" />
	{/if}
</div>
