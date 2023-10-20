<script lang="ts">
	import { pageName } from '$lib/Stores';
	import type { PageData } from './$types';

	import { _ } from '$lib/i18n';
	import { API_SERVER } from '$lib/Env';
	import { get } from 'svelte/store';
	import TimeTool from '$lib/TimeTool';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { WhichTab } from '$lib/types';
	import { whichTabStorage } from '$lib/mtcLocalStores';
	import { ClientPermControl } from '$lib/clientperm';
	import Parser from '$lib/parser';
	import * as api from '$lib/api';
	import { Container, Row, Col, Icon, Button, Fade, Card } from 'sveltestrap';

	import type { User, Team } from '$lib/types';
	import { enhance } from '$lib/form';
	import { TabContent, TabPane } from 'sveltestrap';
	export let data: PageData;
	let { user } = data;
	$: ({ user } = data);

	export let teams: Team[];
	export let config: any;
	export let lastSearchCondition: string = '';
	export let form_status: Record<string, boolean> = {
		create: false,
		search: false,
		sort: false,
		import: false,
	};
	import { title } from '$lib/title';
	$title = 'HyperFlow';
	export let form_name = '';
	export let menu_has_form = false;

	let urls = {
		import: `${API_SERVER}/team/import`,
		create: `${API_SERVER}/team/create`,
		search: `${API_SERVER}/team/search`,
	};
	interface teamRow {
		teamid: string;
		author: string;
		updatedAt: string;
	}

	let rows: teamRow[] = [];
	let rowsCount = 0;
	function hide_all_form() {
		Object.keys(form_status).forEach((key: string) => {
			form_status[key] = false;
		});
		form_name = '';
		menu_has_form = false;
	}
	function show_form(form_name: string) {
		hide_all_form();
		form_status[form_name] = true;
		form_name = form_name;
		menu_has_form = true;
	}
	function sortBy(field: string, order: number) {
		config.sort = { field, order };
		teams = teams.sort((a, b): number => {
			let A: number | string = field === 'name' ? a.teamid : Date.parse(a.updatedAt);
			let B: number | string = field === 'name' ? b.teamid : Date.parse(b.updatedAt);
			if (A === B) {
				return 0;
			} else if (A > B) {
				return order;
			} else return 0 - order;
		});
	}
	let files: FileList;
	let theSearchForm;
	let dataFile = null;
	let teamidImport: string;

	function upload(e: Event) {
		e.preventDefault();
		if (ClientPermControl(user.perms, user.eid, 'team', '', 'create') === false) {
			setFadeMessage("You don't have create team permission");
			return;
		}
		const formData = new FormData();
		formData.append('teamid', teamidImport);
		formData.append('file', files[0]);
		const upload = fetch(urls.import, {
			method: 'POST',
			headers: {
				Authorization: user.sessionToken,
			},
			body: formData,
		})
			.then((response) => response.json())
			.then((result) => {
				console.log('Success:', result);
				rows = [result, ...rows];
			})
			.catch((error) => {
				console.error('Error:', error);
			});
	}
	let whichTab: WhichTab = get(whichTabStorage);
	async function showTab(tabId: string | number) {
		whichTab = get(whichTabStorage);
		if (whichTab) {
			whichTab['team'] = tabId.toString();
			whichTabStorage.set(whichTab);
		}
	}

	let fade_message = '';
	let fade_timer: any;
	function setFadeMessage(message: string, time = 2000) {
		fade_message = message;
		if (fade_timer) clearTimeout(fade_timer);
		fade_timer = setTimeout(() => {
			fade_message = '';
		}, time);
	}

	async function deleteRow(tid: string) {
		await api.post('team/delete', { teamid: tid }, user.sessionToken);
		let deletedIndex = -1;
		for (let i = 0; i < rows.length; i++) {
			if (rows[i].teamid === tid) {
				deletedIndex = i;
				break;
			}
		}
		if (deletedIndex >= 0) {
			rows.splice(deletedIndex, 1);
			rows = rows;
			rowsCount = rowsCount - 1;
		}
	}

	onMount(async () => {
		$pageName = $_('setting.team.nav');
		const data = await api.post('team/search', { sort_field: 'name' }, user.sessionToken);
		rows = data.objs;
		rowsCount = data.total;
	});
</script>

<Container>
	<Row class="mt-3">
		<nav aria-label="breadcrumb">
			<ol class="breadcrumb">
				<li class="breadcrumb-item kfk-tag">
					<a
						class="kfk-link"
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
					{$_('setting.team.nav')}
				</li>
			</ol>
		</nav>
	</Row>
	<Row>
		<div class="d-flex">
			<div class="flex-shrink-0 fs-3">{$_('setting.team.title')}</div>
			<div class="mx-5 align-self-center flex-grow-1">&nbsp;</div>
		</div>
	</Row>
</Container>
<Container>
	<TabContent
		class="kfk-tab-menu"
		on:tab={(e) => {
			showTab(e.detail);
		}}>
		<TabPane
			tabId="search"
			active={!whichTab || whichTab['team'] === 'search'}>
			<span slot="tab">
				<Icon name="code-square" />
				{$_('setting.team.list')}
			</span>
			<div class="mx-3">
				{$_('setting.team.body')}
			</div>
		</TabPane>
		<TabPane
			tabId="create"
			active={whichTab && whichTab['team'] === 'create'}>
			<span slot="tab">
				<Icon name="plus-circle" />
				{$_('setting.team.create')}
			</span>
			<form
				class="new"
				action={urls.create}
				method="post"
				use:enhance={{
					preCheck: () => {
						return ClientPermControl(user.perms, user.eid, 'team', '', 'create');
					},
					token: user.sessionToken,
					result: async (res, form) => {
						const created = await res.json();
						if (created.error) {
							if (created.errMsg.indexOf('duplicate key error') > 0) {
								console.warn('Dupliated key', '//TODO');
							} else console.error(created.error);
						} else {
							lastSearchCondition = created.teamid;
							rows = [created, ...rows];
							rowsCount = rowsCount + 1;
						}
						form.reset();
						//form_status['create'] = false;
					},
				}}>
				<Container>
					<Row>
						<Col>
							<input
								name="teamid"
								aria-label="Create team"
								placeholder="New team name"
								class="kfk-input-team-name" />
						</Col>
						<Col>
							<Button
								size="sm"
								type="submit"
								color="primary">
								{$_('button.create')}
							</Button>
							<Button
								size="sm"
								on:click={hide_all_form}
								color="secondary">
								{$_('button.cancel')}
							</Button>
						</Col>
					</Row>
				</Container>
			</form>
		</TabPane>
		<TabPane
			tabId="import"
			active={whichTab && whichTab['team'] === 'import'}>
			<span slot="tab">
				<Icon name="cloud-upload" />
				{$_('setting.team.import')}
			</span>
			<form
				class="new"
				enctype="multipart/form-data">
				<Container>
					<Row>
						<Col>
							<input
								name="teamid"
								placeholder="New team name"
								class="kfk-input-team-name"
								bind:value={teamidImport} />
						</Col>
						<Col>
							<input
								name="file"
								type="file"
								class="kfk_input_team_name"
								bind:files />
						</Col>
						<Col>
							<Button
								size="sm"
								on:click={upload}
								color="primary">
								{$_('button.import')}
							</Button>
							<Button
								size="sm"
								on:click={hide_all_form}
								color="secondary">
								{$_('button.cancel')}
							</Button>
						</Col>
					</Row>
				</Container>
			</form>
		</TabPane>
	</TabContent>
</Container>
{#if rows && rows.length > 0}
	<Container class="mt-3">
		{#each rows as row, index (row)}
			<div
				class="row"
				class:kfk-odd={index % 2 !== 0}
				class:kfk-even={index % 2 === 0}
				class:tnt-odd={index % 2 !== 0}
				class:tnt-even={index % 2 === 0}>
				<div
					class="col"
					data-label="Name">
					<a
						class="preview-link kfk-team-id tnt-team-id"
						href="/team/{row.teamid}">
						{row.teamid}
					</a>
				</div>
				<div
					class="col-auto"
					data-label="Author">
					{row.author}
				</div>
				<div
					class="col-auto"
					data-label="Updated at">
					{TimeTool.format(row.updatedAt, 'YYYY/MM/DD')}
				</div>
				<div class="col-auto">
					{#if user.perms && ClientPermControl(user.perms, user.eid, 'team', row, 'delete')}
						<a
							href={'#'}
							on:click|preventDefault={() => deleteRow(row.teamid)}
							class="nav-link ">
							<Icon name="trash" />
							{$_('setting.team.deletethisteam')}
						</a>
					{/if}
				</div>
			</div>
		{/each}
	</Container>
{/if}
