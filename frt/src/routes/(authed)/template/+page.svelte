<svelte:options accessors />

<script lang="ts">
	import { pageName, UiSection } from '$lib/Stores';
	import { menuReloadRecent } from '$lib/menu/MenuData';
	import AniIcon from '$lib/AniIcon.svelte';
	import ToggleUI from '$lib/ui/ToggleUI.svelte';
	import ToggleUIForm from '$lib/ui/ToggleUIForm.svelte';
	import PageTitle from '$lib/PageTitle.svelte';
	import { _, date, time } from '$lib/i18n';
	import { setFadeMessage } from '$lib/Notifier';
	import * as api from '$lib/api';
	import Cover from '$lib/display/Cover.svelte';
	import type { menuItemType } from '$lib/menu/MenuData';
	import { API_SERVER } from '$lib/Env';
	import { TagStorage } from '$lib/mtcLocalStores';
	import { enhance } from '$lib/form';
	import TagPicker from '$lib/TagPicker.svelte';
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import {
		showAdvancedSearch,
		srPage,
		miningMode,
		lastQuery,
		mtcConfirm,
		mtcConfirmReset,
		worklistChangeFlag,
		currentTplid,
	} from '$lib/Stores';
	import ItemEditor from './TplSearchResultItemEditor.svelte';
	import TplEditlog from './TplEditlog.svelte';
	import TplCronEditor from './TplCronEditor.svelte';
	import ColPerRowSelection from '$lib/ColPerRowSelection.svelte';
	import PageSize from '$lib/PageSize.svelte';
	import { onMount } from 'svelte';
	import Parser from '$lib/parser';
	import { filterStorage } from '$lib/mtcLocalStores';
	import { ClientPermControl } from '$lib/clientperm';
	import Pagination from '$lib/pagination/Pagination.svelte';
	import Sort from '$lib/pagination/Sort.svelte';
	import * as Utils from '$lib/utils';
	import { goto } from '$app/navigation';
	import {
		Dropdown,
		DropdownItem,
		DropdownMenu,
		DropdownToggle,
		Icon,
		Container,
		Row,
		Card,
		CardBody,
		CardHeader,
		Col,
		InputGroup,
		InputGroupText,
		Input,
		Button,
	} from 'sveltestrap';
	import { createEventDispatcher, getContext, setContext } from 'svelte';

	const ENDPOINT = 'template/search';
	const BIZ = 'tpl';
	let fileSaver: any = null;
	let loadTimer: any = null;
	let LOADING_TIMEOUT = 400;
	if (!$filterStorage[BIZ]) {
		$filterStorage[BIZ] = { tplTag: '', sortby: '-updatedAt' };
	}
	if ($filterStorage[BIZ].hasOwnProperty('sortby') === false) {
		$filterStorage[BIZ].sortby = '-updatedAt';
	}

	let multiple_selecting = false;
	let rows: any[] = [];
	let rowsCount = 0;
	let pageSer = 0; //first page
	let show_calendar_select = false;
	let recentTemplates: string[] = [];
	let SetFor = {
		setVisiFor: '',
		setAuthorFor: '',
		setDescFor: '',
		setTagFor: '',
		setWeComBotFor: '',
		settingFor: '',
	};
	let files: FileList;
	let tplidImport: string;
	let showform = '';

	let loading = true;
	let newTplName = '';
	let newTplTags = '';
	let editlogfor = '';
	let editlogs: any = [];
	let editCronFor = '';
	let cronStarters = '';
	let cronexpr = '0 8 * * *';
	let crons: any[] = [];
	let searchTimer = null;
	let mouseOverSnapshot = '';
	let urls = {
		create: `${API_SERVER}/template/create`,
	};

	export let data: PageData;
	let { user } = data;
	$: ({ user } = data);
	$: filteredRows = rows;

	let recentIndexHovered = -1;

	function importTemplate(e: Event) {
		e.preventDefault();
		if (ClientPermControl(user.perms, user.eid, 'template', '', 'create') === false) {
			setFadeMessage("You don't have upload permission");
			return;
		}
		const formData = new FormData();
		formData.append('tplid', tplidImport);
		formData.append('file', files[0]);
		const upload = fetch(`${API_SERVER}/template/import`, {
			method: 'POST',
			headers: {
				Authorization: $page.data.token,
			},
			body: formData,
		})
			.then((response) => response.json())
			.then(async (result) => {
				//templates = [result, ...templates];
				rows = [result, ...rows];
				api.removeCacheByPath('template/search');
			})
			.catch((error) => {
				console.error('Error:', error);
			});
	}

	setContext('state', {
		getState: () => ({
			pageSer: $srPage[BIZ],
			pageSize: $filterStorage.pageSize,
			rows,
			filteredRows,
		}),
		setPage: (_page: number) => {
			$srPage[BIZ] = _page;
		},
		setRows: (_rows: any) => {
			filteredRows = _rows;
		},
	});

	async function searchNow(preDelete = false) {
		if (Utils.isBlank($filterStorage[BIZ].tplTag)) {
			$filterStorage[BIZ].tplTag = '';
		}
		if (Parser.isEmpty($filterStorage[BIZ].author)) {
			//$filterStorage[BIZ].author = user.eid;
		} else {
			if ($filterStorage[BIZ].author[0] === '@') {
				$filterStorage[BIZ].author = $filterStorage[BIZ].author.substring(1);
			}
		}
		if (Utils.isBlank($filterStorage[BIZ].pattern)) {
			$filterStorage[BIZ].pattern = '';
		}
		if (!$filterStorage.pageSize) $filterStorage.pageSize = 10;
		load(
			$srPage[BIZ],
			'refresh',
			preDelete ? api.CACHE_FLAG.preDelete : api.CACHE_FLAG.useIfExists,
		).then(() => {});
	}

	async function load(_page: number, reason = 'refresh', cacheFlag = api.CACHE_FLAG.bypass) {
		loading = true;
		let payload = {
			pattern: $filterStorage[BIZ].pattern,
			skip: _page * ($filterStorage.pageSize ? $filterStorage.pageSize : 10),
			limit: $filterStorage.pageSize,
			sortby: $filterStorage[BIZ].sortby,
			tagsForFilter: $filterStorage[BIZ].tplTag.split(';'),
			author: $filterStorage[BIZ].author,
			reason: reason,
		};
		let { skip: _skip, ...payloadWithoutSkip } = payload;
		if (false === Utils.objectEqual(payloadWithoutSkip, $lastQuery[BIZ])) {
			payload.skip = 0;
			$srPage[BIZ] = 0;
		}
		$lastQuery[BIZ] = payloadWithoutSkip;

		const loadPost = async () => {
			const ret = await api.post(ENDPOINT, payload, $page.data.token, cacheFlag);
			if (ret.error) {
				setFadeMessage(ret.message, 'warning');
			} else {
				rows = ret.objs;
				rowsCount = ret.total;
			}
		};
		loadTimer && clearTimeout(loadTimer);
		if (
			cacheFlag === api.CACHE_FLAG.useIfExists &&
			api.hasCache(ENDPOINT, payload, $page.data.token)
		)
			//Direct return cache without wait.
			await loadPost();
		else {
			//Wait certain ms to fetch from server
			loadTimer = setTimeout(async () => {
				await loadPost();
				loadTimer = null;
			}, LOADING_TIMEOUT);
		}
		loading = false;
	}

	export const unshiftRows = function (obj: any) {
		rows = [obj, ...rows];
		rowsCount = rowsCount + 1;
	};

	function onPageChange(event: CustomEvent) {
		load(event.detail.pageSer, 'refresh', api.CACHE_FLAG.useIfExists);
		$srPage[BIZ] = event.detail.pageSer;
	}

	async function onSort(event: CustomEvent) {
		$filterStorage[BIZ].sortby =
			(event.detail.dir === 'desc' ? '-' : '') +
			(event.detail.key === 'name' ? 'tplid' : event.detail.key);
		await load($srPage[BIZ], 'refresh', api.CACHE_FLAG.useIfExists);
	}

	const clearTag = async function (preDelete = false) {
		$filterStorage[BIZ].tplTag = '';
		await searchNow(preDelete);
	};

	const useThisTag = function (tag: string, appendMode = false) {
		if (appendMode) {
			let existingTags = $filterStorage[BIZ].tplTag;
			if (Parser.isEmpty(existingTags)) {
				existingTags = '';
			}
			let existingArr = existingTags.split(';');
			if (existingArr.includes(tag)) {
				existingArr = existingArr.filter((x: string) => x !== tag);
			} else {
				existingArr.push(tag);
				existingArr = existingArr.filter((x: string) => x.length > 0);
			}
			$filterStorage[BIZ].tplTag = existingArr.join(';');
		} else {
			if (tag.trim().length > 0) $filterStorage[BIZ].tplTag = tag.trim();
			else $filterStorage[BIZ].tplTag = '';
		}
		searchNow();
	};

	let desc_input = '';
	let visi_rds_input = '';

	async function __deleteTemplate(tplid: string) {
		let res = await api.post('template/delete/by/tplid', { tplid: tplid }, $page.data.token);
		if (res.error) {
			setFadeMessage(res.message, 'warning');
		} else {
			api.removeCacheByPath('template/search');
			let deletedIndex = -1;
			for (let i = 0; i < rows.length; i++) {
				if (rows[i].tplid === tplid) {
					deletedIndex = i;
					break;
				}
			}
			if (deletedIndex >= 0) {
				rows.splice(deletedIndex, 1);
				rows = rows;
				rowsCount = rowsCount - 1;
			}
		}
	}

	async function __deleteTemplateMultiple() {
		let tplids = rows.filter((x) => x.checked).map((x) => x.tplid);
		if (tplids.length < 1) return;
		$mtcConfirm = {
			title: $_('confirm.delete.template-multi.title', { values: { count: tplids.length } }),
			body: $_('confirm.delete.template-multi.body', { values: { count: tplids.length } }),
			buttons: [$_('confirm.delete.template-multi.yes') as unknown as never],
			callbacks: [
				async () => {
					mtcConfirmReset();
					let res = await api.post('template/delete/multi', { tplids: tplids }, $page.data.token);
					if (res.error) {
						setFadeMessage(res.message, 'warning');
					} else {
						api.removeCacheByPath('template/search');
						let tmp: typeof rows = [];
						for (let r = 0; r < rows.length; r++) {
							if (tplids.includes(rows[r].tplid) === false) tmp.push(rows[r]);
						}
						rowsCount = tmp.length;
						rows = tmp;
					}
				},
			],
		};
	}

	let allTags: any = {
		org: [],
		mine: [],
	};

	async function reloadTags() {
		allTags.org = await api.post('tag/org', {}, $page.data.token);
		allTags.mine = await api.post('tag/list', { objtype: 'template' }, $page.data.token);
		$TagStorage = allTags;
	}

	function deleteRow(tplid: string) {
		$mtcConfirm = {
			title: $_('confirm.delete.template.title'),
			body: $_('confirm.delete.template.body'),
			buttons: [$_('confirm.delete.template.yes')],
			callbacks: [
				async () => {
					await __deleteTemplate(tplid);
					recentTemplates = recentTemplates.filter((x) => x !== tplid);
					localStorage && localStorage.setItem('recentTemplates', JSON.stringify(recentTemplates));
					$menuReloadRecent = true;
					mtcConfirmReset();
				},
			],
		};
	}

	onMount(async () => {
		$pageName = $_('title.template');
		if (localStorage) {
			recentTemplates = JSON.parse(localStorage.getItem('recentTemplates') ?? JSON.stringify([]));
		}
		if ($showAdvancedSearch[BIZ] === undefined) {
			LOADING_TIMEOUT = 0;
			$showAdvancedSearch[BIZ] = false;
			resetQuery();
		} else {
			LOADING_TIMEOUT = 400;
			if ($showAdvancedSearch[BIZ] === false) {
				resetQuery();
			} else {
				await searchNow();
			}
		}
	});
	const stateContext = getContext('state');

	const showCronTable = async function (e: Event, tplid: string) {
		e.preventDefault();
		editCronFor = tplid;
		crons = (await api.post(
			'template/crons',
			{ tplid: tplid },
			$page.data.token,
		)) as unknown as any[];
		console.log(crons);
	};

	/*
	const startNow = async function (e: Event, tplid: string) {
		e.preventDefault();
		await api.post(
			'template/batch/start',
			{ tplid: tplid, starters: cronStarters },
			$page.data.token
		);
		api.removeCacheByPath('workflow/search');
		api.removeCacheByPath('work/search');
		$worklistChangeFlag++;
	};
	*/

	const deleteCrontab = async function (e: Event, tplid: string, cronId: string) {
		crons = (await api.post(
			'template/delcron',
			{ id: cronId, tplid: tplid },
			$page.data.token,
		)) as unknown as any[];
		e.preventDefault();
		console.log(crons);
	};

	function resetQuery(preDelete = false) {
		$filterStorage[BIZ].tplTag = '';
		$filterStorage[BIZ].author = '';
		$filterStorage[BIZ].pattern = '';
		$srPage[BIZ] = 0;
		if (preDelete) {
			api.removeCacheByPath('template/search');
		}
		searchNow(preDelete).then();
	}

	const toggleAdvancedSearch = async () => {
		$showAdvancedSearch[BIZ] = !$showAdvancedSearch[BIZ];
		if ($showAdvancedSearch[BIZ] == false) {
			resetQuery();
		}
	};

	$: $page.data.action
		? (() => {
				switch ($page.data.action) {
					case 'create':
						showform = 'create';
						$showAdvancedSearch[BIZ] = false;
						break;
					case 'import':
						showform = 'import';
						$showAdvancedSearch[BIZ] = false;
						break;
					case 'search':
						showform = '';
						$showAdvancedSearch[BIZ] = true;
				}
				return true;
		  })()
		: (() => {
				showform = '';
				$showAdvancedSearch[BIZ] = false;
		  })();
</script>

<div class="debug">
	{JSON.stringify($page.data.action)}
</div>

<Container class="p-2">
	<!-- START 头部第一行 信息 及 按钮 -->
	<div class="hstack gap-2">
		<PageTitle>
			{$_('title.template')}
		</PageTitle>
		<!-- div
			class="btn btn-primary m-0 py-1 px-3 ms-auto"
			on:keydown={() => {}}
			on:keyup={() => {}}
			on:keypress={() => {}}
			on:click|preventDefault={async () => {
				showform = 'create';
			}}
			on:keydown={() => {}}
			on:keyup={() => {}}
			on:keypress={() => {}}>
			{$_('button.create')}
		</div>
		<div
			class="btn btn-primary m-0 py-1 px-3"
			on:keydown={() => {}}
			on:keyup={() => {}}
			on:keypress={() => {}}
			on:click|preventDefault={async () => {
				showform = 'import';
			}}
			on:keydown={() => {}}
			on:keyup={() => {}}
			on:keypress={() => {}}>
			{$_('button.import')}
		</div -->
		<div class="ms-auto col-auto">
			<div class="text-center fs-5">
				<a
					href={'#'}
					class="kfk-link"
					on:click|preventDefault={async () => {
						showform = 'create';
					}}>
					<AniIcon
						icon="plus-circle"
						ani="aniSpin" />
					{$_('button.create_new_template')}
				</a>
			</div>
		</div>
		<div class="ms-auto col-auto">
			<ToggleUI />
		</div>
		<div
			class="btn btn-primary m-0 p-1 btn-lg"
      role="none"
			on:click={() => {
				resetQuery(true);
			}}
			on:keydown={null}>
			{$_('button.resetQuery')}
		</div>
	</div>
	<ToggleUIForm />

	{#if $UiSection['tag']}
		<TagPicker
			{BIZ}
			{useThisTag}
			{clearTag} />
		<div class="row">
			<div class="col">
				<div class="mt-1 mx-0 w-100 recent">
					{$_('template.recent')}
					{#each recentTemplates as aTplid, recentIndex}
						<a
							href={'#'}
							on:click|preventDefault={(e) => {
								e.preventDefault();
								goto(`/template/start?tplid=${aTplid}`, { replaceState: false });
							}}>
							{aTplid}
						</a>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	{#if $UiSection['search']}
		<div>
			<Row
				cols={{ xs: 1, md: 2 }}
				class="mt-1">
				<Col>
					<div class="search d-flex">
						<InputGroup>
							<!-- <InputGroupText> -->
							<!-- 	{$_('remotetable.filter')} -->
							<!-- </InputGroupText> -->
							<input
								class="flex-fill form-control"
								type="search"
								title={$_('remotetable.bywhat')}
								placeholder={$_('remotetable.bywhat')}
								bind:value={$filterStorage[BIZ].pattern} />
							<div
								class="btn btn-primary"
                role="none"
								on:keydown={() => {}}
								on:keyup={() => {}}
								on:keypress={() => {}}
								on:click|preventDefault={() => {
									searchNow().then();
								}}>
								<i class="bi bi-arrow-return-left" />
							</div>
						</InputGroup>
					</div>
				</Col>
				<Col>
					<InputGroup>
						<!-- InputGroupText>
							{$_('remotetable.author')}
						</InputGroupText -->
						<Input
							class="flex-fill"
							bind:value={$filterStorage[BIZ].author}
							placeholder={$_('remotetable.byauthor')} />
						<div
							class="btn btn-primary"
              role="none"
							on:keydown={() => {}}
							on:keyup={() => {}}
							on:keypress={() => {}}
							on:click|preventDefault={() => {
								searchNow().then();
							}}
							color="primary">
							<i class="bi bi-arrow-return-left" />
						</div>
						<!-- <div -->
						<!-- 	class="btn btn-secondary m-0 py-1 px-3" -->
						<!-- 	on:keydown={() => {}} -->
						<!-- 	on:keyup={() => {}} -->
						<!-- 	on:keypress={() => {}} -->
						<!-- 	on:click|preventDefault={async () => { -->
						<!-- 		$filterStorage[BIZ].author = user.eid; -->
						<!-- 		await searchNow(); -->
						<!-- 	}} -->
						<!-- 	color={'light'}> -->
						<!-- 	{$_('remotetable.me')} -->
						<!-- </div> -->
						<!-- <div -->
						<!-- 	class="btn btn-secondary  m-0 py-1 px-3" -->
						<!-- 	on:keydown={() => {}} -->
						<!-- 	on:keyup={() => {}} -->
						<!-- 	on:keypress={() => {}} -->
						<!-- 	on:click|preventDefault={async () => { -->
						<!-- 		$filterStorage[BIZ].author = ''; -->
						<!-- 		await searchNow(); -->
						<!-- 	}} -->
						<!-- 	color="light"> -->
						<!-- 	{$_('remotetable.any')} -->
						<!-- </div> -->
					</InputGroup>
				</Col>
			</Row>
		</div>
	{/if}
	{#if showform === 'create'}
		{#if user.perms && ClientPermControl(user.perms, user.eid, 'template', '', 'create')}
			<form>
				<Container
					class="my-3"
					style="max-width:400px;">
					<Row
						cols="1"
						class="mb-5">
						<Col>
							<div class="form-floating flex-fill">
								<input
									name="tplid"
									bind:value={newTplName}
									class="form-control"
									id="input-tplid"
									aria-label="Create template"
									placeholder="New template name" />
								<label for="input-tplid">
									{$_('template.create.name')}
								</label>
							</div>
						</Col>
						<Col class="mt-2">
							<div class="form-floating flex-fill">
								<input
									name="tags"
									bind:value={newTplTags}
									id="input-tags"
									class="w-100 form-control"
									aria-label="template tags"
									placeholder="tags delimiter with space/;/," />
								<label for="input-tags">
									{$_('template.create.tags')}
								</label>
							</div>
						</Col>
						<Col class="my-3">
							<Row>
								<Col class="col-8">
									<div
										class="btn btn-primary h-100 w-100"
                    role="none"
										on:keydown={() => {}}
										on:keyup={() => {}}
										on:keypress={() => {}}
										on:click|preventDefault={async () => {
											if (ClientPermControl(user.perms, user.eid, 'template', '', 'create')) {
												let res = await api.post(
													'template/create',
													{ tplid: newTplName, tags: newTplTags },
													$page.data.token,
												);
												if (res.error) {
													setFadeMessage(res.message, 'warning');
												} else {
													rows = [res, ...rows];
													rowsCount++;
													newTplName = '';
													newTplTags = '';
													$filterStorage[BIZ].author = '';
													$filterStorage[BIZ].pattern = '';
													api.removeCacheByPath('template/search');
													setFadeMessage(
														$_('notify.create_template_success', {
															values: { tplid: res.tplid },
														}),
													);
												}
											} else {
												setFadeMessage("You don't have permision", 'warning');
											}
										}}>
										{$_('button.create')}
									</div>
								</Col>
								<Col class="col-4">
									<div
										class="btn btn-primary h-100 w-100"
                    role="none"
										on:keydown={() => {}}
										on:keyup={() => {}}
										on:keypress={() => {}}
										on:click|preventDefault={(e) => {
											e.stopPropagation();
											showform = '';
										}}>
										{$_('button.cancel')}
									</div>
								</Col>
							</Row>
						</Col>
					</Row>
				</Container>
			</form>
		{:else}
			No Create Tempalte Permission
		{/if}
	{:else if showform === 'import'}
		{#if user.perms && ClientPermControl(user.perms, user.eid, 'template', '', 'create')}
			<form
				class="new"
				enctype="multipart/form-data">
				<Container class="mt-3">
					<div class="card p-3">
						<div class="card-header">{$_('template.import.from_local_disk')}</div>
						<div class="card-body">
							<Row
								cols="1"
								class="mb-5">
								<Col>
									<div class="form-floating flex-fill">
										<input
											name="tplid"
											id="input-tplid"
											placeholder="New template name"
											class="form-control"
											bind:value={tplidImport} />
										<label for="input-tplid">
											{$_('template.import.name')}
										</label>
									</div>
								</Col>
								<Col class="mt-2">
									<div class="form-floating flex-fill">
										<input
											name="file"
											id="import_template_file_select_button"
											type="file"
											bind:files />
									</div>
								</Col>
								<Col class="mt-3">
									<Row>
										<Col class="col-8">
											<div
												class="btn btn-primary h-100 w-100"
                        role="none"
												on:click|preventDefault={importTemplate}
												on:keydown={() => {}}
												on:keyup={() => {}}
												on:keypress={() => {}}
												color="primary">
												{$_('button.import')}
											</div>
										</Col>
										<Col class="col-4">
											<div
												class="btn btn-secondary h-100 w-100"
                        role="none"
												color="secondary"
												on:click|preventDefault={() => {
													showform = '';
												}}
												on:keydown={() => {}}
												on:keyup={() => {}}
												on:keypress={() => {}}>
												{$_('button.cancel')}
											</div>
										</Col>
									</Row>
								</Col>
							</Row>
							<Row>
								<div class="text-center">
									<a
										href={'#'}
										class="btn border-0 m-0 p-0 text-primary"
										on:click={() => {
											goto('/kshares');
										}}>
										{$_('template.import.from_process_hub')}
									</a>
								</div>
							</Row>
						</div>
					</div>
				</Container>
			</form>
		{:else}
			No Create Tempalte Permission
		{/if}
	{/if}

	{#if rowsCount < 1}
		<div class="mt-5">
			{$_('template.empty')}
		</div>
	{:else}
		<div class="container">
			{#if $UiSection['sort']}
				{#key rowsCount}
					<div class="row">
						<div class="col">
							<Pagination
								pageSer={$srPage[BIZ]}
								pageSize={$filterStorage.pageSize}
								count={rowsCount}
								on:pageChange={onPageChange} />
						</div>
					</div>
				{/key}
				<div class="row">
					<div class="col col-auto">{$_('remotetable.sortBy')}:</div>
					<div class="col col-3 col-md-2">
						{$_('remotetable.name')}
						<Sort
							key="tplid"
							on:sort={onSort}
							dir={$filterStorage[BIZ].sortby.indexOf('tplid') < 0
								? 'asc'
								: $filterStorage[BIZ].sortby[0] === '-'
								? 'desc'
								: 'asc'} />
					</div>
					<div class="col col-3 col-md-2">
						{$_('remotetable.author')}
						<Sort
							key="author"
							on:sort={onSort}
							dir={$filterStorage[BIZ].sortby.indexOf('author') < 0
								? 'asc'
								: $filterStorage[BIZ].sortby[0] === '-'
								? 'desc'
								: 'asc'} />
					</div>
					<div class="col col-3 col-md-2">
						{$_('remotetable.updatedAt')}
						<Sort
							key="updatedAt"
							on:sort={onSort}
							dir={$filterStorage[BIZ].sortby.indexOf('updatedAt') < 0
								? 'asc'
								: $filterStorage[BIZ].sortby[0] === '-'
								? 'desc'
								: 'asc'} />
					</div>
				</div>
			{/if}
			{#if $UiSection['layout']}
				<div class="row">
					<div class="col col-6 col-md-2">
						<PageSize
							on:pagesize={async () => {
								await load(0, 'refresh', api.CACHE_FLAG.useIfExists);
							}} />
					</div>
					<div class="col col-6 col-md-2">
						<ColPerRowSelection />
					</div>
					{#if user.group === 'ADMIN'}
						<div class="col">
							<div
								class="btn m-0 p-1 kfk-link"
                role="none"
								on:click|preventDefault={() => (multiple_selecting = !multiple_selecting)}
								on:keydown={() => {}}
								on:keyup={() => {}}
								on:keypress={() => {}}>
								{#if multiple_selecting}
									{$_('remotetable.multi-select-cancel')}
								{:else}
									{$_('remotetable.multi-select')}
								{/if}
							</div>
						</div>
					{/if}
				</div>
				{#if multiple_selecting}
					<Row>
						<div
							class="btn col kfk-link"
              role="none"
							on:click|preventDefault={() => {
								for (let r = 0; r < rows.length; r++) {
									rows[r].checked = true;
								}
							}}
							on:keydown={() => {}}
							on:keyup={() => {}}
							on:keypress={() => {}}>
							{$_('remotetable.multi-select-all')}
						</div>
						<div
							class="btn col kfk-link"
              role="none"
							on:click|preventDefault={() => {
								for (let r = 0; r < rows.length; r++) {
									rows[r].checked = false;
								}
							}}
							on:keydown={() => {}}
							on:keyup={() => {}}
							on:keypress={() => {}}>
							{$_('remotetable.multi-select-none')}
						</div>
						{#if rows.filter((x) => x.checked).length > 0}
							<div
								class="btn col kfk-link"
                role="none"
								on:click|preventDefault={() => {
									__deleteTemplateMultiple();
								}}
								on:keydown={() => {}}
								on:keyup={() => {}}
								on:keypress={() => {}}>
								{$_('remotetable.multi-select-delete')}
							</div>
						{/if}
					</Row>
				{/if}
			{/if}
			<Row cols={$filterStorage.col_per_row}>
				{#each rows as row, index (row)}
					<!-- 每个业务模板放在一个 col 中， 每行显示多少个 col，也就是每行多少个业务模板，用 col_per_row 来实现控制 -->
					<div class="col mb-2 card p-2">
						<!-- 在每个模板col 中，再起一个 row，共有两列，第一列为选择 checkbox， 第二列为模板对象内容 -->
						<div class="row">
							<!-- 选择 checkbox 开始 -->
							{#if multiple_selecting}
								<div class="col col-auto">
									<input
										type="checkbox"
										bind:checked={row.checked} />
								</div>
							{/if}
							<!-- 选择 checkbox 结束 -->
							<!-- 模板对象内容col开始 -->
							<!-- 在这个 col 中，有若干个 row，每个 row 显示不同的属性内容 -->
							<div class="col">
								<div class="row row-cols-1">
									<!-- 第一行，显示模板名称 -->
									<div class="col">
										<a
											class="tnt-workflow-id kfk-link fs-4"
											href={`/biz/${row.tplid}`}>
											{row.tplid}
										</a>
									</div>
								</div>
								<div class="row row-cols-1 smalltext tpldesc">
									<!-- 第二行，显示模板描述 -->
									<div class="col">
										{$_('remotetable.author')}:
										{row.authorName
											? row.authorName
											: row.author.indexOf('@') > -1
											? row.author.substring(0, row.author.indexOf('@'))
											: row.author}
									</div>
									{#if row.desc?.trim()}
										<div class="col">
											{row.desc}
										</div>
									{/if}
									{#if row.visi}
										<div class="col">
											{$_('remotetable.visifor')}
											{row.visi}
										</div>
									{/if}
								</div>
								<div class="row tplcmds">
									<!-- 封面 -->
									<div class="col col-auto">
										<table>
											<tr>
												<td>
													<!--  模板的封面 -->
													<a href={`/biz/${row.tplid}`}>
														<object
															type="image/svg+xml"
															data={`/snapshot?objtype=tpl&objid=${row.tplid}`}
															class={mouseOverSnapshot === row.tplid
																? 'cover-fullscreen'
																: 'cover-90'}
															title="" />
													</a>
												</td>
												<td class="ps-3">
													<div
														class="btn btn-sm btn-primary mb-1 text-nowrap"
														color="primary"
														on:keydown={null}
                            role="none"
														on:click|preventDefault={(e) => {
															e.preventDefault();
															goto(`template/start?tplid=${row.tplid}`, { replaceState: false });
														}}>
														{$_('remotetable.startApp')}
													</div>
												</td>
												<td class="ps-3" />
												<td>
													<Dropdown class="m-0 p-0">
														<DropdownToggle
															color="primary"
															class="btn-sm">
															{$_('remotetable.moreActions')}
														</DropdownToggle>
														<DropdownMenu class="bg-light">
															<!-- <DropdownItem> -->
															<!-- 	{$_('remotetable.tplaction.lastUpdate')}: {TimeTool.format( -->
															<!-- 		row.updatedAt, -->
															<!-- 		'YYYY-MM-DD HH:mm:ss', -->
															<!-- 	)} -->
															<!-- </DropdownItem> -->
															{#if user.perms && ClientPermControl(user.perms, user.eid, 'template', row, 'delete')}
																<DropdownItem>
																	<a
																		href={'#'}
																		class="nav-link"
																		on:keydown={null}
																		on:click={(e) => {
																			e.preventDefault();
																			if (SetFor.settingFor === '') {
																				SetFor.setVisiFor = row.tplid;
																				SetFor.setAuthorFor = row.tplid;
																				SetFor.setDescFor = row.tplid;
																				SetFor.setTagFor = row.tplid;
																				SetFor.setWeComBotFor = row.tplid;
																				SetFor.settingFor = row.tplid;
																				row.checked = false;
																				visi_rds_input = row.visi;
																			} else {
																				row.checked = false;
																				SetFor.settingFor = '';
																				SetFor.setTagFor = '';
																				SetFor.setAuthorFor = '';
																				SetFor.setDescFor = '';
																				SetFor.setWeComBotFor = '';
																				SetFor.setVisiFor = '';
																				visi_rds_input = '';
																			}
																		}}>
																		<Icon name="list-task" />
																		{$_('remotetable.tplaction.set')}
																	</a>
																</DropdownItem>
															{/if}
															<DropdownItem>
																<a
																	href={'#'}
																	on:click|preventDefault={async () => {
																		$currentTplid = row.tplid;
																		goto('/workflow');
																	}}
																	class="nav-link ">
																	<Icon name="bar-chart-steps" />
																	{$_('remotetable.tplaction.seeWorkflows')}
																</a>
															</DropdownItem>
															<DropdownItem>
																<a
																	href={'#'}
																	on:click|preventDefault={async () => {
																		$currentTplid = row.tplid;
																		goto('/work');
																	}}
																	class="nav-link ">
																	<Icon name="list-task" />
																	{$_('remotetable.tplaction.seeWorklist')}
																</a>
															</DropdownItem>
															{#if user.perms && ClientPermControl(user.perms, user.eid, 'template', row, 'delete')}
																<DropdownItem>
																	<a
																		href={'#'}
																		on:click|preventDefault={async (e) => {
																			e.preventDefault();
																			editlogs = await api.post(
																				'/template/editlog',
																				{ tplid: row.tplid },
																				$page.data.token,
																			);
																			editlogfor = row.tplid;
																			visi_rds_input = row.visi;
																		}}
																		class="nav-link ">
																		<Icon name="person-plus-fill" />
																		{$_('remotetable.tplaction.editors')}
																	</a>
																</DropdownItem>
																<DropdownItem>
																	<a
																		href={'#'}
																		on:click|preventDefault={(e) => {
																			showCronTable(e, row.tplid);
																		}}
																		class="nav-link ">
																		<Icon name="clock-fill" />
																		{$_('remotetable.tplaction.scheduler')}
																	</a>
																</DropdownItem>
																<DropdownItem>
																	<a
																		href={'#'}
																		on:click|preventDefault={() => deleteRow(row.tplid)}
																		class="nav-link ">
																		<Icon name="trash" />
																		{$_('remotetable.tplaction.deleteThisTempalte')}
																	</a>
																</DropdownItem>
																<DropdownItem>
																	<a
																		href={'#'}
																		on:click|preventDefault={() => {
																			$filterStorage['wf'].tplid = row.tplid;
																			$showAdvancedSearch['wf'] = true;
																			$miningMode = true;
																			goto('/workflow');
																		}}
																		on:keydown={() => {}}
																		on:keyup={() => {}}
																		on:keypress={() => {}}
																		class="nav-link ">
																		<Icon name="graph-up-arrow" />
																		{$_('remotetable.tplaction.analysis')}
																	</a>
																</DropdownItem>
																<DropdownItem>
																	<a
																		href={'#'}
																		on:click={async (e) => {
																			e.preventDefault();
																			api
																				.postSimple(
																					'mining/data',
																					{ tplid: row.tplid, wfid: '' },
																					$page.data.token,
																				)
																				.then((res) => {
																					return res.blob();
																				})
																				.then(async (data) => {
																					if (fileSaver === null) {
																						fileSaver = await import('file-saver');
																					}
																					fileSaver.saveAs(data, `${row.tplid}_report.xlsx`);
																				});
																		}}
																		on:keydown={() => {}}
																		on:keyup={() => {}}
																		on:keypress={() => {}}
																		class="nav-link">
																		<Icon name="cloud-download" />
																		{$_('remotetable.tplaction.exportdata')}
																	</a>
																</DropdownItem>
															{/if}
														</DropdownMenu>
													</Dropdown>
												</td>
											</tr>
										</table>
									</div>
									<!-- 模版名称 以及 下拉菜单行  -->
									<!-- 当个模版的下拉菜单 -->
								</div>
								<!-- END of 当个模版的下拉菜单 -->
								<div class="row tplsettings">
									<div class="col">
										{#if editlogfor === row.tplid}
											<!-- 编辑历史  -->
											<TplEditlog
												bind:editlogfor
												bind:editlogs />
										{/if}
										{#if editCronFor === row.tplid}
											<!-- Crontab editor -->
											<TplCronEditor
												bind:editCronFor
												bind:crons
												bind:tpl={row}
												bind:cronexpr
												bind:cronStarters />
										{/if}
										<ItemEditor
											{rows}
											{row}
											{visi_rds_input}
											{index}
											{setFadeMessage}
											{reloadTags}
											{SetFor}
											on:rowChanged={(e) => {
												row = e.detail;
											}}
											on:tplidChanged={(e) => {
												try {
													let data = e.detail;
													let anyRecent = false;
													for (let i = 0; i < recentTemplates.length; i++) {
														if (recentTemplates[i] === data.from) {
															recentTemplates[i] = data.to;
															anyRecent = true;
														}
													}
													if (anyRecent) {
														recentTemplates = recentTemplates;
														localStorage &&
															localStorage.setItem(
																'recentTemplates',
																JSON.stringify(recentTemplates),
															);
														$menuReloadRecent = true;
													}
												} catch (e) {
													console.log(e);
												} finally {
													api.removeCacheByPath('template/search');
												}
											}}
											on:authorSet={(e) => {
												row = e.detail;
												rows[index] = row;
												SetFor.setAuthorFor = '';
											}} />
									</div>
									<!-- tplsettings col -->
								</div>
								<!-- tplsettings row -->
							</div>
							<!-- 模板对象内容col结束 -->
						</div>
					</div>
					<!-- end of each template col-->
				{/each}
			</Row>
			{#key rowsCount}
				<div class="mt-3 fs-6 fw-lighter">
					<Pagination
						pageSer={$srPage[BIZ]}
						pageSize={$filterStorage.pageSize}
						count={rowsCount}
						on:pageChange={onPageChange} />
				</div>
			{/key}
		</div>
	{/if}
</Container>

<style>
	.recent a {
		font-size: 0.8rem;
		text-decoration: none;
	}
	.recent a:hover {
		border: solid;
		border-color: var(--primary-color);
		border-radius: 5px;
	}
	.smalltext {
		font-size: 10px;
	}
	.tpldesc {
		margin-left: 0.5rem;
		margin-right: 0.2rem;
	}
	.tplsettings,
	.tplcmds {
		margin-left: 0.5rem;
		margin-right: 0.2rem;
	}
</style>
