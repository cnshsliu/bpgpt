<script lang="ts">
	import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'sveltestrap';
	import { createEventDispatcher } from 'svelte';
	import caishenWx from '$lib/images/caishenxiaolingwx.png';
	import shoukuanYueFei from '$lib/images/shoukuan_yue.jpg';
	import shoukuanNianFei from '$lib/images/shoukuan_nian.jpg';
	let dispatch = createEventDispatcher();
	const toggleHelp = () => {
		dispatch('toggle');
	};
</script>

<Modal
	isOpen={true}
	toggle={toggleHelp}
	fullscreen={false}
	scrollable>
	<ModalHeader toggle={toggleHelp}>客服支持与帮助信息</ModalHeader>
	<ModalBody class="container">
		<ul
			class="nav nav-pills mb-3"
			id="pills-tab"
			role="tablist">
			<li
				class="nav-item"
				role="presentation">
				<button
					class="nav-link active"
					id="pills-payment-tab"
					data-bs-toggle="pill"
					data-bs-target="#pills-payment"
					type="button"
					role="tab"
					aria-controls="pills-payment"
					aria-selected="false">
					充值配额
				</button>
			</li>
			<li
				class="nav-item"
				role="presentation">
				<button
					class="nav-link"
					id="pills-support-tab"
					data-bs-toggle="pill"
					data-bs-target="#pills-support"
					type="button"
					role="tab"
					aria-controls="pills-support"
					aria-selected="true">
					客户支持
				</button>
			</li>
			<li
				class="nav-item"
				role="presentation">
				<button
					class="nav-link"
					id="pills-usage-tab"
					data-bs-toggle="pill"
					data-bs-target="#pills-usage"
					type="button"
					role="tab"
					aria-controls="pills-usage"
					aria-selected="true">
					使用说明
				</button>
			</li>
		</ul>
		<div
			class="tab-content"
			id="pills-tabContent">
			<div
				class="tab-pane fade show active"
				id="pills-payment"
				role="tabpanel"
				aria-labelledby="pills-payment-tab"
				tabindex="0">
				<div class="row p-2">
					<div class="col text-center m-1 p-1 rounded border border-1">
						<div>商业人工智能</div>
						<div class="fs-2">月卡</div>
						<div>
							<span class="fs-5">299</span>
							元
						</div>
						<div>使用有效期30天</div>
						<div>非实物权益卡</div>
					</div>
					<div class="col text-center m-1 p-2 rounded border border-1">
						<div>商业人工智能</div>
						<div class="fs-2">季卡</div>
						<div>
							<span class="fs-5">799</span>
							元
						</div>
						<div>使用有效期90天</div>
						<div>非实物权益卡</div>
					</div>
					<div class="col text-center m-1 p-2 rounded border border-1">
						<div>商业人工智能</div>
						<div class="fs-2">年卡</div>
						<div>
							<span class="fs-5">2999</span>
							元
						</div>
						<div>使用有效期365天</div>
						<div>非实物权益卡</div>
					</div>
				</div>
				<div class="justify-content-center align-items-center text-center">
					购卡请扫码联系客服
					<img
						class="caishenwx"
						src={caishenWx}
						alt="wx" />
					<br />
					<br />
					商业专业人工智能，是你的专属商业智囊团
					<br />
					商业专业人工智能，是你的专属商业导师
					<br />
					拥有商业专业人工智能，就是拥有一个更强大的自己！
					<br />
					商业专用人工智能，助你商场创富，职场发达
					<br />
				</div>
			</div>
			<div
				class="tab-pane fade"
				id="pills-support"
				role="tabpanel"
				aria-labelledby="pills-support-tab"
				tabindex="0">
				<div class="justify-content-center align-items-center text-center">
					<div>
						<img
							class="caishenwx"
							src={caishenWx}
							alt="wx" />
					</div>
					请扫上方二维码联系客服
					<br />
					如不方便扫码，可手工添加客服为好友，
					<br />
					wx：caishenxiaoling
					<br />
				</div>
			</div>
			<div
				class="tab-pane fade"
				id="pills-usage"
				role="tabpanel"
				aria-labelledby="pills-usage-tab"
				tabindex="0">
				<div class="justify-content-center align-items-center">
					<ul>
						<li>
							<h3>在一个商业场景下提问</h3>
							<ul>
								<li>
									选择一个商业场景，然后直接点“问财”按钮，或者输入细节信息后再点“问财”按钮，等待回答即可
								</li>
								<li>输出过程中，可随时点“停止”按钮，中止输出</li>
							</ul>
						</li>
						<li>
							<h3>在同一个场景下继续追问</h3>
							<ul>
								<li>场景不变，输入新的问题，点“问财”</li>
								<li>同一场景下的上下文信息是保持的</li>
							</ul>
						</li>
						<li>
							<h3>换一个场景, 或重新开始当前场景</h3>
							<ul>
								<li>换场景， 或重新进入，上下文信息会重置</li>
							</ul>
						</li>
					</ul>
				</div>
			</div>
		</div>
		<div class="row justify-content-center text-center">
			<div class="mt-5 text-start help-content"></div>
		</div>
	</ModalBody>
	<ModalFooter>
		<Button
			color="primary"
			on:click={toggleHelp}>
			<span class="aifont">了解了</span>
		</Button>
		<Button
			color="secondary"
			on:click={toggleHelp}>
			<span class="aifont">取消</span>
		</Button>
	</ModalFooter>
</Modal>

<style>
	.caishenwx {
		width: 80px;
	}
</style>
