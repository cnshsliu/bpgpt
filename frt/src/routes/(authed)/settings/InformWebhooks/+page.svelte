<script lang="ts">
	import { pageName } from '$lib/Stores';
	// Suggestion (check code before using, and possibly convert to data.X access later):
	// /** @type {import('./$types').PageData} */

	import { InputGroup, InputGroupText, Input, Button } from 'sveltestrap';
	import { _ } from '$lib/i18n';
	import { onMount } from 'svelte';
	import * as api from '$lib/api';
	import type { PageData } from './$types';
	export let data: PageData;
	$: ({ user, setFadeMessage, webhook_setting } = data);

	const setWebhookWeComBotKey = async (e) => {
		let tmp = (await api.post(
			'webhook/wecombot/set',
			{ setting: webhook_setting.wecombot_key },
			user.sessionToken,
		)) as unknown as any;
		if (tmp.error) {
			setFadeMessage(tmp.message, 'warning');
		} else {
			webhook_setting.wecombot_key = tmp;
		}
	};

	onMount(async () => {
		$pageName = $_('setting.tab.wecombot');
		let tmp = (await api.post('webhook/wecombot/get', {}, user.sessionToken)) as unknown as any;
		if (tmp.error) {
			setFadeMessage(tmp.message, 'warning');
		} else {
			webhook_setting.wecombot_key = tmp;
		}
	});
</script>

<InputGroup class="mb-1">
	<InputGroupText>{$_('setting.personal.webhook.wecombot.key')}</InputGroupText> &nbsp;&nbsp;
	<span class="form-control">
		<Input bind:value={webhook_setting.wecombot_key} />
	</span>
	<Button
		on:click={async (e) => {
			e.preventDefault();
			await setWebhookWeComBotKey(e);
		}}>
		{$_('setting.set')}
	</Button>
</InputGroup>
<InputGroup>Note: How to get your WeCom bot webhook key</InputGroup>
