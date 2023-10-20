<script lang="ts">
	import { pageName } from '$lib/Stores';
	import type { PageData } from './$types';
	export let data: PageData;
	let { user, workflow, wfid, showComment } = data;
	$: ({ user, workflow, wfid, showComment } = data);

	import { _ } from '$lib/i18n';
	import Comments from '$lib/Comments.svelte';
	import { mtcSession } from '$lib/Stores';
	import ProcessTrack from '$lib/ProcessTrack.svelte';
	import ErrorNotify from '$lib/ErrorNotify.svelte';
	import { goto } from '$app/navigation';
	import { printing } from '$lib/Stores';
	import { onMount } from 'svelte';
	import * as api from '$lib/api';

	let pointToOrigin = '';
	let comments: any = [];

	const onPrint = async function () {
		$printing = true;
		setTimeout(async () => {
			$printing = false;
		}, 3000);
	};

	onMount(async () => {
		//$filterStorage.workTitlePattern = 'wf:' + wfid;
		if ($mtcSession.comment_wfid === wfid) {
			comments = $mtcSession.comments;
		} else {
			let cmtRes = await api.post('comment/workflow/load', { wfid: wfid }, user.sessionToken);
			if (cmtRes.error) {
				console.log(cmtRes.message);
				delete $mtcSession.comment_wfid;
				delete $mtcSession.comments;
			} else {
				comments = cmtRes as any;
				//$mtcSession.comment_wfid = theWork.wfid;
				//$mtcSession.comments = theWork.comments;
			}
		}
		$pageName = workflow.wftitle;
	});
	export async function _refreshWork() {}
</script>

<svelte:head>
	<title>{workflow.wftitle} • Workflow</title>
</svelte:head>
{#if workflow.wftitle !== 'Not Found'}
	{#if showComment && workflow.allowdiscuss}
		<div
			class="bg-light m-0 p-2 ps-4"
			id="todo_comments">
			<span class="fs-3">{workflow.wftitle}</span>
			<Comments
				bind:comments
				bind:pointToOrigin />
		</div>
	{/if}
	<ProcessTrack
		bind:wf={workflow}
		rehearsal={workflow.rehearsal}
		{wfid}
		{onPrint} />
{:else}
	<ErrorNotify
		title={$_('error.wnf.title')}
		subtitle={$_('error.wnf.subtitle')}
		info={$_('error.wnf.info', { values: { wfid: wfid } })}
		btnTitle={$_('error.wnf.btntitle')}
		callback={() => {
			goto('/workflow');
		}} />
{/if}
