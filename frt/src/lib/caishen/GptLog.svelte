<script lang="ts">
	import { enableLog } from './localStorage';
	import { page } from '$app/stores';
	import { createEventDispatcher } from 'svelte';
	import * as empApi from '$lib/api';
	import { FormGroup, Input, Offcanvas } from 'sveltestrap';
	import { onMount } from 'svelte';
	type gptLogType = {
		_id: string;
		bsid: string;
		scenid: string;
		checked: boolean;
		lastQuestion: string;
		deleted?: boolean;
		title?: string;
	};
	const dispatch = createEventDispatcher();
	let selectMode: boolean = false;
	let selectAll: boolean = false;

	export let logs: gptLogType[] = [];
	export let gptLogOpen = false;
	export let toggle = () => {
		gptLogOpen = !gptLogOpen;
	};
	onMount(() => {
		logs = logs.map((x) => {
			x.checked = false;
			return x;
		});
	});
</script>

<Offcanvas
	header="MbaGPT 历史记录"
	scroll
	isOpen={gptLogOpen}
	on:close={() => {
		dispatch('close');
	}}
	{toggle}
	backdrop={true}>
	<div class="row d-flex">
		<div class="col">
			<a
				href={'#'}
				class="kfk-a"
				on:keydown={null}
				on:click={() => {
					selectMode = !selectMode;
				}}>
				{selectMode ? '取消' : ''}选择
			</a>
		</div>
		<div class="col-auto">
			<FormGroup>
				<Input
					id="c3"
					type="switch"
					reverse
					bind:checked={$enableLog}
					label={$enableLog ? '正在记录' : '不在记录'} />
			</FormGroup>
		</div>
	</div>
	<div class="form-check">
		{#if selectMode}
			<div class="row">
				<div class="col-auto m-0 p-0 ps-2">
					<input
						placeholder=""
						class="form-check-input"
						id="c1_all"
						type="checkbox"
						name=""
						value=""
						bind:checked={selectAll}
						on:change={() => {
							for (let i = 0; i < logs.length; i++) {
								logs[i].checked = selectAll;
							}
							logs = logs;
						}} />
				</div>
				<div class="col form-check-label m-0 p-0">全选</div>
			</div>
		{/if}
	</div>
	{#each logs as log, index}
		<div
			class="row"
			class:border-bottom={index < logs.length - 1}>
			{#if selectMode}
				<div class="col-auto m-0 p-0 ps-2">
					<input
						placeholder=""
						class="form-check-input"
						id={'c1_' + index}
						type="checkbox"
						name=""
						value=""
						bind:checked={log.checked} />
				</div>
			{/if}
			<div
				class="col gptlog_title m-0 p-0 ps-2"
				on:keydown={null}
				on:click={() => {
					if (selectMode) {
						logs[index].checked = !logs[index].checked;
					} else {
						dispatch('restore', index);
					}
				}}>
				{log.title}
				<br />
				<span class="last_question">
					{log.lastQuestion.startsWith('Human: ') ? log.lastQuestion.slice(7) : log.lastQuestion}
				</span>
			</div>
		</div>
	{/each}
	{#if selectMode}
		<div class="row mt-3">
			<div class="col d-flex justify-content-end">
				<button
					class="btn"
					disabled={logs.filter((x) => x.checked).length === 0}
					on:click={() => {
						const tobeDeleted = logs.filter((x) => x.checked);
						logs = logs.filter((x) => !x.checked);
						empApi
							.post(
								'/caishen/delGptLog',
								{ bsids: tobeDeleted.map((x) => x.bsid) },
								$page.data.user.sessionToken,
							)
							.then(() => {
								dispatch('reload');
							});
					}}>
					删除
				</button>
			</div>
		</div>
	{/if}
</Offcanvas>

<style>
	.gptlog_title {
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
		display: inline-block;
		max-width: 100%;
		vertical-align: middle;
	}
	.gptlog_title:hover {
		cursor: pointer;
	}
	.last_question {
		font-size: 1.1rem;
		color: #999;
	}
</style>
