<script lang="ts">
	import { pageName } from '$lib/Stores';
	import {
		Button,
		Container,
		Row,
		Col,
		InputGroup,
		InputGroupText,
		Input,
		Card,
		CardBody,
		CardFooter,
		CardHeader,
		CardSubtitle,
		CardText,
		CardTitle,
	} from 'sveltestrap';
	import TimeTool from '$lib/TimeTool';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { setFadeMessage } from '$lib/Notifier';
	import { onMount } from 'svelte';
	import { _ } from '$lib/i18n';
	import Parser from '$lib/parser';
	import type { User, EmpResponse } from '$lib/types';
	import { post } from '$lib/utils';
	import * as api from '$lib/api';

	let new_delegation_enddate: string,
		new_delegation_begindate: string,
		new_delegation_delegatee: string;
	let delegationFromMe: any[] = [];
	let delegationToMe: any[] = [];

	async function newDelegation() {
		let ret = await api.post(
			'delegation/new',
			{
				delegatee: new_delegation_delegatee,
				begindate: new_delegation_begindate,
				enddate: new_delegation_enddate,
			},
			$page.data.user.sessionToken,
		);
		if (ret.error) {
			setFadeMessage(Parser.normalizeServerErrorMessage(ret, $_), 'warning');
		} else if (ret.length) {
			delegationFromMe = ret;
			for (let i = 0; i < delegationFromMe.length; i++) {
				delegationFromMe[i].checked = false;
			}
		}
	}

	async function removeSelectedDelegation() {
		let ids = delegationFromMe.filter((x: any) => x.checked).map((x: any) => x._id);
		let res = await api.post('delegation/revoke', { ids: ids }, $page.data.user.sessionToken);
		if (res.error) {
			setFadeMessage(res.message, 'warning');
		} else {
			delegationFromMe = res;
		}
	}

	onMount(async () => {
		$pageName = $_('setting.tab.delegation');
		try {
			delegationFromMe = await api.post('delegation/from/me', {}, $page.data.user.sessionToken);
			for (let i = 0; i < delegationFromMe.length; i++) {
				delegationFromMe[i].checked = false;
			}
			delegationToMe = await api.post('delegation/to/me', {}, $page.data.user.sessionToken);
			for (let i = 0; i < delegationToMe.length; i++) {
				delegationToMe[i].checked = false;
			}
		} catch (e) {}
	});
</script>

<form>
	<Container class="mt-3">
		<Row>
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
						{$_('setting.delegation.nav')}
					</li>
				</ol>
			</nav>
		</Row>
		<div class="w-100 text-center fs-3">{$_('setting.delegation.delegation')}</div>
		<Card class="mt-3">
			<CardHeader><CardTitle>{$_('setting.delegation.delegateto')}</CardTitle></CardHeader>
			<CardBody>
				<InputGroup class="mb-1">
					<InputGroupText>{$_('setting.delegation.BeginDate')}</InputGroupText>
					<Input
						type="date"
						bind:value={new_delegation_begindate} />
					<InputGroupText>{$_('setting.delegation.EndDate')}</InputGroupText>
					<Input
						type="date"
						bind:value={new_delegation_enddate} />
				</InputGroup>
				<InputGroup class="mb-1">
					<InputGroupText>{$_('setting.delegation.towhom')}</InputGroupText>
					<Input
						bind:value={new_delegation_delegatee}
						placeholder={$_('setting.delegation.delegatee_eid')} />
					<Button
						on:click={(e) => {
							e.preventDefault();
							newDelegation();
						}}>
						{$_('setting.delegation.Delegate')}
					</Button>
				</InputGroup>
			</CardBody>
		</Card>

		<Card class="mt-3">
			<CardHeader><CardTitle>{$_('setting.delegation.fromme')}</CardTitle></CardHeader>
			<CardBody>
				<table class="w-100">
					<thead>
						<tr>
							<th>{$_('setting.delegation.BeginDate')}</th>
							<th>{$_('setting.delegation.EndDate')}</th>
							<th>{$_('setting.delegation.Delegatee')}</th>
							<th>&nbsp;</th>
						</tr>
					</thead>
					<tbody>
						{#each delegationFromMe as row, index (row)}
							<tr
								class:kfk-odd={index % 2 !== 0}
								class:kfk-even={index % 2 === 0}
								class:tnt-odd={index % 2 !== 0}
								class:tnt-even={index % 2 === 0}>
								<td data-label="Begin Date">
									{TimeTool.format(row.begindate, 'YYYY/MM/DD')}
								</td>
								<td data-label="Before Date">
									{TimeTool.format(row.enddate, 'YYYY/MM/DD', -1)}
								</td>
								<td data-label="Delegatee">
									{row.delegatee}
								</td>
								<td data-label="Delegatee">
									<Input
										type="checkbox"
										bind:checked={row.checked} />
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</CardBody>
			<CardFooter>
				<Row class="">
					<Col class="d-flex justify-content-end">
						<Button
							on:click={(e) => {
								e.preventDefault();
								removeSelectedDelegation();
							}}>
							{$_('setting.delegation.removeSelected')}
						</Button>
					</Col>
				</Row>
			</CardFooter>
		</Card>

		<Card class="mt-3">
			<CardHeader><CardTitle>{$_('setting.delegation.tome')}</CardTitle></CardHeader>
			<CardBody>
				<table class="w-100">
					<thead>
						<tr>
							<th>{$_('setting.delegation.BeginDate')}</th>
							<th>{$_('setting.delegation.EndDate')}</th>
							<th>{$_('setting.delegation.Delegator')}</th>
							<th>&nbsp;</th>
						</tr>
					</thead>
					<tbody>
						{#each delegationToMe as row, index (row)}
							<tr
								class:kfk-odd={index % 2 !== 0}
								class:kfk-even={index % 2 === 0}
								class:tnt-odd={index % 2 !== 0}
								class:tnt-even={index % 2 === 0}>
								<td data-label="Begin Date">
									{TimeTool.format(row.begindate, 'DD/MM/YYYY')}
								</td>
								<td data-label="Before Date">
									{TimeTool.format(row.enddate, 'DD/MM/YYYY')}
								</td>
								<td data-label="Delegatee">
									{row.delegator}
								</td>
								<td data-label="Delegatee">
									<Input
										type="checkbox"
										bind:checked={row.checked}
										style="visibility:hidden" />
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</CardBody>
			<!-- CardFooter>
				<div class="w-100 text-right">
					<Button
						on:click={(e) => {
							e.preventDefault();
							removeSelectedDelegation();
						}}
					>
						{$_('setting.delegation.removeSelected')}
					</Button>
				</div>
			</CardFooter -->
		</Card>
	</Container>
</form>
