<script lang="ts">
	import { pageName } from '$lib/Stores';
	import * as api from '$lib/api';
	import { _ } from '$lib/i18n';
	import { toast } from '$lib/Toast';
	import { onMount, tick } from 'svelte';
	import Menu from '$lib/menu/Menu.svelte';
	import { menuDataForSetting } from '$lib/menu/MenuData';
	import type { menuDataType } from '$lib/menu/MenuData';
	import { Button, InputGroup, Input } from 'sveltestrap';
	import type { PageData } from './$types';
	export let data: PageData;
	let { user } = data;
	$: ({ user } = data);

	let theMenu: any;

	interface withLevel {
		level: number;
	}
	type menuDefType = menuDataType & withLevel;

	const menu = {
		menuDefs: {} as Record<string, string>,
		menus: [] as menuDefType[],
		newEntry: (ser: number, parent?: menuDefType): menuDefType => {
			return {
				level: parent ? parent.level + 1 : 0,
				id: `Menu-${ser + 1}`,
				alias: '',
				href: '',
				parent: parent,
			} as menuDefType;
		},
		addEntry: (parent?: menuDefType) => {
			if (parent) {
				if (!parent.sub) parent.sub = [] as menuDefType[];
				parent.sub.push(menu.newEntry(parent.sub.length, parent));
			} else {
				menu.menus.push(menu.newEntry(menu.menus.length));
			}
			menu.menus = menu.menus;
		},
		deleteEntry: (entry: menuDefType, index: number) => {
			if (entry.parent) {
				entry.parent.sub?.splice(index, 1);
			} else {
				menu.menus.splice(index, 1);
			}
		},
		canIndent: (entry: menuDefType, index: number) => {
			if (index <= 0) return false;
			if (menu.menus[index - 1].level != entry.level) return false;
			return true;
		},
	};
	let menuGroups = ['', 'self'];
	let selectedMenuGroup = '';
	let newMenuGroupName = '';
	let newMenuDef = '';

	const saveMenuGroup = async () => {
		if (!selectedMenuGroup) {
			return;
		}
		try {
			const theJson = JSON.parse(newMenuDef);
			$menuDataForSetting = theJson;
			menu.menuDefs[newMenuGroupName] = JSON.stringify(theJson, null, 2);
			api
				.post(
					'/menu/mg/save',
					{ mg: newMenuGroupName, def: $menuDataForSetting },
					user.sessionToken,
				)
				.then(() => {
					theMenu.__refreshMenu();
					if (newMenuGroupName !== selectedMenuGroup && menuGroups.indexOf(newMenuGroupName) < 0) {
						menuGroups = [...menuGroups, newMenuGroupName];
						selectedMenuGroup = newMenuGroupName;
					}
					toast(`${newMenuGroupName} saved`);
				});
		} catch (e: any) {
			toast(e.message);
		}
	};

	const deleteMenuGroup = async () => {
		if (!selectedMenuGroup) {
			return;
		}
		try {
			const theJson = JSON.parse(newMenuDef);
			$menuDataForSetting = theJson;
			menu.menuDefs[newMenuGroupName] = JSON.stringify(theJson, null, 2);
			api.post('/menu/mg/delete', { mg: newMenuGroupName }, user.sessionToken).then(() => {
				delete menu.menuDefs[newMenuGroupName];
				menuGroups = Object.keys(menu.menuDefs);
				theMenu.__refreshMenu();
				toast(`${newMenuGroupName} deleted`);
			});
		} catch (e: any) {
			toast(e.message);
		}
	};

	const toggleMenuGroup = () => {
		if (!selectedMenuGroup) {
			return;
		}
		console.log(menu.menuDefs);
		newMenuGroupName = selectedMenuGroup;
		newMenuDef = menu.menuDefs[selectedMenuGroup];
		$menuDataForSetting = JSON.parse(newMenuDef);
		theMenu.__refreshMenu();
	};

	const loadFromServer = async () => {
		const res = await api.post('menu/load/foredit', {}, user.sessionToken);
		console.log('==for edit===');
		console.log(res);
		console.log('=============');
		if (res.length && res.length > 0) {
			for (let i = 0; i < res.length; i++) {
				menu.menuDefs[res[i].mg] = JSON.stringify(res[i].def, null, 2);
			}
		} else {
			menu.menuDefs = {
				self: JSON.stringify(
					[
						{
							id: 'menu01',
							alias: 'Menu01',
							icon: 'person',
							href: '/work',
						},
						{
							id: 'menu02',
							alias: 'Menu02',
							icon: 'person',
							href: '/work',
							sub: [
								{
									id: 'menu0201',
									alias: 'Menu0201',
									icon: 'person',
									href: '/work',
								},
								{
									id: 'menu0202',
									alias: 'Menu0202',
									icon: 'person',
									href: '/work',
								},
							],
						},
						{
							id: 'menu02',
							alias: 'Menu02',
							icon: 'person',
							href: '/template',
						},
					],
					null,
					2,
				),
			};
		}
		menuGroups = Object.keys(menu.menuDefs);
		//menuGroups.unshift('');
	};

	let avoidTooMuchRequestTimer: ReturnType<typeof setTimeout> | undefined;
	const handleInput = (e: Event) => {
		e.preventDefault();
		if (avoidTooMuchRequestTimer) {
			clearTimeout(avoidTooMuchRequestTimer);
		}
		avoidTooMuchRequestTimer = setTimeout(async () => {
			//TODO
			tick().then(async () => {
				await saveMenuGroup();
				avoidTooMuchRequestTimer = undefined;
			});
		}, 200);
	};

	onMount(async () => {
		$pageName = $_('setting.tab.menu');
		await loadFromServer();
	});
</script>

<div class="row row-cols-2">
	<div class="col">
		<select
			class="form-select"
			bind:value={selectedMenuGroup}
			on:change={toggleMenuGroup}>
			<option value="">{$_('setting.menu.pickone')}</option>
			{#each menuGroups as mg}<option value={mg}>{mg}</option>{/each}
		</select>
		{#if selectedMenuGroup}
			<Menu
				dataMode={'editting'}
				bind:this={theMenu} />
		{/if}
	</div>
	<div>
		{#if selectedMenuGroup}
			<InputGroup>
				<Input bind:value={newMenuGroupName} />
				<Button on:click={saveMenuGroup}>{$_('button.save')}</Button>
				<Button on:click={deleteMenuGroup}>{$_('button.delete')}</Button>
			</InputGroup>
			{#if user.group !== 'ADMIN' && newMenuGroupName !== 'self'}
				{$_('setting.menu.onlySelfIsUseful')}
			{/if}
			<InputGroup size="sm">
				<Input
					type="textarea"
					style="height: 100vh;"
					on:input={handleInput}
					bind:value={newMenuDef} />
			</InputGroup>
		{/if}
	</div>
</div>
