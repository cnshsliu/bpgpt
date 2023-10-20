<script lang="ts">
	import { Input } from 'sveltestrap';
	import { createEventDispatcher } from 'svelte';
	import { page } from '$app/stores';
	import * as api from '$lib/api';
	import type { EmpResponse } from '$lib/types';

	const dispatch = createEventDispatcher();

	export let kvar: any;
	//MOCK START
	//MOCK END
	export let data: any;
	let { user } = data;
	$: ({ user } = data);
	let list: any[] = [];
	let serverListName = '';
	let tobeTriggeredSelectName = '';
	export let whichtoChange = '';
	export let serverListKey = '';

	const getRT = function (str: string) {
		let ret: any = null;
		let match = str.match(/[r|R|t|T]:\s*([^;\s]+)/g);
		if (match) {
			for (let i = 0; i < match.length; i++) {
				if (match[i].startsWith('R:')) {
					if (ret === null) ret = {};
					ret.R = match[i].substring(2).trim();
				} else if (match[i].startsWith('T:')) {
					if (ret === null) ret = {};
					if (!ret.T) ret.T = [];
					let aT = match[i].substring(2).trim();
					ret.T.push(aT);
				}
			}
		}
		return ret;
	};
	const listToSelectOptionsPair = function (list: any) {
		list = list.map((x: any) => ({ value: x, display: x }));
		if (list.length === 0) {
			list.push({ value: '', display: '--Empty--' });
		} else {
			list.unshift({ value: '', display: '--Select--' });
		}
		return list;
	};

	let joinedOptions = kvar.options.join(';');
	let rT = getRT(joinedOptions);
	if (rT) {
		serverListName = rT.R;
		if (rT.T) {
			tobeTriggeredSelectName = rT.T.join(';');
			//Get list from serverListName (aka, rT.R);
			setTimeout(async () => {
				list = (await api.post(
					'list/get/items',
					{
						name: serverListName,
						key: serverListKey,
					},
					user.sessionToken,
				)) as unknown as any[];
				if ((list as EmpResponse).error) {
					list = listToSelectOptionsPair([]);
				} else {
					list = listToSelectOptionsPair(list);
				}
			});
		}
	} else {
		list = kvar.options;
		list = listToSelectOptionsPair(list);
	}

	const onListChange = function (e: any) {
		let selectedValue = e.target.value;
		dispatch('changelist', `${tobeTriggeredSelectName}/${selectedValue}`);
	};

	const refreshDataFromServerListWithKey = async function (serverListKey: string) {
		//list = ['new', 'data', 'from', 'server'];
		list = (await api.post(
			'list/get/items',
			{
				name: serverListName,
				key: serverListKey,
			},
			user.sessionToken,
		)) as unknown as any[];
		if ((list as EmpResponse).error) {
			list = listToSelectOptionsPair([]);
		} else {
			list = listToSelectOptionsPair(list);
		}
	};

	$: {
		if (whichtoChange.split(';').includes(kvar.name)) {
			setTimeout(async () => {
				await refreshDataFromServerListWithKey(serverListKey);
			});
		}
	}
</script>

<Input
	type="select"
	name={kvar.name}
	id={kvar.id ? kvar.id : kvar.name}
	bind:value={kvar.value}
	required={kvar.required}
	on:change={onListChange}>
	{#each list as item}
		<option value={item.value}>{item.display}</option>
	{/each}
</Input>
