<script lang="ts">
	import { pageName } from '$lib/Stores';
	import { onMount } from 'svelte';
	import * as api from '$lib/api';
	import { _ } from '$lib/i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { setFadeMessage } from '$lib/Notifier';
	import type { EmpResponse, OrgMembers, oneArgFunc } from '$lib/types';
	import {
		Container,
		Row,
		Col,
		Button,
		InputGroup,
		InputGroupText,
		Input,
		Badge,
	} from 'sveltestrap';
	let lists: any[] = [];
	const refreshList = async function () {
		lists = (await api.post('list/list', {}, $page.data.user.sessionToken)) as unknown as any[];
	};

	let newlist = { name: '', key: 'Default', items: '' };
	let newkey = '';
	let newitems = '';
	let newName = '';
	let updateList = '';
	let updateKey = '';
	let changeNameOf = '';
	let addKeyFor = '';

	refreshList();

	const updateThisList = async (list: any, entry: any) => {
		entry.items = entry.items
			.split(/[\s|;|,]/)
			.filter((x: string) => x.trim().length > 0)
			.join(';');
		let ret = await api.post(
			'list/set',
			{ name: list.name, key: entry.key, items: entry.items },
			$page.data.user.sessionToken,
		);
		if (ret.error) {
			setFadeMessage(ret.message, 'warning');
		} else {
			setFadeMessage('Success', 'success');
			updateList = '';
			updateKey = '';
		}
	};
	onMount(() => {
		$pageName = $_('setting.tab.list');
	});
</script>

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
					{$_('setting.list.nav')}
				</li>
			</ol>
		</nav>
	</Row>
	<Row>
		<span class="text-center fs-3">
			{$_('setting.list.new.label')}
		</span>
	</Row>
	<Row>
		<InputGroup>
			<InputGroupText>
				{$_('setting.list.new.name')}
			</InputGroupText>
			<Input bind:value={newlist.name} />
		</InputGroup>
		<InputGroup>
			<InputGroupText>
				{$_('setting.list.new.items')}
			</InputGroupText>
			<Input
				type="textarea"
				bind:value={newlist.items} />
			<Button
				color="primary"
				on:click={async (e) => {
					e.preventDefault();
					newlist.items = newlist.items.replace('；', ';');
					newlist.items = newlist.items.replace('，', ',');
					let ret = await api.post('list/set', newlist, $page.data.user.sessionToken);
					if (ret.error) {
						setFadeMessage(ret.message, 'warning');
					} else {
						setFadeMessage('Success', 'success');
						refreshList();
					}
				}}>
				Create
			</Button>
		</InputGroup>
	</Row>
	{#each lists as list}
		<Container class="border rounded border-3 mt-2 p-2">
			<Row
				cols="2"
				class="mt-2 bg-light mx-2 p-2">
				<Col class="fs-3">{list.name}</Col>
				<Col>
					{$_('setting.list.author')}
					{list.author}
				</Col>
			</Row>
			<Row
				cols="2"
				class="mt-0 bg-light mx-2 p-2">
				{#if list.author === $page.data.user.eid}
					<Col class="d-flex justify-content-end">
						<Button
							class="btn-sm m-2"
							color="primary"
							on:click={async (e) => {
								e.preventDefault();
								changeNameOf = list.name;
								newName = list.name;
								newlist.name = '';
								addKeyFor = '';
							}}>
							{$_('button.changeName')}
						</Button>
						{#if addKeyFor !== list.name}
							<Button
								class="btn-sm m-2"
								color="primary"
								on:click={async (e) => {
									e.preventDefault();
									addKeyFor = list.name;
									changeNameOf = '';
									newName = '';
									newkey = '';
									newitems = '';
								}}>
								{$_('button.addAKey')}
							</Button>
						{/if}
						<Button
							class="btn-sm m-2"
							color="primary"
							on:click={async (e) => {
								e.preventDefault();
								await api.post(
									'list/del/listorkey',
									{ name: list.name },
									$page.data.user.sessionToken,
								);
								refreshList();
							}}>
							{$_('button.delete')}
						</Button>
					</Col>
				{/if}
			</Row>
			<Row
				cols="2"
				class="mt-2 bg-light mx-2 p-2">
				{#if changeNameOf === list.name}
					{#if list.author === $page.data.user.eid}
						{$_('setting.list.changeNameForm.label')}
						<InputGroup>
							<InputGroupText>Key name</InputGroupText>
							<Input bind:value={newName} />
							<Button
								color="primary"
								on:click={async (e) => {
									e.preventDefault();
									let ret = await api.post(
										'list/change/name',
										{ name: list.name, newName: newName },
										$page.data.user.sessionToken,
									);
									if (ret.error) {
										setFadeMessage(ret.message, 'warning');
									} else {
										setFadeMessage('Success', 'success');
									}
								}}>
								{$_('button.change')}
							</Button>
							<Button
								on:click={(e) => {
									changeNameOf = '';
								}}>
								{$_('button.cancel')}
							</Button>
						</InputGroup>
					{:else}
						{$_('setting.list.error.authorNotYou')}
					{/if}
				{/if}
				{#if addKeyFor === list.name}
					{$_('setting.list.addKeyForm.label')}
					<InputGroup>
						<InputGroupText>
							{$_('setting.list.addKeyForm.newKeyName')}
						</InputGroupText>
						<Input bind:value={newkey} />
					</InputGroup>
					<InputGroup>
						<InputGroupText>
							{$_('setting.list.addKeyForm.listItems')}
						</InputGroupText>
						<Input
							type="textarea"
							bind:value={newitems} />
						<Button
							color="primary"
							on:click={async (e) => {
								e.preventDefault();
								let ret = await api.post(
									'list/set',
									{ name: list.name, key: newkey, items: newitems },
									$page.data.user.sessionToken,
								);
								if (ret.error) {
									setFadeMessage(ret.message, 'warning');
								} else {
									newkey = '';
									newitems = '';
									refreshList();
								}
							}}>
							{$_('button.add')}
						</Button>
						<Button
							on:click={(e) => {
								addKeyFor = '';
							}}>
							{$_('button.cancel')}
						</Button>
					</InputGroup>
				{/if}
			</Row>
			{#each list.entries as entry, keyindex}
				<Container class={'pb-2 ' + (keyindex < list.entries.length - 1 ? 'border-bottom' : '')}>
					<div class="mx-2 d-flex mt-2">
						<div class="flex-grow-1">
							<span class="fs-5">
								{$_('setting.list.keyHead', {
									values: { name: entry.key, index: keyindex + 1, total: list.entries.length },
								})}
							</span>
							<br />
							{#each entry.items.split(/[\s|;|,]/) as aItem}
								<Badge
									pill
									class="mx-1 bg-white border border-primary text-primary ">
									{aItem}
								</Badge>
							{/each}
						</div>
						<div>
							{#if updateList !== list.name || updateKey !== entry.key}
								<Button
									on:click={(e) => {
										e.preventDefault();
										updateList = list.name;
										updateKey = entry.key;
									}}>
									{$_('button.update')}
								</Button>
							{/if}
							<Button
								color="warning"
								on:click={async (e) => {
									e.preventDefault();
									await api.post(
										'list/del/listorkey',
										{ name: list.name, key: entry.key },
										$page.data.user.sessionToken,
									);
									refreshList();
								}}>
								{$_('button.delete')}
							</Button>
						</div>
					</div>
					{#if updateList === list.name && updateKey === entry.key}
						<Row class="mx-3">
							<Col>
								<InputGroup class="mt-1">
									<Input
										type="textarea"
										bind:value={entry.items} />
									<Button
										on:click={async (e) => {
											e.preventDefault();
											updateThisList(list, entry);
										}}>
										{$_('button.update')}
									</Button>
								</InputGroup>
							</Col>
						</Row>
					{/if}
				</Container>
			{/each}
		</Container>
	{/each}
</Container>
