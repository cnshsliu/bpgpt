<script lang="ts">
	import { pageName, reloadById } from '$lib/Stores';
	import * as api from '$lib/api';
	import { _ } from '$lib/i18n';
	import { toast } from '$lib/Toast';
	import { onMount, tick } from 'svelte';
	import { Table, Button, Input } from 'sveltestrap';
	import type { PageData } from './$types';
	import type { menuDataType } from '$lib/menu/MenuData';

	export let data: PageData;
	let { user } = data;
	$: ({ user } = data);
	interface withOther {
		level: number;
		edit: boolean;
	}
	type menuDefType = menuDataType & withOther;
	let menwDef = [] as menuDefType[];
	const loadFromServer = async () => {
		const res = await api.post('menu/load/forshow', {}, user.sessionToken);
		if (!res?.length) return;
		for (let i = 0; i < res.length; i++) {
			if (res[i].mg === 'EID_PERSONAL') {
				menwDef = res[i].def[0]?.sub || [];
			}
		}
	};

	const deletePersonalMenuItems = async (url) => {
		const params = {
			urls: [url],
		};
		// const res = await api.post('menu/personal/delete', params, user.sessionToken);
		api
			.post('menu/personal/delete', params, user.sessionToken)
			.then(async (res) => {
				if (res.code == 'Success') {
					toast(`menu deleted`);
					await loadFromServer();
					$reloadById = '__pmi__';
				}
			})
			.catch((e) => {
				toast(e.message);
			});
	};

	const updatePersonalMenuItems = async (item) => {
		const params = {
			pmis: [
				{
					url: item.href,
					pageName: item.alias,
				},
			],
		};
		// const res = await api.post('menu/personal/set', params, user.sessionToken);
		api
			.post('menu/personal/set', params, user.sessionToken)
			.then(async (res) => {
				if (res.code == 'Success') {
					toast(`menu updated`);
					await loadFromServer();
					$reloadById = '__pmi__';
				}
			})
			.catch((e) => {
				toast(e.message);
			});
	};
	const editOrSave = (item) => {
		if (!item.edit) {
			updatePersonalMenuItems(item);
		}
	};
	onMount(async () => {
		$pageName = $_('setting.tab.menu');
		await loadFromServer();
	});
</script>

<div class="row row-cols-2">
	<Table>
		<thead>
			<tr>
				<th>#</th>
				<th>名称</th>
				<th>路径</th>
				<th>操作</th>
			</tr>
		</thead>
		<tbody>
			{#each menwDef as item, i}
				<tr>
					<td>
						{i}
					</td>
					<td width="380rem">
						{#if item.edit}
							<Input
								type="text"
								bind:value={item.alias} />
						{:else}
							{item.alias}
						{/if}
					</td>
					<td>
						{item.href}
					</td>
					<td width="300rem">
						<Button
							size="sm"
							color="primary"
							on:click={async (e) => {
								e.preventDefault();
								item.edit = !item.edit;
								editOrSave(item);
							}}>
							{item.edit ? $_('button.save') : $_('button.update')}
						</Button>
						{#if item.edit}
							<Button
								size="sm"
								color="light"
								on:click={async (e) => {
									e.preventDefault();
									item.edit = false;
								}}>
								{$_('button.cancel')}
							</Button>
						{/if}

						<Button
							size="sm"
							color="danger"
							on:click={async (e) => {
								e.preventDefault();
								deletePersonalMenuItems(item.href);
							}}>
							{$_('button.delete')}
						</Button>
					</td>
					<!-- <td>
					<Input
						type="checkbox"
						bind:checked={item.checked} />
				</td> -->
				</tr>
			{/each}
		</tbody>
	</Table>
</div>
