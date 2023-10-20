<script lang="ts">
	import { pageName } from '$lib/Stores';
	import { Button, Container, Row, Col, InputGroup, InputGroupText, Input } from 'sveltestrap';
	import { _ } from '$lib/i18n';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { User, EmpResponse } from '$lib/types';
	import { onMount } from 'svelte';
	import { setFadeMessage } from '$lib/Notifier';
	import type { KFKError } from '$lib/types';
	import * as api from '$lib/api';

	interface Bot {
		tplid: string;
		key: string;
	}

	let bots: Bot[] = [];
	const setWeComTodoBot = async (bot: Bot) => {
		bot.tplid = bot.tplid.trim();
		if (bot.tplid.length === 0) {
			return;
		} else {
			if (bot.key.length !== 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'.length) {
				setFadeMessage($_('setting.wecombot.keyformaterror'), 'warning');
				bot.key = '';
				bots = bots;
			} else {
				//POST这个新的key
				await api.post(
					'wecombot/todo/set',
					bot as unknown as Record<string, any>,
					$page.data.user.sessionToken,
				);
				//再次拉取已有KEY
				refreshKeys();
			}
		}
	};
	const delWeComTodoBot = async (bot: Bot) => {
		bot.tplid = bot.tplid.trim();
		if (bot.tplid.length === 0) {
			return;
		}
		await api.post('wecombot/todo/del', { tplid: bot.tplid }, $page.data.user.sessionToken);
		//再次拉取已有KEY
		refreshKeys();
	};
	const refreshKeys = async () => {
		api.post('wecombot/todo/get', {}, $page.data.user.sessionToken).then((res) => {
			if ((res as unknown as KFKError).error) {
				setFadeMessage((bots as unknown as KFKError).message, 'warning');
			} else {
				bots = res;
			}
		});
	};

	onMount(async () => {
		$pageName = $_('setting.tab.wecombot');
		refreshKeys().then();
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
					{$_('setting.wecombot.nav')}
				</li>
			</ol>
		</nav>
	</Row>
	{#each bots as bot}
		<Row
			cols="1"
			class="mt-1">
			<Col>
				<InputGroup class="mb-1">
					<InputGroupText>{$_('setting.wecombot.tplid')}</InputGroupText>
					<input
						class="form-control"
						type="text"
						bind:value={bot.tplid} />
					<InputGroupText>{$_('setting.wecombot.key')}</InputGroupText>
					<input
						class="form-control"
						type="text"
						bind:value={bot.key} />
					<Button
						on:click={async (e) => {
							e.preventDefault();
							setWeComTodoBot(bot).then(() => {});
						}}>
						{$_('setting.set')}
					</Button>
					<Button
						on:click={async (e) => {
							e.preventDefault();
							delWeComTodoBot(bot).then(() => {});
						}}>
						{$_('button.delete')}
					</Button>
				</InputGroup>
			</Col>
		</Row>
	{/each}
	<Row>
		<Button
			on:click={async (e) => {
				e.preventDefault();
				bots.push({ tplid: '', key: '' });
				bots = bots;
			}}>
			{$_('setting.wecombot.addone', {
				values: { number: bots.length },
			})}
		</Button>
	</Row>
</Container>
