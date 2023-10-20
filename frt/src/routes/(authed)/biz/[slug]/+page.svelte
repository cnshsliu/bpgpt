<script lang="ts">
	import { pageName } from '$lib/Stores';
	import * as api from '$lib/api';
	import { _ } from '$lib/i18n';
	import { API_SERVER } from '$lib/Env';
	import { onMount } from 'svelte';
	import { currentBiz } from '$lib/Stores';
	import { Accordion, AccordionItem, Nav, NavLink, NavItem } from 'sveltestrap';
	import type { PageData } from './$types';
	import Header from './_header.svelte';
	import BizOpMenu from './BizOpMenu.svelte';

	export let data: PageData;
	let { user, bizname, template } = data;
	$: ({ user, bizname, template } = data);

	let export_to_filename = bizname;
	let snapshot_name = bizname;
	let form = {
		export_template: false,
		export_snapshot: false,
	};

	function removeElementsByClass(className: string) {
		const elements = document.getElementsByClassName(className);
		while (elements.length > 0) {
			elements[0].parentNode?.removeChild(elements[0]);
		}
	}

	function export_template() {
		if (export_to_filename.endsWith('.xml'))
			export_to_filename = export_to_filename.substring(0, export_to_filename.lastIndexOf('.xml'));
		api.post('template/download', { tplid: bizname }, user.sessionToken).then((response) => {
			const url = window.URL.createObjectURL(new Blob([response as unknown as BlobPart]));
			removeElementsByClass('tempLink');
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute('download', `${export_to_filename}.xml`); //or any other extension
			link.setAttribute('class', 'tempLink');
			document.body.appendChild(link);
			//点击这个临时连接实现内容下载
			link.click();
			form.export_template = false;
		});
	}

	function export_snapshot() {
		if (snapshot_name.endsWith('.svg'))
			snapshot_name = snapshot_name.substring(0, snapshot_name.lastIndexOf('.svg'));
		api
			.get(`template/snapshot/${user.tenant._id}/${bizname}`, user.sessionToken)
			.then((response) => {
				const url = window.URL.createObjectURL(new Blob([response as unknown as BlobPart]));
				removeElementsByClass('tempLink');
				const link = document.createElement('a');
				link.href = url;
				link.setAttribute('download', `${snapshot_name}.svg`); //or any other extension
				link.setAttribute('class', 'tempLink');
				document.body.appendChild(link);
				//点击这个临时连接实现内容下载
				link.click();
				form.export_snapshot = false;
			});
	}

	onMount(async () => {
		await api.post('workflow/iamin', {}, user.sessionToken);
		if (bizname.startsWith('Flexible tpl of') === false) {
			$pageName = bizname;
			console.log(template);
			if ($currentBiz != bizname && template.searchable) {
				$currentBiz = bizname;
			}
		}
	});

	let snapshot = `${API_SERVER}/snapshot/tpl/${bizname}?token=${user.sessionToken}`;
</script>

<Header bind:bizname />
<div class="mt-0 m-0 p-0">
	<div class="row m-0 p-0 row-cols-1">
		<div
			class="image-container"
			role="none"
			on:keydown={null}>
			<div class="overlay-text fs-1 fw-bold">{bizname}</div>
			<div class="overlay-bizopmenu fs-5 fw-bold"><BizOpMenu {bizname} /></div>
			<div class="image-wrapper">
				<img
					src={snapshot}
					alt="" />
			</div>
		</div>
	</div>
	<div class="row row-cols-1 row-cols-md-2 mt-2 myaccordion">
		<div class="col">
			<div>
				<Accordion
					flush
					stayOpen>
					<AccordionItem active>
						<h4
							class="m-0"
							slot="header">
							{$_('biz.todos')}
						</h4>
						<Nav vertical>
							{#await api.post('work/search', { status: 'ST_RUN', doer: user.eid, tplid: bizname, showpostponed: false, tspan: 'any', reason: 'biz' }, user.sessionToken)}
								Loading...
							{:then todos}
								{#each todos.objs as item}
									<NavItem>
										<NavLink
											class="kfk-link iconDiv"
											href="/work/{item.todoid}">
											{item.title}
										</NavLink> / <NavLink
											class="kfk-link iconDiv"
											href="workflow/{item.wfid}">
											{item.wftitle}
										</NavLink>
									</NavItem>
								{/each}
							{/await}
						</Nav>
					</AccordionItem>
					<AccordionItem active>
						<h4
							class="m-0"
							slot="header">
							{$_('biz.recentDone')}
						</h4>
						<Nav vertical>
							{#await api.post('work/search', { status: 'ST_DONE', doer: user.eid, tplid: bizname, showpostponed: false, tspan: 'any', reason: 'biz' }, user.sessionToken)}
								Loading...
							{:then todos}
								{#each todos.objs as item}
									<NavItem>
										<NavLink
											class="kfk-link iconDiv"
											href="/work/{item.todoid}">
											{item.title}
										</NavLink> /
										<NavLink
											class="kfk-link iconDiv"
											href="/workflow/{item.wfid}">
											{item.wftitle}
										</NavLink>
									</NavItem>
								{/each}
							{/await}
							<NavItem>
								<NavLink
									class="kfk-link"
									href="/work?status=ST_DONE">
									{$_('button.more')}
								</NavLink>
							</NavItem>
						</Nav>
					</AccordionItem>
					<AccordionItem active>
						<h4
							class="m-0"
							slot="header">
							{$_('biz.recentProcess')}
						</h4>
						{#await api.post('workflow/iamin', { tplid: bizname }, user.sessionToken)}
							Loading...
						{:then wfIamIns}
							<Nav vertical>
								{#each wfIamIns as item}
									<NavItem>
										<NavLink
											class="kfk-link"
											href={'/workflow/' + item.wfid}>
											{item.wftitle}
										</NavLink>
									</NavItem>
								{/each}
							</Nav>
						{/await}
					</AccordionItem>
				</Accordion>
			</div>
		</div>
		<div class="col">
			<Accordion
				flush
				stayOpen>
				<AccordionItem active>
					<h4
						class="m-0"
						slot="header">
						{$_('biz.basic_op')}
					</h4>
					<Nav vertical>
						<NavItem>
							<NavLink
								class="kfk-link"
								href="/template/start?tplid={bizname}">
								{$_('biz.op.startProcess')}
							</NavLink>
						</NavItem>
						<NavItem>
							<NavLink
								class="kfk-link"
								href="/template/{bizname}&read">
								{$_('biz.op.seeDesign')}
							</NavLink>
						</NavItem>
						<NavItem>
							<NavLink
								class="kfk-link"
								href="/template/{bizname}&edit">
								{$_('biz.op.editDesign')}
							</NavLink>
						</NavItem>
						<NavItem>
							<NavLink
								class="kfk-link"
								href="/workflow/miner/{bizname}">
								{$_('biz.op.mining')}
							</NavLink>
						</NavItem>
						<NavItem>
							<NavLink
								class="kfk-link"
								href={'#'}
								on:click={() => {
									form.export_template = !form.export_template;
									if (form.export_template) form.export_snapshot = false;
								}}>
								{$_('biz.op.export')}
							</NavLink>
							{#if form.export_template}
								<div class="input-group">
									<input
										class="form-control"
										bind:value={export_to_filename} />
									<button
										class="btn btn-primary"
										on:click={export_template}>
										{$_('button.export')}
									</button>
									<button
										class="btn btn-secondary"
										on:click={() => {
											form.export_template = false;
										}}>
										<i class="bi bi-x" />
									</button>
								</div>
							{/if}
						</NavItem>
						<NavItem>
							<NavLink
								class="kfk-link"
								href={'#'}
								on:click={() => {
									form.export_snapshot = !form.export_snapshot;
									if (form.export_snapshot) form.export_template = false;
								}}>
								{$_('biz.op.snapshot')}
							</NavLink>
							{#if form.export_snapshot}
								<div class="input-group">
									<input
										class="form-control"
										bind:value={snapshot_name} />
									<button
										class="btn btn-primary"
										on:click={export_snapshot}>
										{$_('button.export')}
									</button>
									<button
										class="btn btn-secondary"
										on:click={() => {
											form.export_snapshot = false;
										}}>
										<i class="bi bi-x" />
									</button>
								</div>
							{/if}
						</NavItem>
						<NavItem>
							<NavLink
								class="kfk-link"
								href="/template">
								{$_('biz.op.allbiz')}...
							</NavLink>
						</NavItem>
					</Nav>
				</AccordionItem>
				<AccordionItem active>
					<h4
						class="m-0"
						slot="header">
						{$_('biz.advanced_op')}
					</h4>
					<Nav vertical>
						<NavItem>
							<NavLink
								class="kfk-link"
								href="/work">
								{$_('biz.adv.all_todos')}
							</NavLink>
						</NavItem>
						<NavItem>
							<NavLink
								class="kfk-link"
								href="/template">
								{$_('biz.adv.all_biz')}
							</NavLink>
						</NavItem>
						<NavItem>
							<NavLink
								class="kfk-link"
								href="/discuss">
								{$_('biz.adv.discuss')}
							</NavLink>
						</NavItem>
						<NavItem>
							<NavLink
								class="kfk-link"
								href={`/share/${bizname}`}>
								{$_('biz.adv.share')}
							</NavLink>
						</NavItem>
					</Nav>
				</AccordionItem>
			</Accordion>
		</div>
	</div>
</div>

<style>
	.image-container {
		position: relative;
		display: inline-block;
	}

	.image-container::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-image: linear-gradient(to bottom, rgba(0, 0, 125, 0.1), rgba(0, 0, 125, 0.005));
		mix-blend-mode: multiply;
	}

	.overlay-text {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		padding-left: 1rem;
		justify-content: start;
		align-items: center;
		text-align: center;
	}

	.overlay-bizopmenu {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 20%;
		display: flex;
		padding-left: 1rem;
		justify-content: start;
		align-items: center;
		text-align: center;
	}

	.image-wrapper {
		display: flex;
		justify-content: end;
		align-items: center;
		width: 100%;
		height: 100px;
		overflow: hidden;
	}

	.image-wrapper img {
		opacity: 0.8;
		display: block;
		height: 100px;
		width: auto;
	}
</style>
