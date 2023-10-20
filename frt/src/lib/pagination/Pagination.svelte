<script lang="ts">
	import { _ } from '$lib/i18n';
	import type { StateContext } from '$lib/types';
  import {deviceIsMobile} from '$lib/Stores';
	import { createEventDispatcher, getContext } from 'svelte';
	const dispatch = createEventDispatcher();
	const stateContext: StateContext = getContext('state');

	export let buttons = [-2, -1, 0, 1, 2];
	export let count: number;
	export let pageSer = 0;
	export let pageSize: number;
	let pageCount: number;

	export let labels = {
		first: $_('pagination.first'),
		last: $_('pagination.last'),
		next: $_('pagination.next'),
		previous: $_('pagination.prev'),
	};

	$: count &&
		(() => {
			pageCount = Math.ceil(count / pageSize);
		})();
	pageCount = Math.ceil(count / pageSize);

	function onChange(event: any, pageSer: number) {
		const state = stateContext.getState();
		const detail = {
			originalEvent: event,
			pageSer,
			pageSize: state.pageSize,
			preventDefault: event.preventDefault,
		};
		dispatch('pageChange', detail);

		if (detail.preventDefault !== true) {
			stateContext.setPage(detail.pageSer);
		}
	}
</script>

	{#if $deviceIsMobile === false}
    <div class="row">
      <div class="col">&nbsp;</div>
      <div class="col col-auto">
          {$_('remotetable.totalRows')}: {count}
          {$_('remotetable.pageSize')}: {pageSize}
          {$_('remotetable.pageCount')}: {pageCount}
      </div>
    </div>
	{/if}

	{#key pageSer}
<div class="row">
		<ul class="p-0 ">
			<li>
				<button
					disabled={pageSer === 0}
					on:click={(e) => onChange(e, 0)}>
					{labels.first}
				</button>
			</li>
			<li>
				<button
					disabled={pageSer === 0}
					on:click={(e) => onChange(e, pageSer - 1)}>
					{labels.previous}
				</button>
			</li>
			{#each buttons as button}
				{#if pageSer + button >= 0 && pageSer + button + 1 <= pageCount}
					<li>
						<button
							class:active={pageSer === pageSer + button}
							on:click={(e) => onChange(e, pageSer + button)}>
							{pageSer + button + 1}
						</button>
					</li>
				{/if}
			{/each}
			<li>
				<button
					disabled={pageSer >= pageCount - 1}
					on:click={(e) => onChange(e, pageSer + 1)}>
					{labels.next}
				</button>
			</li>
			<li>
				<button
					disabled={pageSer >= pageCount - 1}
					on:click={(e) => onChange(e, pageCount - 1)}>
					{labels.last}
				</button>
			</li>
		</ul>
</div>
	{/key}

<style>
	.active {
		background-color: rgb(150, 150, 235);
		color: white;
	}

	ul {
		flex: 1;
		float: right;
		list-style: none;
	}

	li {
		float: left;
	}

	button {
		background: transparent;
		border: 1px solid #ccc;
		padding: 1px 10px;
		margin-left: 3px;
		float: left;
		cursor: pointer;
		text-decoration: none;
	}
</style>
