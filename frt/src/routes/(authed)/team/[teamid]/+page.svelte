<script lang="ts">
	import { pageName } from '$lib/Stores';
	import { _ } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { API_SERVER } from '$lib/Env';
	import type { User, Team } from '$lib/types';
	import { TabContent, TabPane } from 'sveltestrap';
	import RolePreview from './_RolePreview.svelte';
	import { scale } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { title } from '$lib/title';
	import { goto } from '$app/navigation';
	import * as api from '$lib/api';
	import { Container, Row, Col, Nav, Icon, NavItem, NavLink } from 'sveltestrap';
	import { enhance } from '$lib/form';
	import { ClientPermControl } from '$lib/clientperm';
	let { team, export_to_filename } = $page.data;
	export let mouseover_objid: string = '';

	export let newrole = '';
	//$title = team.teamid;
	$title = 'HyperFlow';

	$: team_json_string = JSON.stringify(team, null, 2);
	$: roles = team ? (typeof team.tmap === 'undefined' ? [] : Object.keys(team.tmap)) : [];

	export let menu_has_form = false;
	let form_status: Record<string, boolean> = {
		create: false,
		search: false,
		sort: false,
		import: false,
		export: false,
		rename: false,
		copyto: false,
		delete: false,
	};
	export let form_name = '';
	export let errmsg = '';
	const user: User = $page.data.user;

	let fade_message = '';
	let fade_timer: any;
	function setFadeMessage(message: string, time = 2000) {
		fade_message = message;
		if (fade_timer) clearTimeout(fade_timer);
		fade_timer = setTimeout(() => {
			fade_message = '';
		}, time);
	}

	$: topmenu_class = form_name === '' ? '' : 'whiteback';
	function hide_all_form() {
		Object.keys(form_status).forEach((key) => {
			form_status[key] = false;
		});
		form_name = '';
		menu_has_form = false;
		errmsg = '';
	}
	function show_form(what: string) {
		hide_all_form();
		form_status[what] = true;
		form_name = what;
		menu_has_form = true;
	}
	function show_delete_team_modal() {
		hide_all_form();
	}
	const deleteRole = (name: string): void => {
		setTimeout(async () => {
			let ret = await api.post(
				'team/role/delete',
				{ teamid: team.teamid, role: name },
				user.sessionToken,
			);
			refreshTeam(ret as Team);
		}, 1);
	};
	function delete_team() {
		hide_all_form();
		setTimeout(async () => {
			let ret = await api.post('team/delete', { teamid: team.teamid }, user.sessionToken);
			goto('/team', { replaceState: false });
		}, 1);
	}
	function removeElementsByClass(className: string) {
		const elements = document.getElementsByClassName(className);
		while (elements.length > 0) {
			elements[0].parentNode?.removeChild(elements[0]);
		}
	}

	function export_team() {
		if (export_to_filename.endsWith('.csv'))
			export_to_filename = export_to_filename.substring(0, export_to_filename.lastIndexOf('.csv'));
		api
			.post(
				'team/download',
				{ teamid: team.teamid, filename: export_to_filename },
				user.sessionToken,
			)
			.then((response) => {
				const url = window.URL.createObjectURL(new Blob([response]));
				removeElementsByClass('tempLink');
				const link = document.createElement('a');
				link.href = url;
				link.setAttribute('download', `${export_to_filename}.csv`); //or any other extension
				link.setAttribute('class', 'tempLink');
				document.body.appendChild(link);
				//点击这个临时连接实现内容下载
				link.click();
				hide_all_form();
			});
	}
	let files: any[];
	function upload(e: Event) {
		e.preventDefault();
		const formData = new FormData();
		formData.append('teamid', team.teamid);
		formData.append('file', files[0]);
		const upload = fetch(`${API_SERVER}/team/import`, {
			method: 'POST',
			headers: {
				Authorization: user.sessionToken,
			},
			body: formData,
		})
			.then((response) => response.json())
			.then((result) => {
				team = result;
			})
			.catch((error) => {
				console.error('Error:', error);
			});
		hide_all_form();
	}

	export function refreshTeam(ateam: Team): void {
		team = ateam;
		$title = team.teamid;
	}

	let urls = {
		create: `${API_SERVER}/team/create`,
		rename: `${API_SERVER}/team/rename`,
		copyto: `${API_SERVER}/team/copyto`,
		role_member_add: `${API_SERVER}/team/role/member/add`,
	};

	async function showTab(tabId: string | number) {
		return;
	}
	function setMouseFocus() {}
	function setMouseOverObjid(objid: string): void {
		mouseover_objid = objid;
	}

	onMount(() => {
		$pageName = $_('setting.team.nav') + ': ' + team.teamid;
	});
</script>

<svelte:head>
	<title>{team.teamid} • Team</title>
</svelte:head>
<Container>
	<Row>
		<nav aria-label="breadcrumb">
			<ol class="breadcrumb">
				<li class="breadcrumb-item">
					<a
						href={'#'}
						on:click={() => {
							goto('/settings');
						}}>
						{$_('navmenu.settings')}
					</a>
				</li>
				<li
					class="breadcrumb-item active"
					aria-current="page">
					<a
						href={'#'}
						on:click={() => {
							goto('/team');
						}}>
						{$_('setting.team.nav')}
					</a>
				</li>
				<li
					class="breadcrumb-item active"
					aria-current="page">
					{team.teamid}
				</li>
			</ol>
		</nav>
	</Row>
</Container>
<Container>
	<TabContent
		class="kfk-tab-menu"
		on:tab={(e) => {
			showTab(e.detail);
		}}>
		<TabPane
			tabId="Search"
			active>
			<span slot="tab">
				<Icon name="person-lines-fill" />{$_('setting.team.tabs.team.label')}
			</span>
			<div class="mx-3">
				{$_('setting.team.tabs.team.currentteamis', {
					values: { teamid: team.teamid },
				})}
			</div>
		</TabPane>
		<TabPane tabId="export">
			<span slot="tab">
				<Icon name="cloud-download" />
				{$_('setting.team.tabs.export.label')}
			</span>
			<div class="mx-3">
				{$_('setting.team.tabs.export.exportTo', { values: { teamid: team.teamid } })}
				<input
					name="exorttoname"
					placeholder="Export to file"
					class="kfk_input_team_name"
					bind:value={export_to_filename}
					autocomplete="off" />
				<button class="btn btn-primary"
					on:click={() => export_team()}
					color="primary">
					{$_('button.export')}
				</button>
				{#if errmsg !== ''}{errmsg}{/if}
			</div>
		</TabPane>
		{#if ClientPermControl(user.perms, user.eid, 'team', team, 'update')}
			<TabPane tabId="rename">
				<span slot="tab">
					<Icon name="input-cursor-text" />
					{$_('setting.team.tabs.rename.label')}
				</span>
				<div class="mx-3">
					<form
						action={urls.rename}
						method="post"
						use:enhance={{
							token: user.sessionToken,
							result: async (res, form) => {
								const newTeam = await res.json();
								if (newTeam.error) {
									errmsg = newTeam.errMsg;
									if (errmsg.indexOf('MongoError: E11000 duplicate key error') >= 0) {
										errmsg = '同名模板已存在, 请重新录入';
									}
								} else {
									refreshTeam(newTeam);
									goto(`/team/${team.teamid}`, {
										replaceState: true,
										keepfocus: true,
										noscroll: true,
									});
									form_status['rename'] = false;
									form.reset();
									errmsg = '';
								}
								hide_all_form();
							},
						}}>
						{$_('setting.team.tabs.rename.renameTo', { values: { teamid: team.teamid } })}
						<input
							name="teamid"
							placeholder="Rename: new team name"
							class="kfk_input_team_name"
							value={team.teamid}
							autocomplete="off" />
						<input
							type="hidden"
							name="fromid"
							value={team.teamid} />
						<button class="btn btn-primary"
              type="submit">
							{$_('button.rename')}
						</button>
						{#if errmsg !== ''}{errmsg}{/if}
					</form>
				</div>
			</TabPane>
		{/if}
		<TabPane tabId="copyto">
			<span slot="tab">
				<Icon name="files" />
				{$_('setting.team.tabs.copyto.label')}
			</span>

			<div class="mx-3">
				<form
					action={urls.copyto}
					method="post"
					use:enhance={{
						token: user.sessionToken,
						result: async (res, form) => {
							const newTeam = await res.json();
							if (newTeam.error) {
								errmsg = newTeam.errMsg;
								if (errmsg.indexOf('MongoError: E11000 duplicate key error') >= 0) {
									errmsg = '同名Team已存在, 请重新录入';
								}
							} else {
								refreshTeam(newTeam);
								goto(`/team/${team.teamid}`, {
									replaceState: true,
									noscroll: true,
									keepfocus: true,
								});
								form_status['copyto'] = false;
								form.reset();
								errmsg = '';
							}
							hide_all_form();
						},
					}}>
					{$_('setting.team.tabs.copyto.copyTo', { values: { teamid: team.teamid } })}
					<input
						name="teamid"
						placeholder="New team name"
						class="kfk_input_team_name"
						value={team.teamid}
						autocomplete="off" />
					<input
						type="hidden"
						name="fromid"
						value={team.teamid} />
					<button class="btn btn-primary"
            type="submit">
						{$_('button.copy')}
					</button>
					{#if errmsg !== ''}{errmsg}{/if}
				</form>
			</div>
		</TabPane>
		{#if ClientPermControl(user.perms, user.eid, 'team', team, 'delete')}
			<TabPane tabId="delete">
				<span slot="tab">
					<Icon name="trash" />
					{$_('setting.team.tabs.delete.label')}
				</span>
				<div class="mx-3">
					{$_('setting.team.tabs.delete.areYouSure', { values: { teamid: team.teamid } })} &nbsp;
					<button class="btn btn-primary"
            on:click={() => delete_team()}>
						{$_('button.delete')}
					</button>
					{#if errmsg !== ''}{errmsg}{/if}
				</div>
			</TabPane>
		{/if}
	</TabContent>
</Container>
<Container class="mt-3">
	{#if ClientPermControl(user.perms, user.eid, 'team', team, 'update')}
		<Row>
			<Col>
				<form
					action={urls.role_member_add}
					method="post"
					use:enhance={{
						token: user.sessionToken,
						result: async (res, form) => {
							const retObj = await res.json();
							if (retObj.error) {
								errmsg = retObj.errMsg;
							} else {
								team = retObj;
								form.reset();
								errmsg = '';
							}
						},
					}}>
					<h4>{$_('setting.team.tabs.team.addNewRole')}:</h4>
					<input
						name="role"
						bind:value={newrole}
						autocomplete="off" />
					<input
						type="hidden"
						name="teamid"
						value={team.teamid} />
					<button
            class="btn btn-primary"
						type="submit"
						size="sm">
						{$_('button.add')}
					</button>
					<button
            class="btn"
						size="sm"
						on:click={(e) => {
							e.preventDefault();
							newrole = '';
						}}
						color="secondary">
						{$_('button.reset')}
					</button>
					{#if errmsg !== ''}{errmsg}{/if}
				</form>
			</Col>
		</Row>
	{/if}
	<Row class="mt-5">
		<Col xs="12">
			<h4>{$_('setting.team.tabs.team.Roles', { values: { teamid: team.teamid } })}</h4>
		</Col>
	</Row>
	<Row>
		<Col xs="12">
			{#if roles.length === 0}
				<div class="article-preview">{$_('setting.team.tabs.team.noRole')}</div>
			{:else}
				{#each roles as aRole (aRole)}
					<div
						class="mt-3"
            role="none"
						transition:scale={{ start: 0.7 }}
						animate:flip={{ duration: 200 }}
						on:focus={() => setMouseFocus()}
						on:mouseover={() => setMouseOverObjid(aRole)}>
						<RolePreview
							{team}
							{user}
							{aRole}
							{mouseover_objid}
							{deleteRole}
							{refreshTeam} />
					</div>
				{/each}
			{/if}
		</Col>
	</Row>
</Container>
