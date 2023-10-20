<!--
在FreeJump时，在workheader.svelte中设置store数据$finderFilter
		$finderFilter = { wfid: work.wfid, nodeid: toNodeid };
然后
		goto('/workfinder');
转到本route，
本route读取$finderFilter，并传递给服务器端，服务器端根据
wfid和nodeid查到一个todo，返回todoid，本route再转向到该
todo的执行页面
					goto(`/work/${foundTodoid}`, { replaceState: true });
调用后端查找一次找不到，会等10次，10次后依然找不到
就转向到工作列表页面
-->
<script lang="ts">
	import * as api from '$lib/api';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { finderFilter, finderMsg } from '$lib/Stores';
	import type { findFilterType } from '$lib/Stores';
	let filter: findFilterType = $finderFilter as findFilterType;

	let foundTodoid: string;
	let finderInterval: ReturnType<typeof setInterval> | undefined;
	let counter: number = 0;

	const finder = async () => {
		return await api.post(
			'work/finder',
			filter as Record<string, any>,
			$page.data.user.sessionToken,
		);
	};

	finderInterval = setInterval(() => {
		counter++;
		if (counter >= 10) {
			clearInterval(finderInterval);
			goto('/work', { replaceState: true });
		}
		finder()
			.then((todoid) => {
				foundTodoid = todoid;
				if (foundTodoid) {
					clearInterval(finderInterval);
					console.log('Found ', foundTodoid);
					goto(`/work/${foundTodoid}`, { replaceState: true });
				}
			})
			.catch((err) => {
				console.log(err);
			});
	}, 1000);
</script>

{$finderMsg ?? 'Finding'}
{counter}...
