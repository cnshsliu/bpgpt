<script lang="ts">
	import { pageName } from '$lib/Stores';
	import {
		Button,
		Container,
		Label,
		Row,
		Col,
		Badge,
		InputGroup,
		InputGroupText,
		Input,
	} from 'sveltestrap';
	import TimeZone from '$lib/Timezone';
	import TenantMenu from '$lib/tenantMenu.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/Toast';
	import Parser from '$lib/parser';
	import { setFadeMessage } from '$lib/Notifier';
	import type { User, EmpResponse, OrgMembers, OrgMember } from '$lib/types';
	import { onMount } from 'svelte';
	import { _ } from '$lib/i18n';
	import * as api from '$lib/api';
	import type { PageData } from './$types';
	export let data: PageData;
	export let errors: any;
	let { user } = data;
	$: ({ user } = data);
	let isOneOfOrgChartAdmins = false;

	let myorg: any = {
		owner: '',
	};

	let password_for_admin = '';
	let set_group_to = '';
	let set_menugroup_to = '';
	let set_password_to = '';
	let availableMenuGroups: string[] = [];

	async function refreshMyOrg() {
		myorg = await api.post('tnt/my/org', {}, $page.data.user.sessionToken);
	}

	let orgMembers: OrgMember[];
	async function refreshMembers() {
		orgMembers = (await api.post(
			'tnt/employees',
			{
				active: 3,
			},
			$page.data.user.sessionToken,
		)) as OrgMember[];
		if (orgMembers && orgMembers.length > 0) {
			//当前用户放到最顶部，并且不支持被选中
			let selfTemp = orgMembers.filter((x) => x.eid === $page.data.user.eid);
			orgMembers = orgMembers.filter((x) => x.eid !== $page.data.user.eid);
			orgMembers.unshift({
				eid: $page.data.user.eid,
				account: $page.data.user.account,
				nickname: $page.data.user.nickname,
				group: $page.data.user.group,
				mg: selfTemp && selfTemp.length ? selfTemp[0].mg : $page.data.user.mg,
				checked: false,
			});
			for (let i = 0; i < orgMembers.length; i++) {
				orgMembers[i].checked = false;
			}
		}
	}
	async function removeSelectedMembers() {
		let ems = orgMembers
			//过滤掉组织owner
			.filter((x) => x.account !== $page.data.user.tenant.owner)
			//过滤掉当前用户
			.filter((x) => x.eid !== $page.data.user.eid)
			.filter((x) => x.checked)
			.map((x) => x.eid);
		// .join(':');
		let res = await api.post('tnt/employee/remove', { eids: ems }, $page.data.user.sessionToken);
		if (res.error) {
			setFadeMessage(res.message, 'warning');
		} else {
			refreshMembers();
		}
	}

	async function setSelectedGroup() {
		let eids = orgMembers
			//过滤掉组织owner
			.filter((x) => x.account !== $page.data.user.tenant.owner)
			//过滤掉当前用户
			.filter((x) => x.eid !== $page.data.user.eid)
			.filter((x) => x.checked)
			.map((x) => x.eid);
		let res = await api.post(
			'tnt/employee/setgroup',
			{ eids, group: set_group_to },
			$page.data.user.sessionToken,
		);
		if (res.error) {
			setFadeMessage(res.message, 'warning');
		} else {
			refreshMembers();
		}
	}
	async function setSelectedMenuGroup() {
		let eids = orgMembers.filter((x) => x.checked).map((x) => x.eid);
		let res = await api.post(
			'tnt/employee/setmenugroup',
			{ eids, menugroup: set_menugroup_to },
			$page.data.user.sessionToken,
		);
		if (res.error) {
			toast(res.message);
		} else {
			refreshMembers();
		}
	}
	async function setSelectedPassword() {
		let eids: string[] = [];
		//Tenant的所有者,可以修改任何人的密码
		if ($page.data.user.account === $page.data.user.tenant.owner) {
			eids = orgMembers.filter((x) => x.checked).map((x) => x.eid);
		} else if ($page.data.user.group === 'ADMIN') {
			//普通管理员只能修改自己和非ADMIN的密码
			eids = orgMembers
				.filter((x) => x.eid === $page.data.user.eid || x.group !== 'ADMIN')
				.filter((x) => x.checked)
				.map((x) => x.eid);
		}
		let res = await api.post(
			'tnt/employee/setpassword',
			{ eids, set_password_to: set_password_to },
			$page.data.user.sessionToken,
		);
		if (res.error) {
			setFadeMessage(Parser.normalizeServerErrorMessage(res, $_), 'warning');
		} else {
			setFadeMessage($_('notify.set_password_success'), 'success');
		}
	}

	const toggleOneMenuGroup = (amg: string) => {
		let tmp = set_menugroup_to.split(/[;|\s|,]/).filter((x) => x.trim().length > 0);
		if (tmp.indexOf(amg) >= 0) tmp.splice(tmp.indexOf(amg), 1);
		else tmp.push(amg);
		if (tmp.length > 1 && tmp.indexOf('default') >= 0) {
			tmp.splice(tmp.indexOf('default'), 1);
		} else if (tmp.length === 0) tmp = ['default'];
		set_menugroup_to = tmp.join('; ');
	};

	const getAvailableMenuGroups = async () => {
		const res = await api.post('/menu/load/available', {}, user.sessionToken);
		if (res.length) {
			availableMenuGroups = res;
		} else {
			availableMenuGroups = ['运营管理', '销售管理', '工程管理'];
		}
	};

	onMount(async () => {
		$pageName = $_('setting.tab.members');
		try {
			await refreshMyOrg();
			await refreshMembers();
			await getAvailableMenuGroups();
			const tmpArr = myorg.orgchartadmins.filter((x: any) => x.eid === user.eid);
			isOneOfOrgChartAdmins = myorg.adminorg || tmpArr.length > 0;
		} catch (e) {
			console.error(e);
		}
	});

	let firstSelected = -1;

	const checkFirstChecked = (member: OrgMember, index: number) => {
		if (firstSelected < 0) {
			firstSelected = index;
			set_menugroup_to = orgMembers[index].mg;
		}
	};

	$: selected_members = orgMembers?.filter((x) => x.checked);
	$: selected_members &&
		(() => {
			if (selected_members.length < 1) {
				firstSelected = -1;
			}
		})();
</script>

<form>
	<Container class="mt-3">
		<Row>
			<TenantMenu />
		</Row>
		{#if myorg.adminorg === false && myorg.owner === $page.data.user.account}
			<div class="w-100 text-center fs-3">
				{$_('setting.members.onlyyou')}
			</div>
		{/if}

		{#if orgMembers && orgMembers.length > 0}
			<div class="w-100 text-center fs-3">{$_('setting.members.members')}</div>
			<Col>
				<table class="w-100 mt-3">
					<thead>
						<tr>
							<th>{$_('setting.members.account')}</th>
							<th>{$_('setting.members.name')}</th>
							<th>
								{$_('setting.members.group')}
							</th>
							<th>
								{$_('setting.members.menugroup')}
							</th>
							<th>{myorg.adminorg ? $_('setting.members.select') : ''}</th>
						</tr>
					</thead>
					<tbody>
						{#each orgMembers as member, index (member)}
							<tr
								class:kfk-odd={index % 2 !== 0}
								class:kfk-even={index % 2 === 0}
								class:tnt-odd={index % 2 !== 0}
								class:tnt-even={index % 2 === 0}>
								<td data-label="Eid">
									{member.eid} ({member.account})
								</td>
								<td data-label="Name">
									{member.nickname}
								</td>
								<td data-label="Group">
									{member.group}
								</td>
								<td data-label="MenuGroup">
									{member.mg}
								</td>
								<td>
									<!-- Tenant owner 不能被选中, 因此不能被修改 -->
									<!-- 只有当当前用户是组织管理员之一,才能选择修改 -->
									{#if isOneOfOrgChartAdmins}
										<Input
											type="checkbox"
											bind:checked={member.checked}
											on:change={(e) => {
												checkFirstChecked(member, index);
											}}
											id={`member_check_${index}`} />
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</Col>
			<!-- Col class="d-flex justify-content-end mt-2">
				<InputGroup class="mb-1">
					<InputGroupText>{$_('setting.adminpwd')}</InputGroupText>
					<Input
						type="password"
						bind:value={password_for_admin}
						placeholder={$_('setting.adminpwd_ph')} />
				</InputGroup>
			</Col -->
			{#if selected_members.length > 0 && isOneOfOrgChartAdmins}
				<Col class="d-flex justify-content-center mt-2 fs-1">
					{$_('notify.employee_account_selected', {
						values: { number: selected_members.length },
					})}
				</Col>
				<Col class="d-flex justify-content-end mt-2">
					<InputGroup class="mb-1">
						<InputGroupText>
							{$_('setting.members.removeselected', {
								values: { number: selected_members.length },
							})}?
						</InputGroupText>
						<Button
							on:click={(e) => {
								e.preventDefault();
								removeSelectedMembers();
							}}>
							{$_('setting.members.remove', {
								values: { number: selected_members.length },
							})}
						</Button>
					</InputGroup>
				</Col>
				<Col class="d-flex justify-content-end mt-2">
					<InputGroup class="mb-1">
						<Label for="groupSelect">
							{$_('setting.members.setgroup', {
								values: { number: selected_members.length },
							})}
						</Label>
						<Input
							type="select"
							name="select"
							id="groupSelect"
							bind:value={set_group_to}>
							<option value="ADMIN">{$_('authgroup.ADMIN')}</option>
							<option value="OBSERVER">{$_('authgroup.OBSERVER')}</option>
							<option value="DOER">{$_('authgroup.DOER')}</option>
						</Input>
						<Button
							on:click={(e) => {
								e.preventDefault();
								setSelectedGroup();
							}}>
							{$_('setting.set')}
						</Button>
					</InputGroup>
				</Col>
				<Col class="d-flex justify-content-end mt-2">
					<InputGroup class="mb-1">
						<Label for="menugroupSelect">
							{$_('setting.members.setmenugroup', {
								values: { number: selected_members.length },
							})}
						</Label>
						<Input
							id="menugroup"
							bind:value={set_menugroup_to} />
						<Button
							on:click={(e) => {
								e.preventDefault();
								setSelectedMenuGroup();
							}}>
							{$_('setting.set')}
						</Button>
					</InputGroup>
				</Col>
				<Col class="d-flex justify-content-center mt-2">
					{#each availableMenuGroups as amg}
						<Button
							size="sm"
							color="light"
							class="pill kfk-tag border border-primary text-primary"
							on:click={(e) => {
								toggleOneMenuGroup(amg);
							}}>
							{amg}
						</Button>
					{/each}
				</Col>
				<Col class="d-flex justify-content-end mt-2">
					<InputGroup class="mb-1">
						<Label for="groupSelect">
							{$_('setting.members.setpwd', {
								values: { number: selected_members.length },
							})}
						</Label>
						<Input
							type="password"
							id="password_for_selected"
							autocomplete="new-password"
							bind:value={set_password_to} />
						<Button
							on:click={(e) => {
								e.preventDefault();
								setSelectedPassword();
							}}>
							{$_('setting.set')}
						</Button>
					</InputGroup>
				</Col>
			{/if}
		{/if}
	</Container>
</form>

{#if errors?.description}
	<p class="error">{errors.description}</p>
{/if}
