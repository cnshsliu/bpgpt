<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from '$lib/i18n';
	import TimeTool from '$lib/TimeTool';
	import { clientViewedTodoIds } from '$lib/Stores';
	import KVarDisplayMobile from '$lib/display/KVarDisplayMobile.svelte';
	import { goto } from '$app/navigation';
	export let todo: any;
	export let filterStatus: string;

	let kvarsToShow = [];
	let kvarsExpanded = false;

	function gotoWorkitem() {
		goto(`/work/${todo.todoid}`, {
			replaceState: false,
		});
	}

	onMount(() => {
		kvarsToShow = todo.kvarsArr.filter((kvar: any) => kvar.name[0] !== '$');
	});
</script>

<div class="m-0 p-0 fs-7 py-2">
	<div
		class="row"
		on:keydown={null}
		on:click={gotoWorkitem}>
		<div class="col fs-6 position-relative">
			<span class="kfk-link clickable m-0 p-0">{todo.wfstarterCN}-{todo.wftitle}</span>
			{#if todo.newer && $clientViewedTodoIds.indexOf(todo.todoid) === -1}
				<span class="position-absolute reddot bg-danger top-0 p-1 rounded-circle" />
			{/if}
			{#if filterStatus === 'ST_FOOTPRINT' && ['ST_RUN', 'ST_DONE'].indexOf(todo.status) !== -1}
				<img
					src={todo.status === 'ST_RUN' ? '/images/tag_running.png' : '/images/tag_done.png'}
					height="12px"
					alt={''} />
			{/if}
		</div>
		<div class="col-auto">
			{TimeTool.format(
				todo.createdAt,
				TimeTool.dayjs().diff(todo.createdAt, 'day') < 8 ? 'dddd' : 'M/D',
			)}
		</div>
	</div>
	<div
		class="row m-0 p-0"
		on:keydown={null}
		on:click={gotoWorkitem}>
		<div class="col p-0">
			<span class="kfk-link clickable m-0 p-0">{todo.title}</span>
		</div>
	</div>
	<div class="row m-0 p-0">
		{#each kvarsToShow as kvar, index}
			{#if index < 3 || kvarsExpanded === true}
				<div>
					<KVarDisplayMobile
						work={todo}
						{kvar} />
				</div>
			{/if}
		{/each}
		{#if kvarsToShow.length > 4}
			<div
				class="row"
				on:keydown={null}
				on:click={() => {
					kvarsExpanded = !kvarsExpanded;
				}}>
				<div class="col p-0">
					<span class="kfk-link clickable m-0 p-0">
						{kvarsExpanded ? $_('button.lessitems') : $_('button.moreitems')}
					</span>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.fs-7 {
		font-size: 0.7rem;
	}
	.reddot {
		width: 10px;
		height: 10px;
		display: inline-block;
	}
</style>
