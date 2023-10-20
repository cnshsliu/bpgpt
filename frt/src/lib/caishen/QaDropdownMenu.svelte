<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	export let username: string = '时代掘金用户';
	export let context: any = null;
	export let qaId: string = 'aQaId';
	export let blockId: string = 'ablockId';
	export let qaType: string = 'Q';

	let dispatch = createEventDispatcher();

	const getQaContent = () => {
		let className = `.QC_${qaId} .content`;
		const questionElement = document.querySelector(className) as HTMLElement;
		let question = questionElement ? questionElement.innerText : '';

		let answers: string[] = [];
		if (qaType === 'Q') className = `.AC_${qaId} .content`;
		else className = `.AC_${qaId}.BLK_${blockId} .content`;
		const answerElements = document.querySelectorAll(className);
		answerElements.forEach((element: Element) => {
			// Do something with each element
			let htmlElement = element as HTMLElement;
			answers.push(htmlElement.innerText);
		});

		let images: string[] = [];
		if (qaType === 'Q') className = `.AC_${qaId} img`;
		else className = `.AC_${qaId}.BLK_${blockId} img`;
		const imgElements = document.querySelectorAll(className);
		imgElements.forEach((element: Element) => {
			// Do something with each element
			let htmlElement = element as HTMLImageElement;
			images.push(htmlElement.src);
		});

		return { question, answers, images };
	};

	const getTextFromQaJson = (qaJson: any) => {
		let txt = (username ? username : '时代掘金用户') + '说: ' + qaJson.question + '\n\n';
		qaJson.answers.forEach((answer: string) => {
			txt += `时代掘金说: ${answer}\n\n`;
		});
		return txt;
	};

	const downloadAsFile = async () => {
		const qaJson = getQaContent();
		const blob = new Blob([getTextFromQaJson(qaJson)], { type: 'text/plain;charset=utf-8' });
		const a = document.createElement('a');

		a.href = URL.createObjectURL(blob);
		a.download = 'AI时代创富商学院.txt';
		a.click();

		URL.revokeObjectURL(a.href);
	};

	const copyToClipboard = async () => {
		const qaJson = getQaContent();
		try {
			await navigator.clipboard.writeText(getTextFromQaJson(qaJson));
		} catch (err) {
			console.error('Failed to copy text: ', err);
		}
	};

	const toggleSpeech = async () => {
		const qaJson = getQaContent();
		try {
			if (speeching) {
				speechSynthesis.cancel();
				speeching = false;
			} else {
				let utterance = new SpeechSynthesisUtterance(getTextFromQaJson(qaJson));
				utterance.lang = 'zh-CN'; // 设置为中文
				speeching = true;
				speechSynthesis.speak(utterance);
			}
		} catch (err) {
			console.error('Failed to copy text: ', err);
		}
	};

	const shareIt = async () => {
		const qaJson = getQaContent();
		try {
			dispatch('shareit', { qaJson });
		} catch (err) {
			console.error('Failed to copy text: ', err);
		}
	};
	let hasSpeechSynthesis = false;
	let speeching = false;
	onMount(() => {
		if (SpeechSynthesisUtterance) {
			hasSpeechSynthesis = true;
		}
	});
</script>

<div
	id="btn-area"
	class="d-flex align-items-center">
	<div class="btn-group dropstart m-0 p-0">
		<button
			type="button"
			class="btn btn-sm btn-transparent m-0 p-0 border-0 dropdown-toggle"
			data-bs-toggle="dropdown"
			aria-expanded="false">
			<i class="bi bi-list" />
		</button>
		<ul class="dropdown-menu">
			<li>
				<a
					class="dropdown-item"
					href={'#'}
					on:keydown={null}
					on:click={() => {
						dispatch('reask', { askNumber: context.askNumber, detail: context.detail });
					}}>
					<i class="bi bi-arrow-clockwise" />
					重问一次
				</a>
			</li>
			{#if hasSpeechSynthesis}
				<li>
					<a
						class="dropdown-item"
						href={'#'}
						on:keydown={null}
						on:click={() => {
							toggleSpeech();
						}}>
						<i class="bi bi-chat-left-dots" />
						{speeching ? '停止朗读' : '为我朗读'}
					</a>
				</li>
			{/if}
			<li>
				<a
					class="dropdown-item"
					href={'#'}
					on:keydown={null}
					on:click={shareIt}>
					<i class="bi bi-share" />
					分享给好友
				</a>
			</li>
			<li>
				<a
					class="dropdown-item"
					href={'#'}
					on:keydown={null}
					on:click={downloadAsFile}>
					<i class="bi bi-download" />
					下载到文件
				</a>
			</li>
			<li>
				<a
					class="dropdown-item"
					href={'#'}
					on:keydown={null}
					on:click={copyToClipboard}>
					<i class="bi bi-clipboard" />
					复制到剪贴板
				</a>
			</li>
		</ul>
	</div>
</div>

<style>
	#btn-area {
		position: absolute;
		top: 2px;
		right: 2px;
		z-index: 10; /* higher z-index to ensure it's on top */
		font-size: 9px;
		padding: 0px;
		margin: 0px;
		text-align: center;
		/* background-color: springgreen; */
		background-color: rgba(50, 156, 255, 0);
		border-radius: 0px;
		/* box-shadow: 0 3px 3px rgba(0, 0, 0, 0.5); */
		cursor: pointer;
		height: 12px;
	}
	.dropdown-toggle[data-bs-toggle='dropdown']::before {
		display: none;
	}
</style>
