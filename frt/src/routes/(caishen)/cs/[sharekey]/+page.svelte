<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import caishenIcon from '$lib/images/caishen3_round.png';
	import shidaijuejin from '$lib/images/shidaijuejin.png';

	let shareit = $page.data.shareit;
	if (shareit.error) {
		shareit = {
			question: '分享码不存在或已失效',
			answers: [shareit.error],
			images: [''],
			by: '',
		};
	}
	shareit.answers = shareit.answers.map((x: string) => {
		return x.replace(/\n/g, '<br/>');
	});

	let hasSpeechSynthesis = false;
	let speeching = false;
	onMount(() => {
		if (SpeechSynthesisUtterance) {
			hasSpeechSynthesis = true;
		}
	});
	const toggleSpeech = () => {
		const text =
			shareit.by + '问：' + shareit.question + '，时代掘金回答：' + shareit.answers.join('; ');
		try {
			if (speeching) {
				speechSynthesis.cancel();
				speeching = false;
			} else {
				let utterance = new SpeechSynthesisUtterance(text);
				utterance.lang = 'zh-CN'; // 设置为中文
				speeching = true;
				speechSynthesis.speak(utterance);
			}
		} catch (err) {
			console.error('Failed to copy text: ', err);
		}
	};
</script>

<div class="container mt-5">
	<div class="card shareit-card">
		{#if hasSpeechSynthesis}
			<div class="readit">
				<a
					href={'#'}
					on:keydown={null}
					on:click={toggleSpeech}
					class="btn btn-primary">
					<i class="bi bi-chat-left-dots" />
				</a>
			</div>
		{/if}
		<div class="card-header">
			<h3>{shareit.question}</h3>
		</div>
		<div class="card-body">
			<div>
				{#each shareit.images as image, index}
					<div class="d-flex">
						<img
							src={image ? image : caishenIcon}
							alt="caishen"
							class="caishen-logo" />
						{@html shareit.answers[index]}
					</div>
				{/each}
			</div>
		</div>
		<div class="card-footer">
			<div class="text-end">{shareit.by}</div>
			<div class="text-end">
				<a href="https://lkh.ai">
					<img
						src={shidaijuejin}
						style="width:100px"
						alt="AI时代掘金" />
				</a>
			</div>
		</div>
	</div>
</div>

<style>
	.shareit-card {
		position: relative;
	}
	.readit {
		position: absolute;
		right: 10px;
		top: 5px;
		z-index: 10;
	}
</style>
