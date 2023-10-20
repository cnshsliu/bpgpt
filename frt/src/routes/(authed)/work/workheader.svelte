<script lang="ts">
	import { goto } from '$app/navigation';
	import * as api from '$lib/api';
	import { finderFilter, finderMsg } from '$lib/Stores';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { _ } from '$lib/i18n';
	import { mtcDate } from '$lib/i18n';
	import {
		printing,
		worklistChangeFlag,
		delayLoadOnMount,
		forcePreDelete,
		mtcConfirm,
		mtcConfirmReset,
	} from '$lib/Stores';
	import type { User, Work } from '$lib/types';

	export let work: Work;

	const user: User = $page.data.user;

	onMount(async () => {
		/* for debug purpose
		work.freejump_nodes.push({
			nodeid: 'abcd',
			title: 'ABCD',
		});
		work = work;
		 */
	});

	const freeJumpTo = async (toNodeid: string) => {
		let { nodeid, todoid, workid } = work;
		await api.post(
			'work/freejump',
			{
				from: { nodeid, todoid, workid },
				to: toNodeid,
			},
			user.sessionToken,
		);
		$finderFilter = { wfid: work.wfid, nodeid: toNodeid };
		$finderMsg = $_('work.freejumping');
		goto('/workfinder');
	};
</script>

<div class="row" />

<div
	class="col text-center"
	id="todo_title_area">
	<div
		class="fs-2 kfk-link"
		on:keydown={null}
		on:click={() => {
			if (work.wf.tplid.startsWith('Flexible tpl') === false) goto(`/workflow/${work.wf.wfid}`);
		}}>
		{work.wfstarterCN}
		-{work.wf.wftitle}
	</div>
	<h4>{work.title}</h4>
</div>

<div class={'row ' + ($printing ? 'nodisplay' : '') + ' mt-3 text-center justify-content-center '}>
	{#if work.doneat}
		<div class="col-auto">
			<span class="fw-bold">
				{$_('todo.doneat')}
			</span>
			<div class="fw-light">{mtcDate(work.doneat)}</div>
		</div>
	{/if}
</div>

{#if work.rehearsal || (work.wf.starter === user.eid && work.from_nodeid === 'start' && work.wf.status === 'ST_RUN')}
	<div class="hstack gap-2 justify-content-center">
		<!-- Felxible 的内部tpl  不显示 -->

		<!-- 演练模式下可重新演练 -->
		{#if work.rehearsal}
			<a
				class="nav-link kfk-link"
				href={'#'}
				on:keyup={null}
				on:click={async (e) => {
					e.preventDefault();
					$mtcConfirm = {
						title: $_('confirm.title.areyousure'),
						body: $_('confirm.body.restartthendestroy'),
						buttons: [$_('confirm.button.confirm')],
						callbacks: [
							async () => {
								api
									.post('workflow/restart/then/destroy', { wfid: work.wfid }, user.sessionToken)
									.then(() => {
										api.removeCacheByPath('work/search');
										$worklistChangeFlag++;
										$forcePreDelete = true;
										$delayLoadOnMount = 3000;
										goto('/work');
									});
								mtcConfirmReset();
							},
						],
					};
				}}>
				{$_('todo.restartrehearsal')}
			</a>
		{/if}

		<!-- 演练模式下， 或者非演练模式，但当前是启动者的第一个动作，可以放弃流程 -->
		{#if (work.rehearsal || (work.wf.starter === user.eid && work.from_nodeid === 'start')) && work.wf.status === 'ST_RUN'}
			<a
				class="nav-link kfk-link"
				href={'#'}
				on:keyup={null}
				on:click={async (e) => {
					e.preventDefault();
					$mtcConfirm = {
						title: $_('confirm.title.areyousure'),
						body: $_('confirm.body.cancelworkflowatfirststep'),
						buttons: [$_('confirm.button.confirm')],
						callbacks: [
							async () => {
								api
									.post('workflow/op', { wfid: work.wfid, op: 'destroy' }, user.sessionToken)
									.then(() => {
										api.removeCacheByPath('work/search');
										$worklistChangeFlag++;
										$forcePreDelete = true;
										$delayLoadOnMount = 3000;
										goto('/work');
									});
								mtcConfirmReset();
							},
						],
					};
				}}>
				{$_('todo.cancelworkflowatfirststep')}
			</a>
		{/if}
	</div>
{/if}

{#if work.freejump_nodes.length > 0}
	<div class="row freejump_section justify-content-center">
		<div class="col-auto">
			<a
				class="nav-link dropdown-toggle kfk-link"
				data-bs-toggle="dropdown"
				href={'#'}
				role="button"
				aria-expanded="false">
				{$_('todo.freejumpto')}
			</a>
			<ul class="dropdown-menu">
				{#each work.freejump_nodes as fjto}
					<li>
						<a
							class="dropdown-item"
							href={'#'}
							on:click={async (e) => {
								e.preventDefault();
								await freeJumpTo(fjto.nodeid);
								//console.log('postpone', row.todoid, day);
							}}>
							{fjto.title}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}
