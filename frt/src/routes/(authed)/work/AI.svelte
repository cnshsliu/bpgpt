<script lang="ts">
	import { onMount } from 'svelte';
	import * as empApi from '$lib/api';
	import Parser from '$lib/parser';
	export let ai: string;
	import type { User, Work } from '$lib/types';
	export let work: Work;
	import { page } from '$app/stores';
	let user: User = $page.data.user;

	const AiController = {
		pre: {
			answer: '',
			working: false,
		},
	};

	const processAI = async (theAI: any) => {
		if (theAI.pre && theAI.pre.enable) {
			// Post AI request to server, with work object, to avoid parse work information again on server
			//since the work variables already been parsed on server.
			//TODO: ask server to process AI request in queue, and check answer every 3 seconds.
			//Once got result, stop checking.
			AiController.pre.working = true;
			const { ai, ...workCopy } = work;
			const aiTicket = await empApi.post(
				'ai/ask',
				{
					work: workCopy,
					ai: theAI.pre,
				},
				user.sessionToken,
			);
			const checkPreAIResultInterval = setInterval(async () => {
				let res = await empApi.post('ai/check', { aiTicket }, user.sessionToken);
				if (res.error) {
					// AiController.pre.working = false;
					console.error(res.message);
					clearInterval(checkPreAIResultInterval);
				} else {
					if (res.result) {
						AiController.pre.working = false;
						clearInterval(checkPreAIResultInterval);
						AiController.pre.answer = res.result;
					}
				}
			}, 3000);
		}
	};

	onMount(async () => {
		processAI(JSON.parse(Parser.base64ToCode(ai, '{}')));
	});
</script>
