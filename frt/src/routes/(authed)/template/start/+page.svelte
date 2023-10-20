<script lang="ts">
	import { pageName } from '$lib/Stores';
	import type { PageData } from './$types';
	import FileDropzone from '$lib/input/FileDropzone.svelte';
	import { currentBiz } from '$lib/Stores';
	export let data: PageData;
	let { user, teams, tplid } = data;
	$: ({ user, teams, tplid } = data);

	const START_MODE_REHEARSAL = true;
	const START_MODE_RUN = false;

	import { _ } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { setFadeMessage } from '$lib/Notifier';
	import FileUploader from '$lib/FileUploader.svelte';
	import { filterStorage } from '$lib/mtcLocalStores';
	import { worklistChangeFlag } from '$lib/Stores';
	import type { User, Template, Team, oneArgFunc } from '$lib/types';
	import * as api from '$lib/api';
	import {
		Container,
		Row,
		Col,
		Button,
		Card,
		CardHeader,
		CardBody,
		CardText,
		CardTitle,
		Form,
		Input,
		Label,
		Modal,
		ModalFooter,
		ModalHeader,
		ModalBody,
	} from 'sveltestrap';
	import { Badge, DropdownItem, DropdownMenu, DropdownToggle, Dropdown } from 'sveltestrap';
	import TimeTool from '$lib/TimeTool';
	//export let template;
	//export let template: Template;
	let showConfirmModal = false;
	let fullscreen = false;
	let isOpen = false;
	let roles: string[] = [];
	let startedWorkflow;
	interface withId {
		id: string;
		serverId: string;
	}
	let uploadedFiles: withId[] = [];
	let fade_message = '';
	let timeoutID = null;
	let textPbo = '';
	let wftitle = '';
	let team_id_for_search = '';
	import { title } from '$lib/title';
	import StartTeamRoles from '../_start_teamRoles.svelte';
	$title = 'HyperFlow';
	interface withTeamId {
		teamid: string;
	}
	let teamSearchResult: withTeamId[] = [];
	let theTeam: Team;

	const toggle = () => {
		showConfirmModal = !showConfirmModal;
	};

	const pickTeam = function (teamId: string) {
		team_id_for_search = teamId;
		saveOneRecentTeam(teamId);
		for (let i = 0; i < teams.length; i++) {
			if (teams[i].teamid === teamId) {
				theTeam = teams[i];
				roles = typeof theTeam.tmap === 'undefined' ? [] : Object.keys(theTeam.tmap);
			}
		}
		isOpen = false;
	};
	const searchTeam = function () {
		teamSearchResult.splice(0, teamSearchResult.length);
		for (let i = 0; i < teams.length; i++) {
			if (teams[i].teamid.match(team_id_for_search)) {
				teamSearchResult = [...teamSearchResult, teams[i]];
			}
		}

		if (team_id_for_search === 'show' || teamSearchResult.length > 0) {
			isOpen = true;
		} else {
			isOpen = false;
		}
	};

	let starting = 0;
	let uploadingFile = false;
	const _startWorkflow = async function (start_mode = START_MODE_RUN) {
		starting = 0;
		fade_message = '';
		if (!tplid) return;
		let teamid = theTeam ? theTeam.teamid : '';

		const res = await api.post(
			'workflow/start',
			{ rehearsal: start_mode, tplid, teamid, wftitle, textPbo, uploadedFiles },
			user.sessionToken,
		);
		if (res.wfid) {
			api.removeCacheByPath('workflow/search');
			api.removeCacheByPath('work/search');
			$worklistChangeFlag++;
			startedWorkflow = { wfid: res.wfid, tplid: res.tplid, ts: new Date().getTime() };
			fade_message = `Workflow ${res.wftitle} Started.`;
			setFadeMessage(fade_message, 'primary');

			starting = 1;
		} else {
			startedWorkflow = null;
			if (res.errors && res.errors.MongoError && res.errors.MongoError[0]) {
				if (res.errors.MongoError[0].indexOf('duplicate') >= 0) {
					fade_message = `exists already`;
					setFadeMessage(fade_message, 'warning');
				}
			} else {
				fade_message = JSON.stringify(res);
				setFadeMessage(fade_message, 'warning');
			}
		}
	};

	if (startedWorkflow) {
		if (!startedWorkflow.tplid || !startedWorkflow.tplid || !startedWorkflow.ts)
			startedWorkflow = null;
	}
	if (startedWorkflow && startedWorkflow.tplid && startedWorkflow.tplid !== tplid) {
		startedWorkflow = null;
	}

	let recentTemplates: string[] = [];
	let recentTeams: string[] = [];
	let desc = '';
	let template_basic;
	onMount(async () => {
		$pageName = $_('start.startWorkflow', { values: { tplid: tplid } });
		if (localStorage) {
			recentTemplates = JSON.parse(localStorage.getItem('recentTemplates') ?? JSON.stringify([]));
			recentTeams = JSON.parse(localStorage.getItem('recentTeams') ?? JSON.stringify([]));
		}
		$filterStorage.tplid = tplid;
		$filterStorage.workTitlePattern = '';

		template_basic = await api.post('template/basic', { tplid: tplid }, user.sessionToken);
		desc = template_basic.desc ? template_basic.desc : '';
		if ($currentBiz != tplid && template_basic.searchable) {
			$currentBiz = tplid;
		}
	});
	const saveOneRecentTeam = function (team) {
		let tmp = recentTeams.indexOf(team);
		if (tmp > -1) {
			recentTeams.splice(tmp, 1);
		}
		recentTeams.unshift(team);
		if (recentTeams.length > 10) {
			recentTeams.splice(10);
		}
		localStorage.setItem('recentTeams', JSON.stringify(recentTeams));
		recentTeams = recentTeams;
	};

	const onFile = (e: any) => {
		console.log(e.detail);
	};

	$: pbo_missed =
		template_basic?.musthavepbo && textPbo.trim().length === 0 && uploadedFiles.length === 0;
</script>

{#if starting !== 1}
	<Container class="mt-3">
		<div class="card">
			<h5 class="card-header">
				{$_('start.startWorkflow', { values: { tplid: tplid } })}
			</h5>
			<div class="card-body">
				<h6 class="card-title">
					{$_('start.title')}
				</h6>
				<p class="card-text">
					{desc}
				</p>
				<div class="form-floating">
					<Input
						type="text"
						name="wftitle"
						id="input-wftitle"
						class="form-control"
						bind:value={wftitle} />
					<Label for="input-wftitle">
						{$_('start.title_placeholder')}
					</Label>
				</div>
				<h6 class="card-title mt-3">
					{$_('start.context')}
				</h6>
				<div class="form-floating">
					<Input
						type="url"
						name="textPbo"
						id="input-textPbo"
						class="form-control"
						bind:value={textPbo} />
					<Label for="input-textPbo">
						{$_('start.pbo')}
					</Label>
				</div>
				<div class="card-title">
					{$_('start.canbefile')}
				</div>
				<div class="form-floating">
					<FileUploader
						forWhat={'workflow'}
						forWhich={'unknown'}
						forKey={'pbo'}
						allowRemove={true}
						allowMultiple={true}
						forKvar={undefined}
						stepid={'pbo'}
						on:uploading={(e) => {
							uploadingFile = true;
						}}
						on:remove={async (e) => {
							//remove has been disabled
							uploadingFile = false;
							let serverId = '';
							for (let i = 0; i < uploadedFiles.length; i++) {
								if (uploadedFiles[i].id === e.detail.id) {
									serverId = uploadedFiles[i].serverId;
									break;
								}
							}
							if (serverId) {
								console.log('Removeing file:', serverId);
								api.post('filepond/remove', { serverId: serverId }, user.sessionToken).then(() => {
									console.log('Removed', serverId);
								});
							}
						}}
						on:uploaded={async (e) => {
							uploadingFile = false;
							uploadedFiles = e.detail;
							console.log(uploadedFiles);
						}}
						on:warning={async (e) => {
							uploadingFile = false;
							uploadedFiles = e.detail;
							console.log(uploadedFiles);
						}}
						on:error={async (e) => {
							uploadingFile = false;
							uploadedFiles = e.detail;
							console.log(uploadedFiles);
						}} />
				</div>
				{#if uploadingFile === false && starting !== 1}
					<div class="mt-5">&nbsp;</div>
					<h6 class="card-title mt-5">
						{$_('start.ifnotfamiliar')}
					</h6>
					<div class="row row-cols-1">
						<div class="col">
							<Button
								disabled={starting === 1 || pbo_missed}
								color="secondary"
								class="w-100"
								on:click={(e) => {
									e.preventDefault();
									_startWorkflow(START_MODE_REHEARSAL);
								}}>
								{#if pbo_missed}
									({$_('start.warnNoPbo')})
								{:else}
									{$_('start.rehearsal')}
								{/if}
							</Button>
						</div>
					</div>
					<!-- div class="mt-3 w-100 text-center">
					<div>
						{$_('start.iffamiliar')}
					</div>
				</div -->
				{/if}

				{#if starting !== 1}
					<div class="row row-cols-1">
						<div
							class="col"
							style="margin-top: 20px;">
							<Button
								disabled={starting === 1 || pbo_missed}
								color="primary"
								class="w-100"
								on:click={(e) => {
									e.preventDefault();
									if (
										wftitle.trim().length === 0 ||
										(textPbo.trim().length === 0 && uploadedFiles.length === 0)
									) {
										showConfirmModal = true;
									} else {
										_startWorkflow(START_MODE_RUN);
									}
								}}>
								{#if pbo_missed}
									({$_('start.warnNoPbo')})
								{:else}
									{$_('start.startIt')}
								{/if}
							</Button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</Container>
{/if}
{#if startedWorkflow === null}
	<Container class="mt-3">
		<Form>
			<Row
				cols="1"
				class="mt-2">
				<Col class="text-center" />
				<Col />
				<Col />
			</Row>
			<Row
				cols="1"
				class="mt-5">
				<div class="mt-3 w-100 text-center">
					<div>
						{$_('start.useflexibleteam')}
					</div>
				</div>
				<Col>
					<Dropdown
						{isOpen}
						class="w-100">
						<DropdownToggle
							tag="div"
							class="d-inline-block w-100">
							<div class="form-floating">
								<Input
									placeholder="type team name here"
									on:keyup={searchTeam}
									bind:value={team_id_for_search}
									class="w-100 form-control"
									id="input-team" />
								<Label for="input-team">
									{$_('start.teamid')}
									{theTeam ? theTeam.teamid : ''}
								</Label>
							</div>
						</DropdownToggle>
						<DropdownMenu>
							{#each teamSearchResult as aTeam}
								<DropdownItem
									on:click={(e) => {
										e.preventDefault();
										pickTeam(aTeam.teamid);
									}}>
									{aTeam.teamid}
								</DropdownItem>
							{/each}
						</DropdownMenu>
					</Dropdown>
					<div class="mt-2">
						<span>
							{$_('start.recentTeam')}
						</span>
						{#each recentTeams as ateam, index (ateam)}
							<Button
								class="mx-1 badge bg-light text-primary border border-primary"
								on:click={(e) => {
									e.preventDefault();
									team_id_for_search = ateam;
									pickTeam(ateam);
								}}>
								{ateam}
							</Button>
						{/each}
					</div>
				</Col>
			</Row>
			{#if theTeam}
				<div class="text-center fs-4">Team {theTeam.teamid}</div>
				{#each roles as aRole (aRole)}
					<Card>
						<CardHeader><CardTitle>{aRole}</CardTitle></CardHeader>
						<CardBody>
							<CardText>
								{#each theTeam.tmap[aRole] as aMember (aMember.eid)}
									<Badge
										pill
										color="light"
										class="kfk-tag border border-primary text-primary">
										{aMember.cn} &lt;{aMember.eid}&gt;
									</Badge>
								{/each}
							</CardText>
						</CardBody>
					</Card>
				{/each}
			{/if}
		</Form>
	</Container>
{:else}
	<Container class="mt-3 w-50">
		<Row
			cols="2"
			style="margin-top: 20px;">
			{#if startedWorkflow}
				<div class="w-100 text-center">
					{TimeTool.fromNow(startedWorkflow.ts)}
				</div>
				<Button
					class="w-100 mb-5"
					color="primary"
					on:click={(e) => {
						e.preventDefault();
						goto(`/workflow/${startedWorkflow.wfid}`);
					}}>
					{$_('start.checkitout')}
				</Button>
				<Button
					class="w-100 mb-5"
					color="primary"
					on:click={(e) => {
						e.preventDefault();
						goto(`/workflow/${startedWorkflow.wfid}/monitor`);
					}}>
					{$_('start.monitorit')}
				</Button>
				<Button
					class="w-100 mb-5"
					color="primary"
					on:click={(e) => {
						e.preventDefault();
						starting = 0;
						goto(`/workflow/${startedWorkflow.wfid}/gotofirststep`);
					}}>
					{$_('start.firststep')}
				</Button>
				<Button
					class="w-100 mb-5"
					color="primary"
					on:click={(e) => {
						e.preventDefault();
						starting = 0;
						startedWorkflow = null;
					}}>
					{$_('start.startanother')}
				</Button>
			{/if}
		</Row>
	</Container>
{/if}
<div style="height:200px;">&nbsp;</div>
<Modal
	isOpen={showConfirmModal}
	{toggle}
	{fullscreen}>
	<ModalHeader {toggle}>{$_('start.pleaseConfirm')}</ModalHeader>
	<ModalBody>
		{#if textPbo.trim().length === 0 && uploadedFiles.length === 0}
			<div>{$_('start.warnNoPbo')}</div>
		{/if}
		{#if wftitle.trim().length === 0}
			<div>{$_('start.warnNoTitle')}</div>
		{/if}
	</ModalBody>
	<ModalFooter>
		<Button
			color="primary"
			on:click={() => {
				toggle();
				_startWorkflow(START_MODE_RUN);
			}}>
			{$_('start.startAnyway')}
		</Button>
		<Button
			color="secondary"
			on:click={toggle}>
			Cancel
		</Button>
	</ModalFooter>
</Modal>
