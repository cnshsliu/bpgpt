<script lang="ts">
	import { pageName } from '$lib/Stores';
	import { _, date, time } from '$lib/i18n';
	import * as api from '$lib/api';
	import { setFadeMessage } from '$lib/Notifier';
	import { onMount, onDestroy } from 'svelte';

	import type { PageData } from './$types';
	import EidInput from '$lib/input/EidInput.svelte';

	export let data: PageData;
	let { user } = data;
	$: ({ user } = data);

	let recentUsers: string[] = [];

	onMount(async () => {
		$pageName = $_('navmenu.flexible');
		if (localStorage) {
			recentUsers = JSON.parse(localStorage.getItem('recentUsers') ?? JSON.stringify([]));
		}
	});

	onDestroy(async () => {});

	let flexible = { name: '', toWhom: user.eid };
	const startFlexible = async () => {
		let res = await api.post('flexible/start', flexible, user.sessionToken);
		if (res.error) {
			setFadeMessage(res.message, 'warning');
		} else {
			setFadeMessage($_('message.success'));
			saveOneRecentUser(flexible.toWhom);
		}
	};

	const saveOneRecentUser = function (user: string) {
		let tmp = recentUsers.indexOf(user);
		if (tmp > -1) {
			recentUsers.splice(tmp, 1);
		}
		recentUsers.unshift(user);
		if (recentUsers.length > 10) {
			recentUsers.splice(10);
		}
		localStorage.setItem('recentUsers', JSON.stringify(recentUsers));
		recentUsers = recentUsers;
	};
</script>

<div class="container p-2">
	<div class="row my-3 text-center">
		<span class="fs-1">{$_('flexible.title')}</span>
		<br />
		{$_('flexible.subtitle')}
	</div>
	<!-- 创建灵活事项的表单-->
	<div class="row my-3">
		<div class="input-group">
			<!-- svelte-ignore a11y-autofocus -->
			<input
				class="form-control ms-auto"
				bind:value={flexible.name}
				placeholder={$_('flexible.placeholder')}
				autofocus />
			<span class="input-group-text">
				<div
					class="btn btn-primary"
          role="none"
					on:keydown={() => {}}
					on:keyup={() => {}}
					on:keypress={() => {}}
					on:click|preventDefault={(e) => {
						e.preventDefault();
						startFlexible();
					}}>
					{$_('flexible.btn_create')}
				</div>
			</span>
		</div>
	</div>
	<div class="row">
		<EidInput
			preText={$_('flexible.forWhom')}
			bind:recentUsers
			bind:eid={flexible.toWhom} />
	</div>
</div>
