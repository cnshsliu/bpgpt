<script lang="ts">
	import { fade } from 'svelte/transition';
	import { pageName } from '$lib/Stores';
	import type { PageData } from './$types';
	export let data: PageData;
	$: ({ work, delegators, anchor } = data);

	import { _ } from '$lib/i18n';
	import { goto } from '$app/navigation';
	import { mtcSession, clientViewedTodoIds, todoCache } from '$lib/Stores';
	import { onMount, onDestroy } from 'svelte';
	import { printing, mtcConfirm, mtcConfirmReset } from '$lib/Stores';
	import { setFadeMessage } from '$lib/Notifier';
	import { version } from '$lib/mtcLocalStores';
	import WorkPage from '../workpage.svelte';
	import WorkHeader from '../workheader.svelte';

	onMount(async () => {
		if (!(work && work.doer)) {
			setFadeMessage($_('work.notfound'), 'warn');
			goto('/work');
		}
		$clientViewedTodoIds = [...new Set($clientViewedTodoIds).add(work.todoid as never)];
		let tmp = $todoCache['ST_FOOTPRINT'];
		if (tmp && tmp.length > 0) {
			tmp = tmp.filter((x) => x.todoid != work.todoid);
			tmp.unshift(work as never);
			$todoCache['ST_FOOTPRINT'] = tmp;
		}
		let findAnchorInterval: ReturnType<typeof setInterval> | undefined = undefined;
		let findAnchorCount = 0;
		if (anchor) {
			findAnchorInterval = setInterval(() => {
				let elem = document.querySelector(`#${anchor}`);
				if (elem) {
					elem.scrollIntoView(true);
					clearInterval(findAnchorInterval);
				} else {
					findAnchorCount++;
					if (findAnchorCount >= 5) {
						let elem = document.querySelector(`todo_comments`);
						if (elem) elem.scrollIntoView(true);
						clearInterval(findAnchorInterval);
					}
				}
			}, 1000);
		}
		let needReload = false;
		if ($version) {
			if (work && work.version && $version !== work.version) {
				console.log('You need to reload1', 'version:', $version, 'work.version', work.version);
				needReload = true;
			}
		} else {
			console.log('You need to reload2');
			needReload = true;
		}
		if (needReload) {
			setTimeout(async () => {
				$mtcConfirm = {
					title: $_('confirm.title.needReload') + 'hello',
					body: $_('confirm.body.needReload'),
					buttons: [$_('confirm.button.confirm')],
					callbacks: [
						async () => {
							$version = work.version;
							window.location.reload();
							mtcConfirmReset();
						},
					],
				};
			}, 1000);
		}
		$pageName = work.title;
		console.log(JSON.stringify(work.wftitle));
	});
	onDestroy(async () => {
		//console.log('Delete comment buffer');
		delete $mtcSession.comment_wfid;
		delete $mtcSession.comments;
	});
</script>

<div
	transition:fade|global
	class="mt-2 container">
	{#if !$printing}
		<WorkHeader {work} />
	{/if}
	<WorkPage
		{work}
		{delegators}
		on:statusChanged={(e) => {
			work.status = e.detail.status;
			work.doneat = e.detail.doneat;
		}} />
</div>
