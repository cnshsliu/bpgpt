<script lang="ts">
	import { Badge } from 'sveltestrap';
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
	export let text;
	export let withDeleteButton = true;
</script>

<Badge
	pill
	color="light"
	class="kfk-tag text-primary border border-primary"
	onmouseover={() => console.log('over')}>
	{text}
	{#if withDeleteButton}
		<span class="ms-2">
			<a
				href={'#'}
				on:click|preventDefault|stopPropagation={() => dispatch('delete', 'delete this')}>
				<i class="bi bi-x" />
			</a>
		</span>
	{/if}
</Badge>
