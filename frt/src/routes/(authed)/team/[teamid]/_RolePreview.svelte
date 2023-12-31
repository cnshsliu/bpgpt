<script lang="ts">
	import { _ } from '$lib/i18n';
	import { API_SERVER } from '$lib/Env';
	import * as api from '$lib/api';
	import type { User, Team, TmapEntry } from '$lib/types';
	import { Container, Row, Col, Icon } from 'sveltestrap';
	import Spinner from '$lib/Spinner.svelte';
	import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Badge } from 'sveltestrap';
	import { enhance, enhanceAddOneRoleMember } from '$lib/form';
	import { ClientPermControl } from '$lib/clientperm';
	import Parser from '$lib/parser';
	export let team: Team;
	export let aRole: string;
	export let mouseover_objid: string;
	export let deleteRole: { (arg: string): void };
	export let refreshTeam: { (arg: Team): void };
	export let errmsg = '';

	export let form_id = '';
	export let user: User;

	let checkingMsg = '';
	let checkingStatus = '';
	let newEid: string;
	let urls = {
		role_member_add: `${API_SERVER}/team/role/member/add`,
		role_copy: `${API_SERVER}/team/role/copy`,
	};

	function show_form(theRole: string, action: string): void {
		form_id = action + '_' + theRole;
	}
	function deleteMember(aTeam: Team, aRole: string, aMember: TmapEntry) {
		let payload = { teamid: aTeam.teamid, role: aRole, eids: [aMember.eid] };
		const token = user.sessionToken;
		setTimeout(async () => {
			//eslint-disable-next-line
			team = (await api.post('team/role/member/delete', payload, token)) as Team;
		}, 10);
	}

	let check_timer: ReturnType<typeof setTimeout> | undefined;
	let ok_user = {};
	const onInputNewUid = function (e: Event) {
		checkingMsg = 'Checking...';
		checkingStatus = 'LOADING';
		if (check_timer) clearTimeout(check_timer);
		check_timer = setTimeout(async () => {
			let ret = await api.post('check/coworker', { whom: newEid }, user.sessionToken);
			if (ret) {
				if (ret.error) {
					checkingMsg = ret.message;
					checkingStatus = 'wrong';
				} else {
					ok_user = { eid: ret.eid, cn: ret.username };
					checkingMsg = `${ret.nickname}(${ret.eid})`;
					checkingStatus = 'good';
				}
			} else {
				checkingStatus = 'wrong';
				checkingMsg = `${newEid} does not exist`;
			}
			check_timer = undefined;
		}, 1000);
	};
</script>

<Container class={mouseover_objid === aRole ? 'kfk-highlight-2' : ''}>
	<Row>
		<Col xs="6">
			<div>
				<span class="preview-link kfk-team-id">
					{aRole}
				</span>
			</div>
		</Col>
		{#if ClientPermControl(user.perms, user.eid, 'team', team, 'update')}
			<Col xs="4" class="d-flex justify-content-end">
				{#if mouseover_objid === aRole}
					<a class="btn btn-sm" href={'#'} on:click|preventDefault={() => show_form(aRole, 'add')}>
						<Icon name="person-plus-fill" />
						{$_('button.add')}
					</a>
					<a class="btn btn-sm" href={'#'} on:click|preventDefault={() => show_form(aRole, 'copy')}>
						<Icon name="files" />
						{$_('button.copy')}
					</a>
				{/if}
			</Col>
			<Col xs="2">
				{#if mouseover_objid === aRole}
					<Dropdown class="kfk-role-action-icon">
						<DropdownToggle caret color="notexist" class="btn-sm">
							{$_('button.more')}
						</DropdownToggle>
						<DropdownMenu>
							<DropdownItem class="kfk-role-action-icon">
								<a href={'#'} on:click|preventDefault={() => deleteRole(aRole)} class="nav-link ">
									<Icon name="trash" />
									{$_('button.delete')}
								</a>
							</DropdownItem>
						</DropdownMenu>
					</Dropdown>
				{/if}
			</Col>
		{/if}
	</Row>
	{#if ClientPermControl(user.perms, user.eid, 'team', team, 'update')}
		<Row>
			<Col xs="12">
				{#if form_id === `add_${aRole}`}
					<form>
						Eid:
						<input
							name="eid"
							placeholder="Employee id"
							autocomplete="off"
							bind:value={newEid}
							on:input={onInputNewUid} />

						<input type="hidden" name="teamid" value={team.teamid} />
						<input type="hidden" name="role" value={aRole} />
						<Button
							color="primary"
							type="submit"
							size="sm"
							on:click={async (e) => {
								e.preventDefault();
								if (checkingStatus !== 'good') return;
								let retObj = await api.post(
									'team/role/member/add',
									{ teamid: team.teamid, role: aRole, members: [ok_user] },
									user.sessionToken,
								);
								if (retObj.error) {
									checkingMsg = retObj.message;
									console.error(retObj.message);
									checkingStatus = 'wrong';
								} else {
									team = retObj;
									checkingMsg = 'Success';
									checkingStatus = 'waiting';
								}
								newEid = '';
							}}
							disabled={checkingStatus !== 'good'}>
							{$_('button.add')}
						</Button>
						{#if errmsg !== ''}{errmsg}{/if}
						<Spinner bind:status={checkingStatus} bind:msg={checkingMsg} />
					</form>
				{/if}
				{#if form_id === `copy_${aRole}`}
					<form
						action={urls.role_copy}
						method="post"
						use:enhance={{
							token: user.sessionToken,
							result: async (res, form) => {
								const retObj = await res.json();
								if (retObj.error) {
									errmsg = retObj.errMsg;
								} else {
									team = retObj;
									refreshTeam(team);
									form.reset();
									errmsg = '';
								}
							},
						}}>
						Copy to role:
						<input name="newrole" placeholder="Copy to role" autocomplete="off" />
						<input type="hidden" name="teamid" value={team.teamid} />
						<input type="hidden" name="role" value={aRole} />
						<Button color="primary" type="submit" size="sm">Copy</Button>
						{#if errmsg !== ''}{errmsg}{/if}
					</form>
				{/if}
			</Col>
		</Row>
	{/if}
	<Row>
		<Col xs="12">
			<div style="margin-bottom:10px;">
				{#if team.tmap[aRole]}
					{#each team.tmap[aRole] as aMember (aMember.eid)}
						<Badge pill color="light" class="kfk-tag border border-primary text-primary">
							{aMember.cn} &lt;{aMember.eid}&gt;
							{#if ClientPermControl(user.perms, user.eid, 'team', team, 'update')}
								<a
									href={'#'}
									on:click|preventDefault={() => {
										deleteMember(team, aRole, aMember);
									}}>
									<Icon name="x" />
								</a>
							{/if}
						</Badge>
					{/each}
				{/if}
			</div>
		</Col>
	</Row>
</Container>
