<script lang="ts">
	import { onMount } from 'svelte';
	import * as empApi from '$lib/api';
	import Parser from '$lib/parser';
	export let ai: string;
	import type { User, Work } from '$lib/types';
	export let work: Work;
	import Loading from './Loading.svelte';
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
			const { ai, ...workCopy } = work;
			AiController.pre.answer = 'Asking AI...';
			AiController.pre.answer = await empApi.post(
				'ai/ask',
				{
					work: workCopy,
					ai: theAI.pre,
				},
				user.sessionToken,
			);
		}
	};

	onMount(async () => {
		processAI(JSON.parse(Parser.base64ToCode(ai, '{}')));
	});
</script>

<div class="flex justify-center items-center">
	{AiController.pre.answer}
</div>
