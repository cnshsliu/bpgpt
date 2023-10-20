<script lang="ts">
	import { Modal, ModalHeader, ModalBody } from 'sveltestrap';
	import ScenSearch from './ScenSearch.svelte';
	import { expandAllGroups } from '$lib/caishen/localStorage.js';
	import { createEventDispatcher } from 'svelte';
	import type { scenarioType } from '$lib/caishen/types.js';
	import imgBanner1 from '$lib/images/banner1.png';
	import safari_share from '$lib/images/safari_share.png';
	import safari_addtohome from '$lib/images/safari_addtohome.png';
	import { homePage } from '$lib/caishen/Stores.js';
	let dispatch = createEventDispatcher();
	const PAGE_CHAT = 1;

	export let modalControl: any;
	export let Icons: any;
	export let scenarioGroups: any[];
	export let scenarioList: scenarioType[];
	export let currentScenario: scenarioType | null;

	const getIcon = (who: string) => {
		return Icons[who] ? Icons[who] : Icons['default'];
	};

	function toggleScenarioCollapseAll() {
		var toggles = document.querySelectorAll('#accordionScenarioGroups .accordion-button');
		toggles.forEach((toggle) => {
			if (
				($expandAllGroups && !toggle.classList.contains('collapsed')) ||
				(!$expandAllGroups && toggle.classList.contains('collapsed'))
			) {
				(toggle as HTMLButtonElement).click();
			}
		});
		$expandAllGroups = !$expandAllGroups;
	}
</script>

<Modal
	isOpen={modalControl.scenario}
	fade={false}
	scrollable
	class={'modal-dialog-centered '}
	toggle={() => {
		dispatch('toggle', 'scenario');
	}}>
	<ModalHeader
		toggle={() => {
			dispatch('toggle', 'scenario');
		}}>
		场景选择
	</ModalHeader>
	<ModalBody>
		<ScenSearch
			{Icons}
			on:chat>
		</ScenSearch>
		<div
			class="accordion accordion-flush my-2 border border-3 border-secondary-subtle rounded"
			id="accordionScenarioGroups">
			<div class="row">
				<div class="col">全部场景:</div>
				<div class="col-auto">
					<a
						href={'#'}
						on:click={toggleScenarioCollapseAll}
						class="btn btn-primary btn-sm m-2 aifont">
						{$expandAllGroups ? '全部收起' : '全部展开'}
					</a>
				</div>
			</div>
			{#each scenarioGroups as aGroup, groupIndex}
				<div class="accordion-item">
					<h2 class="accordion-header">
						<button
							class="accordion-button fs-5 aifont"
							type="button"
							data-bs-toggle="collapse"
							data-bs-target={'#flush-collapseTwo_' + groupIndex}
							aria-expanded="true"
							aria-controls={'flush-collapseTwo_' + groupIndex}>
							{aGroup.desc}
						</button>
					</h2>
					<div
						id={'flush-collapseTwo_' + groupIndex}
						class="accordion-collapse collapse show">
						<div class="accordion-body">
							{#each scenarioList.filter((scenario) => scenario.groupid === aGroup.id && scenario.scenid) as scenario}
								<div class="col">
									<a
										href={'#'}
										class="kfk-a"
										on:click={() => dispatch('chat', scenario)}>
										{scenario.desc}
										{#if scenario.icon}
											<img
												src={getIcon(scenario.icon)}
												alt={scenario.icon}
												class="caishen-logo-small" />
										{/if}
									</a>
									{scenario.scenid}
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/each}
		</div>
		<div class="fs-2 fw-5 mt-5 text-center aifont">每周更新，敬请关注</div>
		<div
			on:keydown={null}
			on:click={() => {
				dispatch('showHelp');
			}}
			class="banner d-flex justify-content-center align-items-center">
			<img
				src={imgBanner1}
				alt="Background" />
			<div class="text-box text-center fs-3">限时免费体验，点此领取帐号</div>
		</div>
		<div class="p-2 mt-5 border rounded">
			iPhone用户使用Safari浏览器，
			<br />
			按以下操作放置到桌面，
			<br />
			像APP一样，随时点开，更加方便快捷：
			<br />
			第一步： 点击Safari底部中间的分享按钮
			<br />
			<img
				src={safari_share}
				alt="safari_share"
				style="width:100%; max-width:200px" />
			<br />
			第二步： 找到并点击“添加到主屏幕”
			<br />
			<img
				src={safari_addtohome}
				alt="safari_addtohome"
				style="width:100%; max-width:200px" />
		</div>
		<br />
		<br />
		<div class="text-center aifont">©2023 DigiFlow Inc.</div>
		<div class="text-center aifont">Copyright: 2023, DigiFlow Inc.</div>
		{#if currentScenario}
			<div class="float-fix">
				<div class="row">
					<button
						class="btn btn-secondary"
						on:click={() => {
							$homePage = PAGE_CHAT;
						}}>
						取消
					</button>
				</div>
			</div>
		{/if}
	</ModalBody>
</Modal>

<style>
	.float-fix {
		flex-shrink: 0; /* Prevents the div from shrinking */
		border-top-left-radius: 10px;
		border-top-right-radius: 10px;
		box-shadow: 0 -5px 5px 5px rgba(0, 0, 0, 0.3);
		position: fixed;
		bottom: 0;
		z-index: 1000;
	}

	.banner {
		position: relative;
		width: 100%;
	}

	.banner img {
		width: 100%;
		height: auto;
	}

	.banner .text-box {
		position: absolute;
		background-color: rgba(255, 255, 255, 0.6);
		padding: 10px;
	}
</style>
