<script lang="ts">
	import { pageName } from '$lib/Stores';
	import { onMount } from 'svelte';
	import { _ } from '$lib/i18n';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { OrgChartEntry } from '$lib/types';
	import TenantMenu from '$lib/tenantMenu.svelte';
	import * as api from '$lib/api';
	import { Row, Col, Container, Button } from 'sveltestrap';
	import BadgeWithDel from '$lib/input/BadgeWithDel.svelte';
	import OrgChartMaintainer from '$lib/orgchartMaintainer.svelte';
	import InputExandable from '$lib/input/InputExandable.svelte';
	import PDSResolver from '$lib/input/PDSResolver.svelte';
	import { setFadeMessage } from '$lib/Notifier';
	import type { SvelteComponent } from 'svelte';
	import type { PageData } from './$types';

	let orgchartlist: OrgChartEntry[] = [];
	let orgchartroot: OrgChartEntry | null = null;
	let posValue = '';
	let showOuId = true;
	let theOrgChartMaitainer: SvelteComponent;
	let selectedEntry = { ou: '', eid: '' };

	//从服务器端取回ou的下级条目
	async function expandOrgChartFromServer(ou: string, level: number, include: boolean = false) {
		let ret = await api.post(
			'orgchart/expand',
			{ ou: ou, include: include },
			$page.data.user.sessionToken,
		);
		if (!ret.map) {
			//如果返回值没有map方法,表明返回值不是一个数组
			console.log(ret);
			return;
		}
		ret = ret.map((x: OrgChartEntry) => {
			//为每一行设置level,children, display, position, icon, expanded等信息
			if (x) {
				x.level = level;
				x.number_of_children = 0;
				x.display = true;
				let tmp = x.position.filter((x) => x !== 'staff'); //一个用户的职位(数组)中去掉staff
				x.position = tmp;
				if (x.eid === 'OU---') {
					//如果当前entry是一个部门
					x.icon = 'bi-caret-right-fill'; //充满的向右三角形
					x.expanded = false; //部门,为收起状态
				} else {
					x.icon = 'bi-person-fill text-primary'; //icon是一个人
					x.expanded = false; //个人,为收起状态
				}
				return x;
			}
		});
		return ret;
	}

	//切换一个部门的展开/收起状态
	//ou: 当前ou的代码; level:当前ou的层级; ouIndex:当前ou的序列号
	async function toggleExpandOU(ou: string, level: number, ouIndex: number) {
		let indexInThisOU = 0;
		for (let i = 0; i < orgchartlist.length; i++) {
			if (orgchartlist[i].ou.startsWith(ou) === false) {
				continue;
			} else {
				if (indexInThisOU === 0) {
					//当前部门的第一条条目:
					////展开状态切换
					orgchartlist[i].expanded = !orgchartlist[i].expanded;
					////icon切换
					orgchartlist[i].icon = orgchartlist[i].expanded ? 'bi-caret-down' : 'bi-caret-right-fill';
					////显示
					orgchartlist[i].display = true;
				} else {
					if (orgchartlist[ouIndex].expanded === false) {
						//如果没有展开,则不显示
						orgchartlist[i].display = false;
					} else {
						if (
							//如果是当前部门内的条目
							orgchartlist[i].ou.length === orgchartlist[ouIndex].ou.length ||
							//或者刚好是当前部门的直接下一级部门
							(orgchartlist[i].eid === 'OU---' &&
								orgchartlist[i].ou.length === orgchartlist[ouIndex].ou.length + 5)
						) {
							//则显示这些条目
							orgchartlist[i].display = true;
						}
					}
				}
				indexInThisOU++;
			}
		}
		if (indexInThisOU === 1) {
			//如果当前部门内只有一条记录
			//则从服务器端刷新下级条目, level为当前level+1
			let ret = await expandOrgChartFromServer(ou, level + 1);
			//并展开当前条目
			orgchartlist[ouIndex].number_of_children = ret.length;
			orgchartlist[ouIndex].display = true;
			orgchartlist[ouIndex].expanded = true;
			for (let i = 0; i < ret.length; i++) {
				ret[i].dispaly = true;
				ret[i].expanded = false;
			}
			//在当前orgchartlist数组,当前ouIndex后面,插入从服务器返回的数据
			orgchartlist.splice(ouIndex + 1, 0, ...ret);
		}
		//通过下面的赋值, 刷新界面
		orgchartlist = orgchartlist;
	}

	const addPosition = async (ou: string, eid: string, pos: string): Promise<string[] | null> => {
		let res = await api.post(
			'orgchart/addpos',
			{ ou: ou, eid: eid, pos: pos },
			$page.data.user.sessionToken,
		);
		if (res.error) {
			setFadeMessage(res.message, 'warning');
			return null;
		} else {
			setFadeMessage('Success', 'success');
			return res.position;
		}
	};

	let resolver_label = '';
	let myorg: any = {
		owner: '',
	};

	export let data: PageData;
	export let errors: any;
	let { user } = data;
	$: ({ user } = data);

	async function refreshMyOrg() {
		myorg = await api.post('tnt/my/org', {}, $page.data.user.sessionToken);
		console.log(myorg);
	}
	const refreshOrgChart = async () => {
		//从root开始,刷新orgchart,
		let tmp = await expandOrgChartFromServer('root', 0, true);
		let ous = [];
		//root下面取得的条目, 如果eid==="OU---",表示该条目为组织,将root下面的组织
		//加入到ous数组
		for (let i = 0; i < tmp.length; i++) {
			if (tmp[i]?.eid === 'OU---') {
				ous.push(tmp[i]);
			}
		}
		orgchartroot = tmp[0];
		orgchartlist = tmp.splice(1);
	};

	let isOneOfOrgChartAdmins = false;
	onMount(async () => {
		$pageName = $_('setting.tab.orgchart');
		resolver_label = $_('setting.orgchart.resolver_label');
		await refreshMyOrg();
		await refreshOrgChart();

		// debugger
		const tmpArr = myorg.orgchartadmins.filter((x: any) => x.eid === $page.data.user.eid);
		isOneOfOrgChartAdmins = myorg.adminorg || tmpArr.length > 0;
	});

	/*
	let authorizedAdmin = false;

	api.post('orgchart/authorized/admin', {}, $page.data.user.sessionToken).then((res) => {
		authorizedAdmin = res as unknown as boolean;
	});
	*/
</script>

<form>
	<Container class="mt-3 mb-3 text-nowrap">
		<Row>
			<TenantMenu />
		</Row>
		{#if orgchartroot && orgchartroot.ou === 'root'}
			{orgchartroot.cn}
			<Button
				on:click={(e) => {
					e.preventDefault();
					refreshOrgChart();
				}}
				color="primary">
				{$_('setting.orgchart.btn.refresh')}
			</Button>
			{#each orgchartlist as oce, index (oce)}
				{#if oce.display === true}
					<Row>
						<Col class="kfk-tag">
							{#if oce.eid === 'OU---'}
								<div
									class={'clickable kfk-link ' +
										(oce.ou === selectedEntry.ou && oce.eid === selectedEntry.eid
											? 'kfk-current'
											: '')}
									style={`padding-left:${20 * oce.level}px;`}
                  role="none"
									on:keydown={() => {}}
									on:keyup={() => {}}
									on:keypress={() => {}}
									on:click={(e) => {
										e.preventDefault();
										theOrgChartMaitainer.setPickedOU({ ou: oce.ou, cn: oce.cn });
										selectedEntry = { ou: oce.ou, eid: 'OU---' };
										toggleExpandOU(oce.ou, oce.level, index);
									}}>
									<i class={oce.icon} />
									<!--[E: {oce.expanded} D:{oce.display}]-->
									{oce.cn}
									{oce.number_of_children ? `[${oce.number_of_children}]` : ''}
									{showOuId ? oce.ou : ''}
								</div>
							{:else}
								<div
									class={'clickable kfk-link ' +
										(oce.ou === selectedEntry.ou && oce.eid === selectedEntry.eid
											? 'kfk-current'
											: '')}
									style={`padding-left:${20 * oce.level}px;`}
                  role="none"
									on:keydown={() => {}}
									on:keyup={() => {}}
									on:keypress={() => {}}
									on:click={(e) => {
										e.preventDefault();
										selectedEntry = { ou: oce.ou, eid: oce.eid };
										theOrgChartMaitainer.setPickedStaff({ ou: oce.ou, eid: oce.eid, cn: oce.cn });
									}}>
									<i
										class={oce.icon}
										color="primary" />
									<!-- [E: {oce.expanded} D:{oce.display}] -->
									{oce.cn}
									({oce.eid})
									{#if oce.position && Array.isArray(oce.position)}
										{#each oce.position as aPos}
											<BadgeWithDel
												bind:text={aPos}
												withDeleteButton={isOneOfOrgChartAdmins}
												on:delete={async () => {
													let res = await api.post(
														'orgchart/delpos',
														{ ou: oce.ou, eid: oce.eid, pos: aPos },
														$page.data.user.sessionToken,
													);
													if (res.error) {
														setFadeMessage(res.message, 'warning');
													} else {
														oce.position = res.position;
													}
												}} />
										{/each}
									{/if}
									{#if isOneOfOrgChartAdmins}
										<InputExandable
											bind:value={posValue}
											on:input={async (e) => {
												e.preventDefault();
												const positions = await addPosition(oce.ou, oce.eid, e.detail);
												if (positions) {
													oce.position = positions.filter((x) => x !== 'staff');
												}
											}} />
									{/if}
								</div>
							{/if}
						</Col>
					</Row>
				{/if}
			{/each}
		{/if}
	</Container>
</form>
<Container>
	<PDSResolver
		class="mt-3"
		bind:label={resolver_label}
		embed={true} />
	<div>{$_('setting.orgchart.comment')}</div>
</Container>

{#if isOneOfOrgChartAdmins}
	<div>
		<svelte:component
			this={OrgChartMaintainer}
			bind:this={theOrgChartMaitainer}
			on:refreshOrgChart={async (e) => {
				await refreshOrgChart();
			}} />
	</div>
{/if}
{#if errors?.description}
	<p class="error">{errors.description}</p>
{/if}
