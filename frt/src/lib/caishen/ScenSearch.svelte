<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { InputGroup } from 'sveltestrap';
	import * as empApi from '$lib/api';
	import type { scenarioType } from '$lib/caishen/types.js';
	import { createEventDispatcher } from 'svelte';

	export let Icons: any;
	let dispatch = createEventDispatcher();
	let q = '';
	let searchResult: scenarioType[] = [];
	let searchWords: any[] = [];
	const getIcon = (who: string) => {
		return Icons[who] ? Icons[who] : Icons['default'];
	};
	async function refreshMySearchWords() {
		searchWords = [{ abcd: 3 }, { lmn: 1 }];
		searchWords = await empApi.post('caishen/bs/searchwords', {}, $page.data.user.sessionToken);
	}
	async function clearSearchCriteria() {
		q = '';
	}

	async function search() {
		if (q.trim().length < 1) return;
		const res = await empApi.post('caishen/bs/search', { q }, $page.data.user.sessionToken);
		console.log(res);
		searchResult = res.map((x: any) => {
			return { ...x.content, scenid: x.scenid };
		});
		refreshMySearchWords();
	}
	function addSearchWord(word: string) {
		q = q + ' ' + word;
	}

	let myUsed: any[] = [];
	async function refreshMyUsed() {
		myUsed = await empApi.post('caishen/bs/used', {}, $page.data.user.sessionToken);
		myUsed = myUsed
			.map((x: any) => {
				return { ...x.gptscen.content, scenid: x.scenid };
			})
			.slice(0, 10);
		console.log(myUsed);
	}

	onMount(() => {
		refreshMySearchWords();
		refreshMyUsed();
	});
</script>

<InputGroup>
	<input
		class="form-control"
		placeholder="输入关键词，按标题和标签进行查询。多个关键词之间用空格分割"
		bind:value={q}
		type="text" />
	<button
		class="btn btn-light"
		on:click|preventDefault={clearSearchCriteria}>
		<i class="bi bi-x" />
	</button>
	<button
		class="btn btn-primary"
		on:click|preventDefault={search}>
		<i class="bi bi-search" />
	</button>
</InputGroup>
<div>
	常用关键词：
	{#each searchWords as word}
		<div
			class="d-inline-block p-1 clickable"
			on:keydown={null}
			on:click={() => {
				addSearchWord(word.word);
			}}>
			{word.word}
		</div>
	{/each}
</div>

{#if searchResult.length > 0}
	<div class="border border-1 rounded p-1">
		搜索结果：
		{#each searchResult as scenario}
			<div class="col ps-3">
				<a
					href={'#'}
					class="kfk-a"
					on:click={() => {
						dispatch('chat', scenario);
					}}>
					{scenario.desc}
				</a>
			</div>
		{/each}
	</div>
{/if}
<div class="border border-1 rounded p-1 mt-2">
	最近使用：
	{#each myUsed as scenario}
		<div class="col ps-3">
			<a
				href={'#'}
				class="kfk-a"
				on:click={() => {
					dispatch('chat', scenario);
				}}>
				{scenario.desc}
			</a>
		</div>
	{/each}
</div>
