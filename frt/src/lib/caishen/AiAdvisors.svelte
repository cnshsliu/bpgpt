<script lang="ts">
	import liukehongIcon from '$lib/images/liukehong.png';
	import mahuateng from '$lib/images/mahuateng.png';
	import elonmusk from '$lib/images/elonmusk.png';
	import mayun from '$lib/images/mayun.png';
	import jeffbezos from '$lib/images/jeffbezos.png';
	import stevejobs from '$lib/images/stevejobs.png';
	import billgates from '$lib/images/billgates.png';
	import warrenbuffet from '$lib/images/warrenbuffet.png';
	import inamori from '$lib/images/inamori.png';
	import { createEventDispatcher } from 'svelte';
	import { advisor } from '$lib/caishen/Stores.js';
	let dispatch = createEventDispatcher();
	const Advisors = {
		mahuateng,
		elonmusk,
		mayun,
		jeffbezos,
		stevejobs,
		billgates,
		warrenbuffet,
		inamori,
	};

	export let fullmode: boolean = true;
</script>

<div class="row">
	{#if fullmode}
		<div class="col-12">这是我们强大的AI Advisor导师团成员。更多导师正在邀约中，敬请期待</div>
	{/if}
	<div class="col-12">
		<div class="image-container mt-3 row">
			{#each Object.keys(Advisors) as icon}
				<div class="col">
					<img
						class="ai-advisor rounded"
						class:current={$advisor === icon}
						src={Advisors[icon]}
						on:keydown={null}
						on:click={() => {
							dispatch('advisor', icon);
						}}
						alt={icon} />
				</div>
			{/each}
		</div>
		{#if fullmode}
			<div class="mt-3 text-center align-items-center aifont">
				AI导师具有与现实真身相同的背景、观点与语言风格，你需要设置你的背景以便导师们为你提供更有针对性的专业意见
			</div>
		{/if}
	</div>
</div>

<style>
	@font-face {
		font-family: 'aiFont';
		src: url('/fonts/aiFont.woff2');
		font-weight: normal;
		font-style: normal;
	}
	.aifont {
		font-family: 'aiFont', sans-serif;
		font-size: 12px;
	}
	.ai-advisor {
		height: 1rem;
		width: 2rem;
		height: 2rem;
		margin: 0 5px 0 0;
		border-radius: 0.5rem;
		border: 1px solid #d4d4d4; /* Add a border */
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Add a shadow */
	}
	.image-container {
		display: flex;
		gap: 1rem; /* adjust as needed */
	}

	.image-container img {
		transition: transform 0.3s ease; /* adjust duration as needed */
		cursor: pointer;
	}

	.image-container img:hover {
		transform: scale(1.2); /* adjust zoom level as needed */
	}

	.image-container img.current {
		transform: scale(1.5); /* adjust zoom level as needed */
	}
</style>
