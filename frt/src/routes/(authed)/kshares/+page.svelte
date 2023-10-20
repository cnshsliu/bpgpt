<script lang="ts">
	import { pageName } from '$lib/Stores';
	import type { PageData } from './$types';
	export let data: PageData;
	$: ({ adminMode, shownNumber } = data);

	import { _ } from '$lib/i18n';
	import { hasAny, hasAll } from '$lib/utils';
	import * as api from '$lib/api';
	import { goto } from '$app/navigation';
	import { API_SERVER } from '$lib/Env';
	import { setFadeMessage } from '$lib/Notifier';
	import { page } from '$app/stores';
	import { pickedKShareTags } from '$lib/Stores';
	import { kshareCate } from '$lib/mtcLocalStores';
	import { text_area_resize } from '$lib/autoresize_textarea';
	import { title } from '$lib/title';
	import BadgeWithDel from '$lib/input/BadgeWithDel.svelte';
	import {
		Container,
		Row,
		Col,
		InputGroup,
		Input,
		InputGroupText,
		Button,
		TabContent,
		TabPane,
		Card,
		CardHeader,
		CardTitle,
		CardBody,
		Breadcrumb,
		BreadcrumbItem,
	} from 'sveltestrap';
	import { onMount } from 'svelte';

	let user = $page.data.user;
	let updatingKsTplPath = '';
	let pickingKsTplPath = '';
	let designPrepared = '';
	let files;
	let kstplmouseover = -1;

	type KSTpl = {
		ksid: string;
		name: string;
		desc: string;
		tags: [string];
		doc?: string;
		newtag?: string;
		pickto?: string;
	};
	type KShareCategory = {
		id: string;
		name: string;
		kstpls: KSTpl[];
		tags?: string[];
	};

	const all_scenarios_txt = $_('kshare.all_scenarios');
	const all_industries_txt = $_('kshare.all_industries');

	const shuffle = !adminMode && shownNumber != 9999;

	let scenarios: string[] = [];
	let industries: string[] = [];
	let all_kshares: Array<KShareCategory> = [];
	let ksharesToShow: KShareCategory = { id: 'ksharetoshow', name: 'unset', kstpls: [] };
	let selectedCategoryId = '';
	let show_category_customize_form = false;
	let allTagsString = { scenarios: '', industries: '' };

	const saveKsConfig = async () => {
		if (adminMode === false) return;
		scenarios = allTagsString.scenarios.split(/[;|\s|,]/).filter((x) => x.trim().length > 0);
		industries = allTagsString.industries.split(/[;|\s|,]/).filter((x) => x.trim().length > 0);
		await api.post(
			'ksconfig/set',
			{
				ksconfig: {
					scenarios: scenarios,
					industries: industries,
				},
			},
			user.sessionToken,
		);
		await doSearch();
	};

	const newkstpl = { folder: '', name: '', desc: '', tags: '' };

	const rebuild = async () => {
		const res = await api.post('ksconfig/get', {}, user?.sessionToken);
		scenarios = res.scenarios;
		industries = res.industries;
		allTagsString.scenarios = scenarios.join(';');
		allTagsString.industries = industries.join(';');
		await doSearch();
	};

	const doSearch = async (aq: string = '') => {
		let qvalue = aq ? aq : q;
		let kstpls = <[KSTpl]>(
			await api.post(
				'kstpls',
				{ q: qvalue, tags: $pickedKShareTags, author: author_text },
				user?.sessionToken,
			)
		);
		all_kshares = [{ id: 'all', name: $_('kshare.label.All'), kstpls: kstpls }];
		ksharesToShow = all_kshares[0];
	};

	onMount(async () => {
		$pageName = $_('navmenu.kshares');
		adminMode = false;
		await rebuild();
	});

	let q = '';
	let author_text = '';
</script>

<div class="container mt-3">
	{#if adminMode === true}
		<button
			class="btn btn-primary"
			on:click|preventDefault={async (e) => {
				await api.post('kstpl/scan', {}, user.sessionToken);
				await rebuild();
				await doSearch();
			}}>
			Scan Server
		</button>
		<button
			class="btn btn-primary"
			on:click|preventDefault={async (e) => {
				show_category_customize_form = !show_category_customize_form;
			}}>
			{show_category_customize_form ? 'Hide Tags' : 'Customize Tags'}
		</button>
		{#if show_category_customize_form}
			<div class="border rounded p-2 m-1">
				<InputGroup>
					<InputGroupText>Scenario Tags</InputGroupText>
					<input
						class="form-control"
						bind:value={allTagsString.scenarios} />
					<button
						class="btn btn-primary"
						on:click|preventDefault={async () => {
							await saveKsConfig();
						}}>
						Set
					</button>
				</InputGroup>
				{#each scenarios as tag}
					<BadgeWithDel
						bind:text={tag}
						withDeleteButton={true}
						on:delete={async (e) => {
							scenarios = scenarios.filter((x) => x !== tag);
							allTagsString.scenarios = scenarios.join(';');
							allTagsString.industries = industries.join(';');
							await saveKsConfig();
						}} />
				{/each}
				<InputGroup>
					<InputGroupText>Industry Tags</InputGroupText>
					<input
						class="form-control"
						bind:value={allTagsString.industries} />
					<button
						class="btn btn-primary"
						on:click|preventDefault={async () => {
							await saveKsConfig();
						}}>
						Set
					</button>
				</InputGroup>
				{#each industries as tag}
					<BadgeWithDel
						bind:text={tag}
						withDeleteButton={true}
						on:delete={async (e) => {
							industries = industries.filter((x) => x !== tag);
							allTagsString.scenarios = scenarios.join(';');
							allTagsString.industries = industries.join(';');
							await saveKsConfig();
						}} />
				{/each}
			</div>
		{/if}
	{/if}

	<div class="card p-3">
		<div class="card-header text-center bg-success bg-opacity-25 bg-gradient">
			<div class="fs-3 fw-bold">
				{$_('kshare.title')}
			</div>
			<p class="card-text text-center">
				{$_('kshare.description')}
			</p>
		</div>
		<div class="card-body">
			<div class="row mt-3">
				<div class="input-group">
					<div class="ms-2">
						<div class="row">
							<div class="col-auto">{$_('kshare.topmenu.Industries')}</div>
							<div class="col">
								<ul class="mt-0 nav nav-pills ">
									{#each industries as aCate}
										<li class="nav-item kfk-link">
											<a
												href={'#'}
												class="py-0 nav-link bg-transparent"
												on:click|preventDefault={async () => {
													let tmp = $pickedKShareTags;
													tmp.push(aCate);
													$pickedKShareTags = [...new Set(tmp)];
													await doSearch();
												}}>
												{aCate}
											</a>
										</li>
									{/each}
								</ul>
							</div>
						</div>
						<div class="row">
							<div class="col-auto">{$_('kshare.topmenu.Scenarios')}</div>
							<div class="col">
								<ul class="mt-0 nav nav-pills ">
									{#each scenarios as aCate}
										<li class="nav-item kfk-link">
											<a
												href={'#'}
												class="py-0 nav-link bg-transparent"
												on:click|preventDefault={async () => {
													let tmp = $pickedKShareTags;
													tmp.push(aCate);
													$pickedKShareTags = [...new Set(tmp)];
													await doSearch();
												}}>
												{aCate}
											</a>
										</li>
									{/each}
								</ul>
							</div>
						</div>
						<div class="row mt-3">
							<div class="col-auto">{$_('kshare.topmenu.pickedtags')}</div>
							<div class="col">
								{#each $pickedKShareTags as aTag}
									<BadgeWithDel
										bind:text={aTag}
										withDeleteButton={true || selectedCategoryId == aTag}
										on:delete={async (e) => {
											let tmp = $pickedKShareTags;
											tmp = tmp.filter((x) => x !== aTag);
											$pickedKShareTags = tmp;
											await doSearch();
										}} />
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>

			<section class="row mt-3  align-items-center">
				<div class="input-group">
					<div class="input-group-text">{$_('kshare.search.byname')}</div>
					<input
						class="form-control"
						bind:value={q}
						type="search"
						placeholder={$_('kshare.search.q.placeholder')}
						style="outline:none" />
					<div class="input-group-text">{$_('kshare.search.byauthor')}</div>
					<input
						class="form-control"
						bind:value={author_text}
						type="search"
						placeholder={$_('kshare.search.author.placeholder')}
						style="outline:none" />
					<button
						class="btn btn-primary"
						on:click={async (e) => {
							e.preventDefault();
							await doSearch();
						}}>
						<i class="bi bi-search" />
					</button>
				</div>
			</section>
		</div>
	</div>
	{#each ksharesToShow.kstpls as kstpl, kstplIndex}
		<div
			class={'card p-3 ' +
				(kstplmouseover === kstplIndex ? 'bg-success bg-opacity-25' : 'bg-light')}
			on:mouseover={(e) => {
				kstplmouseover = kstplIndex;
			}}
			on:mouseout={() => (kstplmouseover = -1)}
			on:focus={() => (kstplmouseover = kstplIndex)}
			on:blur={() => (kstplmouseover = -1)}>
			{#if updatingKsTplPath === kstpl.ksid}
				<div class="row m-1 ">{kstpl.ksid}</div>
				<div class="row m-1 ">
					<input
						class="form-control"
						bind:value={kstpl.name} />
				</div>
				<div class="row m-1 ">
					<textarea
						placeholder="Description"
						bind:value={kstpl.desc}
						use:text_area_resize
						class="form-control" />
				</div>
				<div class="row m-1 ">
					<div
						class="btn btn-primary py-0"
            role="none"
						on:keydown={() => {}}
						on:keyup={() => {}}
						on:keypress={() => {}}
						on:click|preventDefault={async () => {
							const { ksid, name, desc, ...others } = kstpl;
							await api.post('kstpl/updateone', { ksid, name, desc }, user.sessionToken);
							updatingKsTplPath = '';
						}}>
						Save
					</div>
				</div>
			{/if}
			<div class="row">
				<div class="col">{kstpl.name} {adminMode ? '(' + kstpl.ksid + ')' : ''}</div>
				{#if adminMode}
					<div class="col-auto">
						<div
							class="btn btn-primary btn-sm py-0"
              role="none"
							on:keydown={() => {}}
							on:keyup={() => {}}
							on:keypress={() => {}}
							on:click|preventDefault={async () => {
								let kstplid = await api.post(
									'kstpl/preparedesign',
									{ ksid: kstpl.ksid },
									user.sessionToken,
								);
								goto(`/template/${kstplid}&edit`);
							}}>
							Design
						</div>
						<div
							class="btn btn-primary btn-sm py-0"
              role="none"
							on:keydown={() => {}}
							on:keyup={() => {}}
							on:keypress={() => {}}
							on:click|preventDefault={() => {
								updatingKsTplPath = updatingKsTplPath === kstpl.ksid ? '' : kstpl.ksid;
							}}>
							{updatingKsTplPath === kstpl.ksid ? 'Close' : 'Edit'}
						</div>
						<div
							class="btn btn-primary btn-sm py-0"
              role="none"
							on:keydown={() => {}}
							on:keyup={() => {}}
							on:keypress={() => {}}
							on:click|preventDefault={async () => {
								await api.post('kstpl/removeone', { ksid: kstpl.ksid }, user.sessionToken);
								ksharesToShow.kstpls.splice(kstplIndex, 1);
								ksharesToShow.kstpls = ksharesToShow.kstpls;
							}}>
							Del
						</div>
						<div
							class="btn btn-primary btn-sm py-0"
              role="none"
							on:keydown={() => {}}
							on:keyup={() => {}}
							on:keypress={() => {}}
							on:click|preventDefault={async () => {
								await api.post(
									'kstpl/removeone',
									{ ksid: kstpl.ksid, withFile: true },
									user.sessionToken,
								);
								ksharesToShow.kstpls.splice(kstplIndex, 1);
								ksharesToShow.kstpls = ksharesToShow.kstpls;
							}}>
							DelFile
						</div>
					</div>
				{:else}
					<div class="col-auto">
						<div
							class="btn btn-secondary  py-0"
              role="none"
							on:keydown={() => {}}
							on:keyup={() => {}}
							on:keypress={() => {}}
							on:click|preventDefault={() => {
								goto(`/template/preview_kshare_${kstpl.ksid}&read`);
							}}>
							{$_('kshare.label.Preview')}
						</div>
						<div
							class="btn btn-primary  py-0"
              role="none"
							on:keydown={() => {}}
							on:keyup={() => {}}
							on:keypress={() => {}}
							on:click|preventDefault={() => {
								if (!user) {
									pickingKsTplPath = '';
									setFadeMessage($_('kshare.pickit.error.no_user'), 'warning');
									return;
								}
								pickingKsTplPath = pickingKsTplPath === kstpl.ksid ? '' : kstpl.ksid;
								kstpl.pickto = kstpl.name;
							}}>
							{pickingKsTplPath === kstpl.ksid ? $_('kshare.label.Close') : $_('kshare.label.Pick')}
						</div>
					</div>
				{/if}
			</div>
			<div class="row m-1">{kstpl.desc}</div>
			<div class="p-2 m-1">
				{#each kstpl.tags as tag}
					<BadgeWithDel
						bind:text={tag}
						withDeleteButton={adminMode === true}
						on:delete={async (e) => {
							let theTpl = await api.post(
								'kstpl/deltag',
								{ ksid: kstpl.ksid, tag: tag },
								user.sessionToken,
							);
							kstpl = theTpl;
							await rebuild();
						}} />
				{/each}
				{#if adminMode}
					<select
						bind:value={kstpl.newtag}
						class="border rounded">
						<option value={'none'}>Pick to add</option>
						<option value={all_scenarios_txt}>{all_scenarios_txt}</option>
						{#each scenarios as txt}
							<option value={txt}>&nbsp;&nbsp;&nbsp;{txt}</option>
						{/each}
						<option value={all_industries_txt}>{all_industries_txt}</option>
						{#each industries as txt}
							<option value={txt}>&nbsp;&nbsp;&nbsp;{txt}</option>
						{/each}
					</select>
					<!-- input bind:value={kstpl.newtag} class="border rounded" / -->
					<button
						class="btn btn-primary btn-sm py-0"
						on:click|preventDefault={async () => {
							if (kstpl.newtag === 'none') return;
							const { ksid, ...others } = kstpl;
							kstpl = await api.post(
								'kstpl/addtag',
								{ ksid: ksid, tag: kstpl.newtag },
								user.sessionToken,
							);
							await rebuild();
						}}>
						Add
					</button>
				{/if}
			</div>
			{#if pickingKsTplPath === kstpl.ksid}
				<div class="row">
					<div class="input-group">
						<div class="input-group-text">{$_('kshare.pickit.pickas')}</div>
						<input
							class="form-control"
							bind:value={kstpl.pickto}
							placeholder={$_('kshare.pickit.placeholder')} />
						<button
							class="btn btn-primary btn-sm py-0"
							on:click|preventDefault={async () => {
								if (!user) {
									pickingKsTplPath = '';
									setFadeMessage($_('kshare.pickit.error.no_user'), 'warning');
								} else {
									let ret = await api.post(
										'kstpl/pickone',
										{ ksid: kstpl.ksid, pickto: kstpl.pickto },
										user.sessionToken,
									);
									if (ret.error) {
										if (ret.error === 'ALREADY_EXIST') {
											setFadeMessage($_('kshare.pickit.error.exists.title'), 'warning');
										} else {
											setFadeMessage(ret.message, 'warning');
										}
									} else {
										setFadeMessage($_('kshare.pickit.result.success'), 'warning');
										api.removeCacheByPath('template/search');
									}
								}
							}}>
							{$_('kshare.label.Confirm')}
						</button>
						<div class="vr">&nbsp;</div>
						<button
							class="btn btn-secondary btn-sm py-0"
							on:click|preventDefault={() => {
								pickingKsTplPath = '';
							}}>
							{$_('kshare.label.Cancel')}
						</button>
					</div>
				</div>
				<div class="row">
					<div class="col m-1" />
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.kfk-link a {
		text-decoration: none;
	}
</style>
