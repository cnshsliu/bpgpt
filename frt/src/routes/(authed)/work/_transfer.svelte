<script lang="ts">
	import { _ } from '$lib/i18n';
	import { Button, Input, InputGroup, InputGroupText } from 'sveltestrap';
	import { page } from '$app/stores';
	import * as api from '$lib/api';
	import { goto } from '$app/navigation';
	import type { Work } from '$lib/types';
	export let work: Work;
	let transferee = '';
	let input_class = '';
	let status = '';
	let msg = '';
	let check_timer: ReturnType<typeof setTimeout> | undefined = undefined;

	const checkTransfeee = async function () {
		status = 'checking';
		input_class = '';
		msg = '';
		if (check_timer) clearTimeout(check_timer);
		check_timer = setTimeout(async () => {
			let ret = await api.post(
				'check/coworker',
				{ whom: transferee },
				$page.data.user.sessionToken,
			);
			if (ret) {
				if (ret.error) {
					status = 'wrong';
					input_class = 'input_wrong';
					msg = ret.message;
				} else {
					status = 'good';
					input_class = 'input_good';
					msg = `${ret.nickname}(${ret.eid})`;
				}
			} else {
				status = 'wrong';
				input_class = 'input_wrong';
				msg = `${transferee} does not exist`;
			}
			check_timer = undefined;
		}, 1000);
	};
</script>

{#if work.transferable}
	{$_('todo.transferable')}
	<InputGroup>
		<InputGroupText>
			{$_('todo.transferto')}
		</InputGroupText>
		<Input
			type="text"
			placeholder="whom? "
			bind:value={transferee}
			on:input={checkTransfeee}
			class={input_class} />
		<Button
			disabled={status !== 'good'}
			on:click={async (e) => {
				e.preventDefault();
				await api.post(
					'transfer/work',
					{
						todoid: work.todoid,
						whom: transferee,
					},
					$page.data.user.sessionToken,
				);
				goto('/work');
			}}>
			{$_('todo.transfer')}
		</Button>
	</InputGroup>
	{msg}
{/if}
