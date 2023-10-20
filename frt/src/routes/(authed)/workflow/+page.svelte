<svelte:options accessors />

<script lang="ts">
	import { pageName } from '$lib/Stores';
	import { _, date, time } from '$lib/i18n';
	import PageTitle from '$lib/PageTitle.svelte';
	import * as Utils from '$lib/utils';
	import * as api from '$lib/api';
	import async from 'async';
	import ToggleUI from '$lib/ui/ToggleUI.svelte';
	import ToggleUIForm from '$lib/ui/ToggleUIForm.svelte';
	import ButtonToggleSearch from '$lib/input/ButtonToggleSearch.svelte';
	import ButtonResetQuery from '$lib/input/ButtonResetQuery.svelte';
	import TagPicker from '$lib/TagPicker.svelte';
	import CurrentTplId from '$lib/CurrentTplId.svelte';
	import AniIcon from '$lib/AniIcon.svelte';
	import Miner from './miner/Miner.svelte';
	import {
		miningMode,
		showAdvancedSearch,
		srPage,
		lastQuery,
		lastMining,
		worklistChangeFlag,
		mtcSession,
		mtcConfirm,
		mtcConfirmReset,
		currentTplid,
		UiSection,
	} from '$lib/Stores';
	import { page } from '$app/stores';
	import { setFadeMessage } from '$lib/Notifier';
	import { filterStorage } from '$lib/mtcLocalStores';
	import Searchlet from '$lib/Searchlet.svelte';
	import ColPerRowSelection from '$lib/ColPerRowSelection.svelte';
	import PageSize from '$lib/PageSize.svelte';
	import { tspans } from '$lib/variables';
	import Parser from '$lib/parser';
	import { onMount } from 'svelte';
	import type { Workflow, UiSectionType } from '$lib/types';
	import Pagination from '$lib/pagination/Pagination.svelte';
	import Sort from '$lib/pagination/Sort.svelte';
	import { goto } from '$app/navigation';
	import { Row, Col, InputGroup, InputGroupText, Input, Icon } from 'sveltestrap';
	import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle, NavLink } from 'sveltestrap';
	import { ClientPermControl } from '$lib/clientperm';
	import { setContext } from 'svelte';

	const ENDPOINT_SEARCH = 'workflow/search';
	const ENDPOINT_MINING = 'workflow/mining';
	const MINING_BATCH_INTERVAL = 500;
	const MINING_BATCH_NUMBER = 3;
	const BIZ = 'wf';
	let loadTimer: ReturnType<typeof setTimeout> | null = null;
	let LOADING_TIMEOUT = 400;
	if (!$filterStorage[BIZ]) {
		$filterStorage[BIZ] = { tplTag: '', sortby: '-updatedAt' };
	}
	if ($filterStorage[BIZ].hasOwnProperty('sortby') === false) {
		$filterStorage[BIZ].sortby = '-updatedAt';
	}

	let rows: Workflow[] = [] as Workflow[];
	let miningData: any[] = [];

	let multiple_selecting = false;
	let loading = true;
	let rowsCount = 0;
	let show_calendar_select = false;
	let setPboAtFor = '';
	let settingFor = '';
	let user = $page.data.user;
	let aSsPicked = '';
	let statuses = [
		{ value: 'All', label: $_('status.All') },
		{ value: 'ST_RUN', label: $_('status.ST_RUN') },
		{ value: 'ST_PAUSE', label: $_('status.ST_PAUSE') },
		{ value: 'ST_DONE', label: $_('status.ST_DONE') },
		{ value: 'ST_STOP', label: $_('status.ST_STOP') },
	];
	let statusesof = [
		{ value: 'All', label: $_('statusof.All') },
		{ value: 'ST_RUN', label: $_('statusof.ST_RUN') },
		{ value: 'ST_PAUSE', label: $_('statusof.ST_PAUSE') },
		{ value: 'ST_DONE', label: $_('statusof.ST_DONE') },
		{ value: 'ST_STOP', label: $_('statusof.ST_STOP') },
	];

	if (!$mtcSession.tplIdsForSearch_for_wf) {
		$mtcSession.tplIdsForSearch_for_wf = [];
	}
	if ($filterStorage[BIZ].calendar_begin !== '' || $filterStorage[BIZ].calendar_end !== '') {
		show_calendar_select = true;
	} else {
		show_calendar_select = false;
	}

	$: filteredRows = rows;

	setContext('state', {
		getState: () => ({
			pageSer: $srPage[BIZ],
			pageSize: $filterStorage.pageSize,
			rows,
			filteredRows,
		}),
		setPage: (_pageSer: number) => {
			$srPage[BIZ] = _pageSer;
		},
		setRows: (_rows: any[]) => {
			filteredRows = _rows;
		},
	});

	const clearTag = async function (preDelete = false) {
		$filterStorage[BIZ].tplTag = '';
		try {
			let tmp = await api.post(
				'template/tplid/list',
				{},
				user.sessionToken,
				preDelete ? api.CACHE_FLAG.preDelete : api.CACHE_FLAG.useIfExists,
			);
			$mtcSession.tplIdsForSearch_for_wf = tmp.map((x: any) => x.tplid);
			searchNow();
		} catch (err) {
			console.error(err);
		}
	};

	const useThisTag = async function (tag: string, appendMode = false) {
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
		//$filterStorage[BIZ].tplid = '';
		let tmp = await api.post(
			'template/tplid/list',
			{ tags: $filterStorage[BIZ].tplTag },
			user.sessionToken,
			api.CACHE_FLAG.useIfExists,
		);
		$mtcSession.tplIdsForSearch_for_wf = tmp.map((x: { tplid: string }) => x.tplid);
		await searchNow();
	};

	async function load(_pageSer: number, reason = 'refresh', cacheFlag = api.CACHE_FLAG.bypass) {
		loading = true;
		let payload = {
			pattern: $filterStorage[BIZ].pattern,
			skip: _pageSer * $filterStorage.pageSize,
			limit: $filterStorage.pageSize,
			sortby: $filterStorage[BIZ].sortby,
			status: $filterStorage[BIZ].status,
			tspan: $filterStorage[BIZ].tspan,
			starter: $filterStorage[BIZ].starter,
			reason: reason,
			tagsForFilter: [] as string[],
			calendar_begin: '',
			calendar_end: '',
			tplid: '',
		};
		if ($filterStorage[BIZ].tplTag)
			payload['tagsForFilter'] = $filterStorage[BIZ].tplTag.split(';');
		//if ($filterStorage[BIZ].tplid.trim()) payload['tplid'] = $filterStorage[BIZ].tplid.trim();
		if ($currentTplid.trim()) payload['tplid'] = $currentTplid.trim();
		if ($filterStorage[BIZ].calendar_begin && $filterStorage[BIZ].calendar_end) {
			payload['calendar_begin'] = $filterStorage[BIZ].calendar_begin;
			payload['calendar_end'] = $filterStorage[BIZ].calendar_end;
		}

		let { skip: _skip, ...payloadWithoutSkip } = payload;
		let { skip: __skip, limit: __limit, sortby: __sortBy, ...payloadForMining } = payload;
		if (false === Utils.objectEqual(payloadWithoutSkip, $lastQuery[BIZ])) {
			payload.skip = 0;
			$srPage[BIZ] = 0;
		}
		$lastQuery[BIZ] = payloadWithoutSkip;
		$lastMining = payloadForMining;

		const searchOnServer = async () => {
			const ret = await api.post(ENDPOINT_SEARCH, payload, user.sessionToken, cacheFlag);
			if (ret.error) {
				if (ret.error === 'KICKOUT') {
					setFadeMessage($_('userSession.forcetohome'));
					goto('/');
				} else {
					setFadeMessage(ret.message, 'warning');
				}
			} else {
				rows = ret.objs;
				rowsCount = ret.total;
			}
		};

		const getIndividualProcessData = async () => {
			type callbackFunc = (a: any, b: any) => void;
			type outerFunc = (fn: callbackFunc) => void;

			const tasks: outerFunc[] = [];
			const batch = MINING_BATCH_NUMBER;
			//把流程每「batch」作为一批，去服务器请求其details信息
			for (let b = 0; b < miningData.length / batch + 1 && b * batch < miningData.length; b++) {
				const batchWfIds: string[] = [];
				//组织需要取其detail的工作流wfid数组，用于向服务器传递
				for (let a = 0; a < batch; a++) {
					const idx = b * batch + a;
					if (idx >= miningData.length) break;
					batchWfIds.push(miningData[idx].wfid);
				}
				tasks.push(function (callback: (a: any, b: any) => void) {
					setTimeout(async function () {
						console.log('workflow/detail', batchWfIds);
						const details = await api.post(
							'mining/workflow/details',
							{ wfids: batchWfIds },
							user.sessionToken,
						);
						if (details.error) {
							console.error(details.message);
						} else {
							for (let m = 0; m < details.length; m++) {
								miningData[b * batch + m].mdata = details[m];
							}
							miningData = miningData;
						}
						callback(null, b);
					}, MINING_BATCH_INTERVAL);
				});
			}
			console.log('Tasks number', tasks.length);
			async.series(tasks, (err, results) => {
				if (err) console.log(err);
				else console.log(results);
			});
		};

		const miningOnServer = async () => {
			const ret = await api.post(
				ENDPOINT_MINING,
				payloadForMining as unknown as Record<string, unknown>,
				user.sessionToken,
				cacheFlag,
			);
			miningData = ret;
			await getIndividualProcessData();
		};

		if ($miningMode === false) {
			loadTimer && clearTimeout(loadTimer);
			if (
				cacheFlag === api.CACHE_FLAG.useIfExists &&
				api.hasCache(ENDPOINT_SEARCH, payload, user.sessionToken)
			)
				//Direct fetch from server without wait.
				await searchOnServer();
			else {
				//Wait certain ms to fetch from server
				loadTimer = setTimeout(async () => {
					await searchOnServer();
					loadTimer = null;
				}, LOADING_TIMEOUT);
			}
		} else {
			await miningOnServer();
		}
		loading = false;
	}

	function onPageChange(event: CustomEvent) {
		load(event.detail.pageSer, 'refresh', api.CACHE_FLAG.useIfExists);
		$srPage[BIZ] = event.detail.pageSer;
	}

	const calendar_changed = function () {
		if (
			Parser.hasValue($filterStorage[BIZ].calendar_begin) &&
			Parser.isEmpty($filterStorage[BIZ].calendar_end)
		) {
			$filterStorage[BIZ].calendar_end = $filterStorage[BIZ].calendar_begin;
		}
		/*
		if (
			Parser.hasValue($filterStorage[BIZ].calendar_begin) &&
			Parser.hasValue($filterStorage[BIZ].calendar_end)
		) {
			searchNow().then();
		}
			 */
	};

	async function searchNow(preDelete = false) {
		if (Utils.isBlank($filterStorage[BIZ].tplTag)) {
			$filterStorage[BIZ].tplTag = '';
		}
		if (Utils.isBlank($filterStorage[BIZ].doer)) {
			$filterStorage[BIZ].doer = user.eid;
		}
		if (Utils.isBlank($filterStorage[BIZ].status)) {
			$filterStorage[BIZ].status = 'ST_RUN';
		}
		if (Utils.isBlank($filterStorage[BIZ].pattern)) {
			$filterStorage[BIZ].pattern = '';
		}
		if (Utils.isBlank($filterStorage[BIZ].calendar_begin)) $filterStorage[BIZ].calendar_begin = '';
		if (Utils.isBlank($filterStorage[BIZ].calendar_end)) $filterStorage[BIZ].calendar_end = '';
		if (!$filterStorage.pageSize) $filterStorage.pageSize = 10;
		load(
			$srPage[BIZ],
			'refresh',
			preDelete ? api.CACHE_FLAG.preDelete : api.CACHE_FLAG.useIfExists,
		).then((_) => {});
	}

	export function resetQuery(preDelete = false) {
		$filterStorage[BIZ].tplTag = '';
		$filterStorage[BIZ].status = 'ST_RUN';
		//$filterStorage[BIZ].tplid = '';
		$filterStorage[BIZ].starter = '';
		$filterStorage[BIZ].doer = user.eid;
		$filterStorage[BIZ].pattern = '';
		$filterStorage[BIZ].tspan = 'any';
		$filterStorage[BIZ].calendar_begin = '';
		$filterStorage[BIZ].calendar_end = '';
		show_calendar_select = false;
		aSsPicked = '';
		$srPage[BIZ] = 0;
		if (preDelete) {
			api.removeCacheByPath('workflow/search');
		}
		searchNow(preDelete).then();
	}

	const toggleMining = async () => {
		$miningMode = !$miningMode;
	};

	const toggleAdvancedSearch = async () => {
		$showAdvancedSearch[BIZ] = !$showAdvancedSearch[BIZ];
		if ($showAdvancedSearch[BIZ] == false) {
			resetQuery();
		} else {
			if (!$mtcSession.tplIdsForSearch_for_wf || $mtcSession.tplIdsForSearch_for_wf.length === 0) {
				let tmp = await api.post(
					'template/tplid/list',
					{ tags: $filterStorage[BIZ].tplTag },
					user.sessionToken,
				);
				$mtcSession.tplIdsForSearch_for_wf = tmp.map((x: { tplid: string }) => x.tplid);
			}

			if (!$mtcSession.delegators) {
				let delegations = await api.post('/delegation/to/me/today', {}, user.sessionToken);
				$mtcSession.delegators = delegations.map((x: any) => x.delegator);
				if ($mtcSession.delegators.includes(user.eid) === false) {
					$mtcSession.delegators.push(user.eid);
				}
			}
		}
	};

	const showWorkflowDiscussion = (wfid: string) => {
		goto(`/workflow/${wfid}?showComment=true`);
	};

	async function onSort(event: CustomEvent) {
		$filterStorage[BIZ].sortby =
			(event.detail.dir === 'desc' ? '-' : '') +
			(event.detail.key === 'name' ? 'wftitle' : event.detail.key);
		await load($srPage[BIZ], 'refresh', api.CACHE_FLAG.useIfExists);
	}

	const opWorkflow = async function (workflow: Workflow, op: string): Promise<void> {
		if (op === 'startAnother') {
			goto(`/template/start?tplid=${workflow.tplid}`);
			return;
		} else if (op === 'works') {
			$filterStorage.todo.tplid = workflow.tplid;
			$filterStorage.todo.workTitlePattern = 'wf:' + workflow.wfid;
			goto('/work');
			return;
		} else if (op === 'works_running') {
			$filterStorage.todo.tplid = workflow.tplid;
			$filterStorage.todo.workTitlePattern = 'wf:' + workflow.wfid;
			$filterStorage.todo.workStatus = 'ST_RUN';
			goto('/work');
			return;
		} else if (op === 'works_all') {
			$filterStorage.todo.tplid = workflow.tplid;
			$filterStorage.todo.workTitlePattern = 'wf:' + workflow.wfid;
			$filterStorage.todo.workStatus = 'All';
			goto('/work');
			return;
		} else if (op === 'viewTemplate') {
			goto(`/template/${workflow.tplid}&read`);
			return;
		}

		if (op === 'setpboat') {
			setPboAtFor = workflow.wfid;
			return;
		}
		if (op === 'setting') {
			settingFor = workflow.wfid;
			return;
		}

		if (op === 'viewInstanceTemplate') {
			let payload = { wfid: workflow.wfid };
			let ret = await api.post('workflow/dump/instemplate', payload, user.sessionToken);
			goto(`template/${workflow.wfid}_instemplate&read`);
			return;
		}

		let payload = { wfid: workflow.wfid, op: op };
		let ret: Workflow = (await api.post('workflow/op', payload, user.sessionToken)) as Workflow;
		api.removeCacheByPath('workflow/search');
		api.removeCacheByPath('work/search');
		$worklistChangeFlag++;
		if (op === 'pause' || op === 'resume' || op === 'stop') {
			for (let i = 0; i < rows.length; i++) {
				if (rows[i].wfid === workflow.wfid) {
					rows[i].status = ret.status;
					rows[i] = rows[i];
				}
			}
			rows = rows;
		} else if (op === 'destroy') {
			let deletedIndex = -1;
			for (let i = 0; i < rows.length; i++) {
				if (rows[i].wfid === workflow.wfid) {
					deletedIndex = i;
					break;
				}
			}
			if (deletedIndex >= 0) {
				rows.splice(deletedIndex, 1);
				rows = rows;
				rowsCount = rowsCount - 1;
			}
		} else {
			await searchNow();
		}
		$filterStorage.todo.workTitlePattern = 'wf:' + ret.wfid;
	};

	async function __deleteWorkflowMultiple() {
		let wfids = rows.filter((x) => x.checked).map((x) => x.wfid);
		if (wfids.length < 1) return;
		$mtcConfirm = {
			title: $_('confirm.delete.workflow-multi.title', { values: { count: wfids.length } }),
			body: $_('confirm.delete.workflow-multi.body', { values: { count: wfids.length } }),
			buttons: [$_('confirm.delete.workflow-multi.yes')],
			callbacks: [
				async () => {
					mtcConfirmReset();
					let res = await api.post('workflow/destroy/multi', { wfids: wfids }, user.sessionToken);
					if (res.error) {
						setFadeMessage(res.message, 'warning');
					} else {
						api.removeCacheByPath('workflow/search');
						api.removeCacheByPath('work/search');
						$worklistChangeFlag++;
						let tmp: Workflow[] = [];
						for (let r = 0; r < rows.length; r++) {
							if (wfids.includes(rows[r].wfid) === false) tmp.push(rows[r]);
						}
						rowsCount = tmp.length;
						rows = tmp;
					}
				},
			],
		};
	}

	onMount(async () => {
		if ($filterStorage[BIZ].pattern && $filterStorage[BIZ].pattern.startsWith('wf:')) {
			$filterStorage[BIZ].pattern = '';
		}
		if ($showAdvancedSearch[BIZ] === undefined) {
			//console.log('First time loading...');
			LOADING_TIMEOUT = 0;
			$showAdvancedSearch[BIZ] = false;
			resetQuery();
		} else {
			LOADING_TIMEOUT = 400;
			//console.log('Not First time loading...');
			if ($showAdvancedSearch[BIZ] === false) {
				//console.log('showAdvancedSearch === false...');
				resetQuery();
			} else {
				//console.log('showAdvancedSearch === true...');
				if ($miningMode === false) await searchNow();
			}
		}
		if ($miningMode) $pageName = $_('title.mining');
		else $pageName = $_('title.workflow');
	});

	const toggleDiscuss = async (row: { wfid: string }) => {
		return await api.post(
			'comment/toggle',
			{ objtype: 'workflow', objid: row.wfid },
			user.sessionToken,
		);
	};

	let statusLabel = '';
	$: (() => {
		for (let i = 0; i < statusesof.length; i++) {
			if (statusesof[i].value === $filterStorage[BIZ].status) {
				statusLabel = statusesof[i].label;
				break;
			}
		}
	})();
</script>

<div class="container p-2">
	<div class="row">
		<div class="col col-sm-8">
			<div class="row">
				<div class="col">
					<PageTitle>
						{#if $miningMode}
							{$_('title.mining')}
						{:else}
							{$_('title.workflow')}
						{/if}
					</PageTitle>
				</div>
				<div class="col">
					<div class="dropdown">
						<a
							class="btn btn-outline-secondary dropdown-toggle"
							href={null}
							role="button"
							data-bs-toggle="dropdown"
							aria-expanded="false">
							{statusLabel}
						</a>
						<ul
							class="dropdown-menu"
							style="">
							{#each statuses as status}
								<li>
									<a
										class="dropdown-item"
										href={null}
										on:click|preventDefault={async (e) => {
											e.preventDefault();
											$filterStorage[BIZ].status = status.value;
											await searchNow();
										}}>
										{status.label}
									</a>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>
		</div>

		<div class="col col-sm-auto">
			<div class="row">
				<div class="col">&nbsp;</div>
				<div class="col-auto">
					<ToggleUI />
				</div>
				<div class="col-auto">
					<ButtonResetQuery
						on:click={() => {
							$currentTplid = '';
							resetQuery(true);
						}} />
				</div>
			</div>
		</div>
	</div>
	<ToggleUIForm />
	<!-- div class="mt-1 mx-0 w-100 statusLine">
		<a
			href={'#'}
			class="ms-3"
			on:click|preventDefault={toggleMining}>
			{#if $miningMode}
				<i class="bi bi-graph-up-arrow" />
				{$_('button.current_is_mining')}
			{:else}
				<i class="bi bi-search" />
				{$_('button.current_is_searching')}
			{/if}
		</a>
	</div -->
	{#if $UiSection['tag']}
		{#if $currentTplid}
			<CurrentTplId />
		{:else}
			<div class="row d-flex justify-content-center">
				<TagPicker
					{BIZ}
					{useThisTag}
					{clearTag} />
			</div>
		{/if}
	{/if}
	{#if $UiSection['search']}
		<Row cols={{ xs: 1, md: 2 }}>
			<Col>
				<InputGroup>
					<InputGroupText>{$_('extrafilter.template')}</InputGroupText>
					<select
						class="form-select"
						name="selectTpl"
						id="tplSelect"
						bind:value={$currentTplid}
						on:change|preventDefault={async (e) => {
							e.preventDefault();
							await searchNow();
						}}>
						<option value="">
							{$_('extrafilter.allTemplate')}
						</option>
						{#if $mtcSession.tplIdsForSearch_for_wf}
							{#each $mtcSession.tplIdsForSearch_for_wf as tpl (tpl)}
								<option value={tpl}>
									{tpl}
								</option>
							{/each}
						{/if}
					</select>
				</InputGroup>
			</Col>
			<Col>
				<InputGroup class="kfk-input-template-name d-flex">
					<InputGroupText>{$_('extrafilter.starter')}</InputGroupText>
					<Input
						class="flex-fill"
						name="other_doer"
						bind:value={$filterStorage[BIZ].starter}
						aria-label="User Eid"
						placeholder="" />
					<!--div
						class="btn btn-primary"
						on:click|preventDefault={(e) => {
							searchNow().then();
						}}
						color="primary">
						<i class="bi bi-arrow-return-left" />
					</div -->
					<div
						class="btn btn-secondary"
            role="none"
						on:keydown={() => {}}
						on:keyup={() => {}}
						on:keypress={() => {}}
						on:click|preventDefault={() => {
							$filterStorage[BIZ].starter = user.eid;
							//searchNow();
						}}
						color="secondary">
						{$_('extrafilter.me')}
					</div>
					<div
						class="btn btn-secondary  m-0 py-1 px-3"
            role="none"
						on:keydown={() => {}}
						on:keyup={() => {}}
						on:keypress={() => {}}
						on:click|preventDefault={async () => {
							$filterStorage[BIZ].starter = '';
							//await searchNow();
						}}
						color="light">
						{$_('remotetable.any')}
					</div>
				</InputGroup>
			</Col>
		</Row>

		<Row
			cols={{ xs: 1, md: 2 }}
			class="mt-1">
			<Col>
				<div class="search d-flex">
					<InputGroup>
						<InputGroupText>
							{$_('remotetable.filter')}
						</InputGroupText>
						<input
							class="flex-fill form-control"
							type="search"
							title={$_('remotetable.bywhat')}
							placeholder={$_('remotetable.bywhat')}
							bind:value={$filterStorage[BIZ].pattern} />
						<!--div
							class="btn btn-primary"
							on:click|preventDefault={(e) => {
								searchNow().then();
							}}>
							<i class="bi bi-arrow-return-left" />
						</div-->
					</InputGroup>
				</div>
			</Col>
			<Col>
				<InputGroup>
					<InputGroupText>
						{$_('remotetable.in')}
					</InputGroupText>
					<select
						class="form-control"
						id="timespanSelect"
						bind:value={$filterStorage[BIZ].tspan}
						on:change={async (e) => {
							e.preventDefault();
							//await load($srPage[BIZ], 'refresh', api.CACHE_FLAG.useIfExists);
						}}>
						{#each Object.keys(tspans) as key}
							<option value={key}>{tspans[key]}</option>
						{/each}
					</select>
					<div
						class="btn btn-primary"
            role="none"
						on:keydown={() => {}}
						on:keyup={() => {}}
						on:keypress={() => {}}
						on:click|preventDefault={async () => {
							if (show_calendar_select) {
								$filterStorage[BIZ].calendar_begin = '';
								$filterStorage[BIZ].calendar_end = '';
								show_calendar_select = false;
								//await searchNow();
							} else {
								show_calendar_select = true;
							}
						}}>
						{$_('remotetable.start_end')}
					</div>
				</InputGroup>
			</Col>
		</Row>
		{#if show_calendar_select}
			<Row
				cols={{ xs: 1, md: 2 }}
				class="mt-1">
				<Col>
					<InputGroup>
						<InputGroupText>Begin:</InputGroupText>
						<Input
							type="date"
							bind:value={$filterStorage[BIZ].calendar_begin}
							on:change={calendar_changed} />
					</InputGroup>
				</Col>
				<Col>
					<InputGroup>
						<InputGroupText>End:</InputGroupText>
						<Input
							type="date"
							bind:value={$filterStorage[BIZ].calendar_end}
							on:change={calendar_changed} />
						<div
							class="btn btn-primary"
              role="none"
							on:keydown={() => {}}
							on:keyup={() => {}}
							on:keypress={() => {}}
							on:click|preventDefault={calendar_changed}
							color="primary">
							<i class="bi bi-arrow-return-left" />
						</div>
					</InputGroup>
				</Col>
			</Row>
		{/if}
		<Row class="mt-1">
			<Col>
				<Searchlet
					objtype="wf"
					bind:aSsPicked
					on:searchlet={(msg) => {
						let ss = JSON.parse(msg.detail.ss);
						ss.pattern && ($filterStorage[BIZ].pattern = ss.pattern);
						ss.status && ($filterStorage[BIZ].status = ss.status);
						ss.tspan && ($filterStorage[BIZ].tspan = ss.tspan);
						ss.starter && ($filterStorage[BIZ].starter = ss.starter);
						if (ss.tplid) $currentTplid = ss.tplid;
						else $currentTplid = '';
						ss.calendar_begin && ($filterStorage[BIZ].calendar_begin = ss.calendar_begin);
						ss.calendar_end && ($filterStorage[BIZ].calendar_end = ss.calendar_end);

						if (
							$filterStorage[BIZ].calendar_begin !== '' ||
							$filterStorage[BIZ].calendar_end !== ''
						) {
							show_calendar_select = true;
						} else {
							show_calendar_select = false;
						}
						//searchNow().then();
					}}
					on:resetSearchlet={(_) => {
						aSsPicked = '';
						resetQuery(true);
					}} />
			</Col>
			<Col class="col-auto">
				<div
					class="btn btn-primary"
          role="none"
					on:keydown={() => {}}
					on:keyup={() => {}}
					on:keypress={() => {}}
					on:click|preventDefault={() => {
						searchNow().then();
					}}>
					{$_('remotetable.executeNow')}
				</div>
			</Col>
		</Row>
	{/if}

	{#if $miningMode === false}
		{#if rowsCount > 0}
			{#if $UiSection['sort']}
				{#key rowsCount}
					<div class="mt-3 justify-content-center d-flex">
						<Pagination
							pageSer={$srPage[BIZ]}
							pageSize={$filterStorage.pageSize}
							count={rowsCount}
							on:pageChange={onPageChange} />
					</div>
				{/key}
				<div class="row">
					<div class="col fw-bold">{$_('remotetable.sortBy')}:</div>
					<div class="col kfk-link">
						{$_('remotetable.title')}
						<Sort
							key="wftitle"
							on:sort={onSort}
							dir={$filterStorage[BIZ].sortby.indexOf('wftitle') < 0
								? 'asc'
								: $filterStorage[BIZ].sortby[0] === '-'
								? 'desc'
								: 'asc'} />
					</div>
					<div class="col kfk-link">
						{$_('remotetable.status')}
						<Sort
							key="status"
							on:sort={onSort}
							dir={$filterStorage[BIZ].sortby.indexOf('status') < 0
								? 'asc'
								: $filterStorage[BIZ].sortby[0] === '-'
								? 'desc'
								: 'asc'} />
					</div>
					<div class="col kfk-link">
						{$_('remotetable.starter')}
						<Sort
							key="starter"
							on:sort={onSort}
							dir={$filterStorage[BIZ].sortby.indexOf('starter') < 0
								? 'asc'
								: $filterStorage[BIZ].sortby[0] === '-'
								? 'desc'
								: 'asc'} />
					</div>
					<div class="col kfk-link">
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
					<div class="col">
						<PageSize
							on:pagesize={async (_) => {
								await load(0, 'refresh', api.CACHE_FLAG.useIfExists);
							}} />
					</div>
					<div class="col">
						<ColPerRowSelection />
					</div>
					{#if user.group === 'ADMIN'}
						<div class="col">
							<div
								class="btn m-0 p-1"
                role="none"
								on:keydown={() => {}}
								on:keyup={() => {}}
								on:keypress={() => {}}
								on:click|preventDefault={() => (multiple_selecting = !multiple_selecting)}>
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
					<div class="row">
						<div
							class="btn col"
              role="none"
							on:keydown={() => {}}
							on:keyup={() => {}}
							on:keypress={() => {}}
							on:click|preventDefault={(_) => {
								for (let r = 0; r < rows.length; r++) {
									rows[r].checked = true;
								}
							}}>
							{$_('remotetable.multi-select-all')}
						</div>
						<div
							class="btn col"
              role="none"
							on:keydown={() => {}}
							on:keyup={() => {}}
							on:keypress={() => {}}
							on:click|preventDefault={(_) => {
								for (let r = 0; r < rows.length; r++) {
									rows[r].checked = false;
								}
							}}>
							{$_('remotetable.multi-select-none')}
						</div>
						{#if rows.filter((x) => x.checked).length > 0}
							<div
								class="btn col"
                role="none"
								on:keydown={() => {}}
								on:keyup={() => {}}
								on:keypress={() => {}}
								on:click|preventDefault={(_) => {
									__deleteWorkflowMultiple();
								}}>
								{$_('remotetable.multi-select-delete')}
							</div>
						{/if}
					</div>
				{/if}
			{/if}
			<div class="container">
				<Row cols={$filterStorage.col_per_row}>
					{#each rows as row}
						<Col class="mb-2 card p-2">
							<Row>
								{#if multiple_selecting}
									<Col class="col-auto">
										<input
											type="checkbox"
											bind:checked={row.checked} />
									</Col>
								{/if}
								<Col>
									<div class="row">
										<div class="col">
											<h5 class="">
												<a
													class="preview-link kfk-workflow-id tnt-workflow-id kfk-link"
													href="/workflow/{row.wfid}">
													{row.wftitle}
													{#if row.rehearsal}
														<i class="bi-patch-check" />
													{/if}
												</a>
											</h5>
										</div>
										<div class="col-auto">
											<Dropdown class="m-0 p-0">
												<DropdownToggle
													caret
													color="primary"
													class="btn-sm">
													{$_('remotetable.actions')}
												</DropdownToggle>
												<DropdownMenu>
													{#if ClientPermControl(user.perms, user.eid, 'workflow', row, 'update')}
														<DropdownItem>
															<NavLink on:click={() => opWorkflow(row, 'setting')}>
																<Icon name="gear" />
																{$_('remotetable.wfa.setting')}
															</NavLink>
														</DropdownItem>
													{/if}
													<DropdownItem>
														<a
															class="nav-link"
															href={'#'}
															on:click|preventDefault={() => opWorkflow(row, 'works_all')}>
															<Icon name="list-check" />
															{$_('remotetable.wfa.allWorks')}
														</a>
													</DropdownItem>
													{#if ClientPermControl(user.perms, user.eid, 'workflow', row, 'update')}
														<DropdownItem>
															<NavLink on:click={() => opWorkflow(row, 'setting')}>
																<Icon name="caret-right-square" />
																{$_('remotetable.wfa.setting')}
															</NavLink>
														</DropdownItem>
														{#if row.status === 'ST_RUN'}
															<DropdownItem>
																<NavLink on:click={() => opWorkflow(row, 'pause')}>
																	<Icon name="pause-btn" />
																	{$_('remotetable.wfa.pause')}
																</NavLink>
															</DropdownItem>
														{/if}
														{#if row.status === 'ST_PAUSE'}
															<DropdownItem>
																<NavLink on:click={() => opWorkflow(row, 'resume')}>
																	<Icon name="arrow-counterclockwise" />
																	{$_('remotetable.wfa.resume')}
																</NavLink>
															</DropdownItem>
														{/if}
														{#if row.status === 'ST_PAUSE' || row.status === 'ST_RUN'}
															<DropdownItem>
																<NavLink on:click={() => opWorkflow(row, 'stop')}>
																	<Icon name="slash-square" />
																	{$_('remotetable.wfa.stop')}
																</NavLink>
															</DropdownItem>
														{/if}
														{#if ['ST_RUN', 'ST_PAUSE', 'ST_STOP'].indexOf(row.status) > -1}
															<DropdownItem>
																<NavLink on:click={() => opWorkflow(row, 'restart')}>
																	<Icon name="arrow-clockwise" />
																	{$_('remotetable.wfa.restart')}
																</NavLink>
															</DropdownItem>
														{/if}
														<!-- DropdownItem>
									<NavLink on:click={() => opWorkflow(row, 'setpboat')}>
										<Icon name="caret-right-square" />
										{$_('remotetable.wfa.setpboat')}
									</NavLink>
								</DropdownItem -->
													{/if}
													<DropdownItem>
														{#if ClientPermControl(user.perms, user.eid, 'workflow', '', 'create')}
															<NavLink on:click={() => opWorkflow(row, 'startAnother')}>
																<Icon name="caret-right-fill" />
																{$_('remotetable.wfa.startAnother')}
															</NavLink>
														{:else}
															<NavLink disabled>
																<Icon name="caret-right-fill" />
																Start Another
																{$_('remotetable.wfa.startAnother')}
															</NavLink>
														{/if}
													</DropdownItem>
													<DropdownItem>
														<NavLink on:click={() => opWorkflow(row, 'viewInstanceTemplate')}>
															<Icon name="code" />
															{$_('remotetable.wfa.viewInstanceTemplate')}
														</NavLink>
													</DropdownItem>
													{#if user.group === 'ADMIN' || (user.eid === row.starter && (row.rehearsal || row.pnodeid === 'start'))}
														<DropdownItem>
															<NavLink
																on:click={(e) => {
																	e.preventDefault();
																	$mtcConfirm = {
																		title: $_('confirm.title.areyousure'),
																		body: $_('confirm.body.deleteWorkflow'),
																		buttons: [$_('confirm.button.confirm')],
																		callbacks: [
																			async () => {
																				opWorkflow(row, 'destroy');
																				mtcConfirmReset();
																			},
																		],
																	};
																}}>
																<Icon name="trash" />
																{$_('remotetable.wfa.deleteThisWorkflow')}
															</NavLink>
														</DropdownItem>
														<DropdownItem>
															<NavLink
																on:click={(e) => {
																	e.preventDefault();
																	$mtcConfirm = {
																		title: $_('confirm.title.areyousure'),
																		body: $_('confirm.body.deleteWorkflow'),
																		buttons: [$_('confirm.button.confirm')],
																		callbacks: [
																			async () => {
																				opWorkflow(row, 'restartthendestroy');
																				mtcConfirmReset();
																			},
																		],
																	};
																}}>
																<Icon name="trash" />
																{$_('remotetable.wfa.restartthendeleteThisWorkflow')}
															</NavLink>
														</DropdownItem>
													{/if}
												</DropdownMenu>
											</Dropdown>
										</div>
										<!-- 下拉菜单 -->
									</div>
									<!-- 第一行,包括进程名称及下拉菜单 -->
									<Row>
										<Col class="fs-6 ps-4">
											<span>
												{$_('remotetable.status')}:
												{$_(`status.${row.status}`)}
											</span>
											<span class="ms-3">{$_('remotetable.starter')}: {row.starterCN}</span>
											<span class="ms-3">
												{$_('remotetable.updatedAt')}: {$date(new Date(row.updatedAt))}
												{$time(new Date(row.updatedAt))}
											</span>
										</Col>
									</Row>
									<Row>
										<Col class="fs-8 ps-4">
											<a
												class="kfk-workflow-id tnt-workflow-id kfk-link"
												href={'#'}
												on:click|preventDefault={() => opWorkflow(row, 'works_running')}>
												{$_('remotetable.wfa.runningWorks')}
											</a>
											<a
												href={'#'}
												class="ms-3 kfk-workflow-id tnt-workflow-id kfk-link"
												on:click={() => opWorkflow(row, 'viewTemplate')}>
												{$_('remotetable.wfa.viewTemplate')}
											</a>
											{#if row.commentCount > 0 && row.allowdiscuss}
												<a
													href={'#'}
													class="ms-3 kfk-workflow-id tnt-workflow-id kfk-link"
													on:click={() => showWorkflowDiscussion(row.wfid)}>
													<AniIcon
														icon="chat-dots-fill"
														ani="aniShake" />
													{row.commentCount > 0 ? row.commentCount : ''}
												</a>
											{/if}
										</Col>
									</Row>
									{#if settingFor === row.wfid}
										<Row class="ms-3">
											<Col>
												<div class="mt-3">{$_('remotetable.wfa.renameto')}</div>
												<InputGroup>
													<Input bind:value={row.wftitle} />
													<div
														class="btn btn-primary btn-sm"
														color="primary"
                            role="none"
														on:keydown={() => {}}
														on:keyup={() => {}}
														on:keypress={() => {}}
														on:click|preventDefault={async (e) => {
															e.preventDefault();
															await api.post(
																'workflow/set/title',
																{ wfid: row.wfid, wftitle: row.wftitle },
																user.sessionToken,
															);
															settingFor = '';
														}}>
														{$_('button.rename')}
													</div>
													<div
														class="btn btn-primary btn-sm ms-1"
														color="secondary"
                            role="none"
														on:keydown={() => {}}
														on:keyup={() => {}}
														on:keypress={() => {}}
														on:click|preventDefault={async (e) => {
															e.preventDefault();
															settingFor = '';
														}}>
														{$_('button.cancel')}
													</div>
												</InputGroup>
												<div class="form-check form-switch">
													<input
														class="form-check-input"
														type="checkbox"
														role="switch"
														id="flexSwitchCheckChecked"
														checked={row.allowdiscuss}
														aria-checked={row.allowdiscuss}
														on:change={async (_) => {
															row.allowdiscuss = await toggleDiscuss(row);
															row = row;
														}} />
													<label
														class="form-check-label"
														for="flexSwitchCheckChecked">
														{row.allowdiscuss ? '允许讨论' : '已关闭讨论'} （切换以切换状态）
													</label>
												</div>
											</Col>
										</Row>
									{/if}
								</Col>
							</Row>
						</Col>
					{/each}
				</Row>
			</div>

			{#key rowsCount}
				<div class="mt-3 justify-content-center d-flex">
					<Pagination
						pageSer={$srPage[BIZ]}
						pageSize={$filterStorage.pageSize}
						count={rowsCount}
						on:pageChange={onPageChange} />
				</div>
			{/key}
		{:else}
			<div class="mt-5">
				{$_('workflow.empty')}
			</div>
		{/if}
	{:else}
		<Miner bind:wfs={miningData} />
	{/if}
</div>
