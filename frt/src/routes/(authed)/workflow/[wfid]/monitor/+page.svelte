<script lang="ts">
	import type { PageData } from './$types';
	import type { User, Template, Workflow, EmpResponse } from '$lib/types';
	export let data: PageData;
	const { workflow: Workflow, routeStatus: any, wfid: string } = data;
	$: ({ workflow, routeStatus, wfid } = data);

	import { page } from '$app/stores';
	import AniIcon from '$lib/AniIcon.svelte';
	import { filterStorage } from '$lib/mtcLocalStores';
	import ErrorNotify from '$lib/ErrorNotify.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { setFadeMessage } from '$lib/Notifier';
	import * as api from '$lib/api';
	import { InputGroup, Button, Row, Col, Nav, NavLink, InputGroupText } from 'sveltestrap';
	import { Icon } from 'sveltestrap';
	import { ClientPermControl } from '$lib/clientperm';

	const user: User = $page.data.user;

	let theNotifier;
	let showRenameForm = false;

	let Designer: any;
	let theDesigner: any;
	onMount(async () => {
		const module = await import('$lib/designer/Designer.svelte');
		Designer = module.default;
	});

	const opWorkflow = (wfid: string, op: string): void => {
		if (op === 'works') {
			$filterStorage.workTitlePattern = 'wf:' + wfid;
			goto('/work');
		}
		setTimeout(async () => {
			let ret: Workflow = (await api.post(
				'workflow/op',
				{ wfid, op },
				user.sessionToken,
			)) as Workflow;
			workflow.status = ret.status;
		}, 1);
	};
</script>

<svelte:head>
	<title>{workflow.wftitle} • Workflow</title>
</svelte:head>
<div id="designer-topMenu">
	<Row class="mt-1 d-flex justify-content-center">
		<Col class="d-flex justify-content-center">
			<Nav>
				<NavLink
					class="kfk-link"
					on:click={() => {
						opWorkflow(workflow.wfid, 'works');
					}}>
					<AniIcon
						icon="list-check"
						ani="aniShake" />
					{'Works'}
				</NavLink>
				{#if ClientPermControl(user.perms, user.eid, 'workflow', workflow, 'update')}
					{#if workflow.status === 'ST_RUN'}
						<NavLink
							class="kfk-link"
							on:click={() => {
								opWorkflow(workflow.wfid, 'pause');
							}}>
							<AniIcon
								icon="pause-btn"
								ani="aniShake" />
							{'PAUSE'}
						</NavLink>
					{/if}
					{#if workflow.status === 'ST_PAUSE'}
						<NavLink
							class="kfk-link"
							on:click={() => {
								opWorkflow(workflow.wfid, 'resume');
							}}>
							<AniIcon
								icon="arrow-counterclockwise"
								ani="aniShake" />
							{'RESUME'}
						</NavLink>
					{/if}
					{#if ['ST_RUN', 'ST_PAUSE'].indexOf(workflow.status) > -1}
						<NavLink
							class="kfk-link"
							on:click={() => {
								opWorkflow(workflow.wfid, 'stop');
							}}>
							<AniIcon
								icon="slash-square"
								ani="aniShake" />
							{'STOP'}
						</NavLink>
					{/if}
					{#if ['ST_RUN', 'ST_PAUSE', 'ST_STOP'].indexOf(workflow.status) > -1}
						<NavLink
							class="kfk-link"
							on:click={(e) => {
								e.preventDefault();
								opWorkflow(workflow.wfid, 'restart');
								goto('/workflow');
							}}>
							<AniIcon
								icon="caret-right-square"
								ani="aniShake" />
							{'RESTART'}
						</NavLink>
					{/if}
					<NavLink
						class="kfk-link"
						on:click={(e) => {
							e.preventDefault();
							showRenameForm = !showRenameForm;
						}}>
						<AniIcon
							icon="pen"
							ani="aniShake" />
						{'Rename'}
					</NavLink>
					<NavLink
						class="kfk-link"
						on:click={(e) => {
							e.preventDefault();
							opWorkflow(workflow.wfid, 'restart');
							goto(`/template/${workflow.tplid}&read`);
						}}>
						<AniIcon
							icon="bar-chart-steps"
							ani="aniShake" />
						{'Template'}
					</NavLink>
				{:else}
					{#if workflow.status === 'ST_RUN'}
						<NavLink
							class="kfk-link"
							disabled>
							<Icon name="pause-btn" />
							{'PAUSE'}
						</NavLink>
					{/if}
					{#if workflow.status === 'ST_PAUSE'}
						<NavLink
							class="kfk-link"
							disabled>
							<Icon name="arrow-counterclockwise" />
							{'RESUME'}
						</NavLink>
					{/if}
					{#if ['ST_RUN', 'ST_PAUSE'].indexOf(workflow.status) > -1}
						<NavLink
							class="kfk-link"
							disabled>
							<Icon name="slash-square" />
							{'STOP'}
						</NavLink>
					{/if}
					{#if ['ST_RUN', 'ST_PAUSE', 'ST_STOP'].indexOf(workflow.status) > -1}
						<NavLink
							class="kfk-link"
							disabled>
							<Icon name="caret-right-square" />
							{'RESTART'}
						</NavLink>
					{/if}
				{/if}
			</Nav>
		</Col>
	</Row>
	{#if showRenameForm}
		<Row class="mt-1 d-flex justify-content-center">
			<InputGroup>
				<InputGroupText>Rename it to :</InputGroupText>
				<input
					bind:value={workflow.wftitle}
					class="form-control" />
				<Button
					on:click={async (e) => {
						e.preventDefault();
						try {
							let res = await api.post(
								'workflow/set/title',
								{
									wfid: workflow.wfid,
									wftitle: workflow.wftitle,
								},
								user.sessionToken,
							);
							if (res.error) {
								setFadeMessage(res.message, 'warning');
							} else {
								setFadeMessage('Success', 'success');
							}
						} catch (err) {
							setFadeMessage(err.message, 'error');
						}
					}}>
					Rename it
				</Button>
			</InputGroup>
		</Row>
	{/if}
</div>
{#if workflow.wftitle !== 'Not Found'}
	<svelte:component
		this={Designer}
		bind:this={theDesigner}
		{workflow}
		{routeStatus} />
{:else}
	<ErrorNotify
		title="Error Found"
		subtitle="Workflow not found"
		info={`Workflow ${wfid} does not exist`}
		btnTitle="Back"
		callback={() => {
			goto('/workflow');
		}} />
{/if}
