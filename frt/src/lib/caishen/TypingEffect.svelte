<script lang="ts">
	export let text: string;
	let desc: string = '';
	let animating = false;

	function delay(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
	async function typeInEffect(s: string, delayMs: number = 100) {
		for (const char of s) {
			desc += char;
			await delay(delayMs);
		}
		animating = false;
	}

	const setDesc = (_: any) => {
		desc = '';
		animating = true;
		typeInEffect(text);
	};

	$: setDesc(text);
</script>

<div class="text-wrapper">
	<span>{desc}</span>
	{#if animating}
		<span class="blinking-cursor"></span>
	{:else}
		<div class="underline"></div>
	{/if}
</div>

<style>
	.blinking-cursor {
		display: inline-block;
		width: 1rem;
		height: 1.1rem;
		background-color: black;
		animation: blink 1s infinite;
	}
	.text-wrapper {
		position: relative;
		font-size: 20px;
	}
	.underline {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 20px;
		height: 2px; /* Adjust this to control the thickness of the underline */
		background-color: black;
		animation: slide 3s ease-in-out 3 forwards; /* Runs the animation infinitely */
		visibility: visible;
	}

	@keyframes slide {
		0%,
		66% {
			left: 0;
			opacity: 1;
		}
		22% {
			left: calc(100% - 20px);
			opacity: 1;
		}
		100% {
			left: 0;
			visibility: hidden;
			opacity: 0;
		}
	}
</style>
