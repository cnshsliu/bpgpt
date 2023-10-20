<script lang="ts">
	import { _ } from '$lib/i18n';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	export let data: PageData;

	let { wf } = data;

	let countdown = 5;
	let intervalId: ReturnType<typeof setInterval> | undefined = undefined;
	onMount(() => {
		const godown = () => {
			if (intervalId) clearInterval(intervalId);
			if (countdown > 0) {
				intervalId = undefined;
				intervalId = setInterval(() => {
					countdown = countdown - 1;
					if (countdown > 0) {
						godown();
					} else {
						clearInterval(intervalId);
						goto(`/workflow/${wf.wfid}/gotofirststep`);
					}
				}, 1000);
			} else {
				clearInterval(intervalId);
			}
		};

		godown();
	});
</script>

<div
	class="text-center"
	style="height: 300px; padding-top: 200px;">
	&nbsp;
</div>
<div class="container">
	<div class="row m-5">
		<div class="col">
			{$_('evaluate.waitForFirstTodo', { values: { wftitle: wf.wftitle, countdown: countdown } })}
		</div>
	</div>
</div>
