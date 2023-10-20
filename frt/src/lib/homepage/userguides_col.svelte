<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
	export let data: any;
</script>

<div class="col m-2 border-top border-primary border-5">
	<div class="h4 pb-2 mt-5 pb-5 mb-4 text-primary">
		<i class={`bi bi-${data.icon}`} />
		{data.title}
	</div>
	{data.content}
	<div class="mt-3">
		<a
			href={'#'}
			on:click|preventDefault={() => {
				dispatch('click');
			}}
			class="kfk-a">
			{data.link}
		</a>
	</div>
</div>
