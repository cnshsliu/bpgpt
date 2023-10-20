<script lang="ts">
	import { _ } from '../i18n';
	import flowAi from './flowAi';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import YanaSpeak from './YanaSpeak.svelte';

	let instruct = '';
	let stepIndex = -1;
	let hasNext = false;
	let last = false;
	let first = false;
	export let show = true;
	let started = false;
	let speakDone = false;
	let activeId = '';

	const sleep = async (miliseconds: number) => {
		await new Promise((resolve) => setTimeout(resolve, miliseconds));
	};

	export const restart = (yanaid: string) => {
		started = false;
		hasNext = false;
		instruct = '';
		stepIndex = -1;
		speakDone = false;
		first = true;
		last = false;
		activeId = yanaid;
		flowAi.setUser($page.data.user);
		setTimeout(async () => {
			speakDone = false;
			let res = await flowAi.start(yanaid);
			if (res.tplid && res.wfid) {
				started = true;

				await getStepInstruct();
				stepIndex = flowAi.stepIndex;
				hasNext = flowAi.hasNext();
			}
		});
	};
	const getStepInstruct = async () => {
		//reset instruct to ""
		instruct = '';
		flowAi.instruct = '';
		let repeatCheckingTimes = 0;
		for (;;) {
			await flowAi.waitStep();
			instruct = flowAi.instruct;
			repeatCheckingTimes++;
			if (repeatCheckingTimes > 10) {
				//如果检查次数多于10次，就提示Sorry，并结束检查
				instruct = 'Sorry, I am not ready yet.';
				break;
			} else if (instruct) {
				//如果检查到了内容，则退出检查循环，内容已经放到了instruct变量中
				//并且，如果有goto，则执行goto
				if (flowAi.meta.goto) {
					goto(flowAi.meta.goto);
				}
				break;
			}
			repeatCheckingTimes++;
			await sleep(1000);
		}
	};

	onMount(async () => {});
</script>

<div
	class="position-fixed top-50 start-50 translate-middle-x w-50 yana py-4 ps-3 pe-3  mh-50 shadow3"
	class:no-display={!show}>
	<div style="display:none;">
		<img
			class="position-fixed"
			style="top: -50px; left:10px"
			src="/images/metatocome-logo-notext-lightblue.png"
			alt="Yana"
			width="100"
			height="100" />
	</div>
	<div
		class="position-fixed"
		style="top:0px; right:10px;">
		<div
			class="border-0 m-0 p-0"
			style="width:24px; height:24px;cursor:pointer"
      role="none"
			on:keydown={null}
			on:click={async () => {
				stepIndex = flowAi.stepIndex;
				//await flowAi.destroy();
				activeId = '';
				show = false;
			}}>
			<i class="fs-3 bi bi-x" />
		</div>
	</div>
	{#if activeId === ''}
		<div class="ms-5 mt-4 fs-4 fw-light">
			<ul>
				<li>
					<a
						href={'#'}
						class="kfk-link"
						on:click={() => {
							restart('yana-001');
						}}>
						Yana001
					</a>
				</li>
				<li>
					<a
						href={'#'}
						class="kfk-link"
						on:click={() => {
							restart('yana-002');
						}}>
						Yana002
					</a>
				</li>
				<li>
					<a
						href={'#'}
						class="kfk-link"
						on:click={() => {
							restart('yana-003');
						}}>
						Yana003
					</a>
				</li>
			</ul>
		</div>
	{/if}
	{#if activeId !== '' && started}
		<div class="ms-5 mt-4 fs-4 fw-light">
			{#key instruct}
				<span class="fs-4 fw-light">
					<YanaSpeak
						{instruct}
						bind:speakDone />
				</span>
			{/key}
			<!--{stepIndex}-{hasNext}-->
			{#if speakDone}
				{#if hasNext}
					<!-- a div align text to right-->
					<div class="text-end">
						<a
							href={'#'}
							class="ms-3 kfk-link"
							on:click={async () => {
								speakDone = false;
								instruct = '';
								flowAi.instruct = '';
								await flowAi.next();
								await getStepInstruct();
								stepIndex = flowAi.stepIndex;
								hasNext = flowAi.hasNext();
							}}>
							➤{$_('button.next')}
						</a>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	.no-display {
		display: none;
	}
	.yana {
		z-index: 99999999999;
		border-radius: 1rem;
		background-color: #cccccc;
	}
</style>
