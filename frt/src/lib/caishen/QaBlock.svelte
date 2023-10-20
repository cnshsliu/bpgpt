<svelte:options accessors={true} />

<script lang="ts">
	import AiIsThinking from './AiIsThinking.svelte';
	import PleaseLogin from './PleaseLogin.svelte';
	import QaDropdownMenu from './QaDropdownMenu.svelte';
	import { createEventDispatcher } from 'svelte';
	import { generating, currentQaId } from '$lib/caishen/Stores.js';
	import AiAdvisors from '$lib/caishen/AiAdvisors.svelte';

	let dispatch = createEventDispatcher();
	export let icon: string = '';
	export let username: string = '';
	export let qa: string = '';
	export let content: string = '';
	export let showDropdownMenu: boolean = true;
	export let context: any = {};
	export let qaId: string = '';
	export let blockId: string = '';
	let completed: boolean = false;
	let showCursor: boolean = false;

	export const youComplete = () => {
		completed = true;
	};

	export const addText = (text: string) => {
		if (content === '___NEWCHAT___') content = text;
		if (content === text) content = text;
		else {
			content = content + text;
			showCursor = true;
			setTimeout(() => {
				showCursor = false;
			}, 1000);
		}
	};
</script>

{#if qa === 'Q'}
	<div class={`caishen-question Q_${qaId} BLK_${blockId}`}>
		{#if showDropdownMenu && (qaId !== $currentQaId || !$generating)}
			<QaDropdownMenu
				{username}
				{context}
				{qaId}
				{blockId}
				qaType={'Q'}
				on:reask
				on:shareit />
		{/if}
		<div class={`QC_${qaId} BLK_${blockId}`}><span class="content">{content}</span></div>
	</div>
{:else}
	<div class={`caishen-answer2 A_${qaId} BLK_${blockId}`}>
		{#if context.currentScenario}
			{#if showDropdownMenu && (qaId !== $currentQaId || !$generating)}
				<QaDropdownMenu
					{username}
					{context}
					{qaId}
					{blockId}
					qaType={'A'}
					on:reask
					on:shareit />
			{/if}
		{/if}
		<div class={`d-flex AC_${qaId} BLK_${blockId}`}>
			<img
				src={icon}
				alt="caishen"
				class="caishen-logo" />
			{#if content === '___NEWCHAT___'}
				<AiIsThinking />
			{:else}
				<div class="pt-2">
					{#if content === '___PLEASE_LOGIN___'}
						<PleaseLogin on:showHelp />
					{:else if content === '{IAMLUCAS}'}
						Hello,
						你好，我是Ai时代掘金主理老师，我已经为你邀请到了全球商业领袖大卡为你指点迷津出谋划策。你随时可以与他们交互沟通,
					{:else if content === '{AI_ADVISORS}'}
						<AiAdvisors on:advisor />
					{:else if content === '{FIRST_STEP}'}
						你可以在下方的输入框输入内容，跟我对话。或者，
						<button
							class="btn btn-sm btn-primary py-0 border-0 aifont txtcolor"
							type="button"
							on:click={() => {
								dispatch('pick');
							}}>
							选择一个主题
						</button>
						后， 我会为你提供更有针对性的专业意见。
					{:else if content === '___NO_QUOTA___'}
						<a
							href={'#'}
							class="kfk-a"
							on:click={() => {
								dispatch('addquota');
							}}>
							配额不足， 点这里去添加使用配额
						</a>
					{:else if content === '___SELECT_SCENARIO___'}
						第一次使用AI时代掘金，
						<a
							href={'#'}
							class="kfk-a"
							on:click={() => {
								dispatch('pick');
							}}>
							先选择一个主题吧
						</a>
					{:else}
						<span class="content">{@html content}</span>
					{/if}
					<!-- CAUTION: enable cusor cause screen blinking --->
					<!-- <span class={showCursor ? 'blinking-cursor' : 'hidden-cursor'}></span> -->
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.caishen-answer2 {
		position: relative;
		margin: 0.5rem 0 0.5rem 0;
		padding: 5px;
		border-radius: 5px;
		background-color: #f0f0f0;
		color: #333;
		line-height: 1.5;
		display: flex;
		align-items: flex-start; /* To align them vertically in the middle */
	}
	.caishen-question {
		position: relative;
		margin: 10px 0;
		padding: 15px;
		border-radius: 5px;
		background-color: #a0f0a0;
		color: #333;
		line-height: 1.5;
		text-align: right;
	}

	@keyframes blink {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}
	.blinking-cursor {
		display: inline-block;
		width: 1rem;
		height: 1.1rem;
		background-color: #000;
		animation: blink 1s infinite;
	}
	.hidden-cursor {
		visibility: hidden;
		animation: none;
	}
</style>
