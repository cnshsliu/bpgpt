<script lang="ts">
	import { _, date, time } from '$lib/i18n';
	import PageTitle from '$lib/PageTitle.svelte';
	import * as Utils from '$lib/utils';
	import * as api from '$lib/api';
	import ButtonToggleSearch from '$lib/input/ButtonToggleSearch.svelte';
	import ButtonResetQuery from '$lib/input/ButtonResetQuery.svelte';
	import TimeTool from '$lib/TimeTool';
	import BizPicker from '$lib/BizPicker.svelte';
	import { setFadeMessage } from '$lib/Notifier';
	import TodoAdvancedSearchForm from '$lib/TodoAdvancedSearchForm.svelte';
	import WorkPage from './workpage.svelte';
	import WorkHeader from './workheader.svelte';
	import MobileTodo from './_mobileTodo.svelte';
	import AniIcon from '$lib/AniIcon.svelte';
	import { page } from '$app/stores';
	import { filterStorage } from '$lib/mtcLocalStores';
	import ColPerRowSelection from '$lib/ColPerRowSelection.svelte';
	import {
		pageName,
		refreshFlag,
		showAdvancedSearch,
		srPage,
		lastQuery,
		worklistChangeFlag,
		mtcConfirm,
		mtcConfirmReset,
		forcePreDelete,
		delayLoadOnMount,
		workRefreshInterval,
		mtcSession,
		currentTplid,
		newerTodoNumber,
		clientViewedTodoIds,
		todoCache,
	} from '$lib/Stores';
	import { director_work_searchNow } from '$lib/MtcDirectors';
	import PageSize from '$lib/PageSize.svelte';
	import { onMount, onDestroy } from 'svelte';
	// import Parser from '$lib/parser';
	import type { Work } from '$lib/types';
	import Pagination from '$lib/pagination/Pagination.svelte';
	import Sort from '$lib/pagination/Sort.svelte';
	import { beforeNavigate, goto } from '$app/navigation';
	import { post } from '$lib/utils';
	import { title } from '$lib/title';

	$title = 'Yarknode';
	import {
		Row,
		Dropdown,
		DropdownToggle,
		DropdownMenu,
		DropdownItem,
		Offcanvas,
	} from 'sveltestrap';
	import { setContext } from 'svelte';
	import type { PageData } from './$types';

	const ENDPOINT = 'work/search';
	const BIZ = 'todo';

	export let data: PageData;
	let { user, url } = data;
	$: ({ user, url } = data);

	// let showform = '';
	let param_status = url.searchParams.get('status');
	// let param_action = url.searchParams.get('action');

	// switch (param_action) {
	// 	case 'new-flexible':
	// 		showform = 'flexible';
	// 		break;
	// }

	let currentWork: Work | null;
	let currentTop = 0;
	let loadTimer: any = null;
	let bypassCache = false;
	let LOADING_TIMEOUT = 400;
	let lastAppend = false;

	if (!$filterStorage[BIZ]) {
		$filterStorage[BIZ] = { tplTag: '', sortby: '-createdAt' };
	}
	if ($filterStorage[BIZ].hasOwnProperty('sortby') === false) {
		$filterStorage[BIZ].sortby = '-createdAt';
	}

	if ($page.data.user.tenant === undefined) {
		setTimeout(async () => {
			$mtcConfirm = {
				title: $_('confirm.title.needReload') + 'Tenant id',
				body: $_('confirm.body.needReload'),
				buttons: [$_('confirm.button.confirm')],
				callbacks: [
					async () => {
						window.location.reload();
						mtcConfirmReset();
					},
				],
			};
		}, 5000);
	}
	let rows: any[] = [];
	if (!$filterStorage[BIZ]) $filterStorage[BIZ] = {};

	let loadingFromServer = false;
	let clearLoadingFromServerTimer: any = null;
	let rowsCount = 0;
	let show_calendar_select = false;
	let aSsPicked = '';
	let statuses = [
		{ value: 'All', label: $_('status.All') },
		{ value: 'ST_RUN', label: $_('status.ST_RUN') },
		{ value: 'ST_PAUSE', label: $_('status.ST_PAUSE') },
		{ value: 'ST_DONE', label: $_('status.ST_DONE') },
		{ value: 'ST_FOOTPRINT', label: $_('status.ST_FOOTPRINT') },
	];
	let statusesof = [
		{ value: 'All', label: $_('statusof.All') },
		{ value: 'ST_RUN', label: $_('statusof.ST_RUN') },
		{ value: 'ST_PAUSE', label: $_('statusof.ST_PAUSE') },
		{ value: 'ST_DONE', label: $_('statusof.ST_DONE') },
		{ value: 'ST_STOP', label: $_('statusof.ST_STOP') },
		{ value: 'ST_FOOTPRINT', label: $_('statusof.ST_FOOTPRINT') },
	];

	if (!$mtcSession.tplIdsForSearch_for_todo) {
		$mtcSession.tplIdsForSearch_for_todo = [];
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
		setPage: (_page: number) => {
			$srPage[BIZ] = _page;
		},
		setRows: (_rows: any[]) => {
			filteredRows = _rows;
		},
	});

	// const clearTag = async function (preDelete = false) {
	// 	$filterStorage[BIZ].tplTag = '';
	// 	try {
	// 		let tmp = await api.post(
	// 			'template/tplid/list',
	// 			{},
	// 			user.sessionToken,
	// 			preDelete ? api.CACHE_FLAG.preDelete : api.CACHE_FLAG.useIfExists,
	// 		);
	// 		$mtcSession.tplIdsForSearch_for_todo = tmp.map((x: any) => x.tplid);
	// 		await searchNow({ preDelete: false, append: false, reason: 'clearTag' });
	// 	} catch (err) {
	// 		console.error(err);
	// 	}
	// };

	beforeNavigate(() => {
		if (clearLoadingFromServerTimer) {
			clearTimeout(clearLoadingFromServerTimer);
		}
		loadTimer && clearTimeout(loadTimer);
		// console.log('beforeNavitate from work to ', to);
	});

	// const useThisTag = async function (tag: string, appendMode = false) {
	// 	if (appendMode) {
	// 		let existingTags = $filterStorage[BIZ].tplTag;
	// 		if (Parser.isEmpty(existingTags)) {
	// 			existingTags = '';
	// 		}
	// 		let existingArr = existingTags.split(';');
	// 		if (existingArr.includes(tag)) {
	// 			existingArr = existingArr.filter((x: any) => x !== tag);
	// 		} else {
	// 			existingArr.push(tag);
	// 			existingArr = existingArr.filter((x: any) => x.length > 0);
	// 		}
	// 	} else {
	// 		if (tag.trim().length > 0) $filterStorage[BIZ].tplTag = tag.trim();
	// 		else $filterStorage[BIZ].tplTag = '';
	// 	}
	// 	$filterStorage[BIZ].tplid = '';
	// 	let tmp = await api.post(
	// 		'template/tplid/list',
	// 		{ tags: $filterStorage[BIZ].tplTag },
	// 		user.sessionToken,
	// 	);
	// 	$mtcSession.tplIdsForSearch_for_todo = tmp.map((x: any) => x.tplid);
	// 	await searchNow({ preDelete: false, append: false, reason: 'useThisTag' });
	// };

	async function load(
		_page: number,
		append = false,
		reason = 'refresh',
		cacheFlag = api.CACHE_FLAG.bypass,
	) {
		let sortByString = '-createdAt';
		lastAppend = append;
		switch ($filterStorage[BIZ].status) {
			case 'ST_RUN':
				sortByString = '-createdAt';
				break;
			case 'ST_DONE':
				sortByString = '-updatedAt';
				break;
			case 'ST_FOOTPRINT':
				sortByString = '-viewedAt';
				break;
			default:
				sortByString = '-updatedAt';
		}
		let payload = {
			pattern: $filterStorage[BIZ].pattern,
			skip: append ? $todoCache[$filterStorage[BIZ].status].length : 0,
			// limit: $filterStorage.pageSize,
			limit: 100,
			sortby: sortByString,
			status: $filterStorage[BIZ].status,
			tspan: $filterStorage[BIZ].tspan,
			doer: $filterStorage[BIZ].doer,
			reason: reason,
			tagsForFilter: undefined,
			tplid: '',
			calendar_begin: undefined,
			calendar_end: undefined,
			showpostponed: false,
		};
		if ($filterStorage[BIZ].tplTag) {
			payload['tagsForFilter'] = $filterStorage[BIZ].tplTag.split(';');
		}
		if ($currentTplid.trim()) payload['tplid'] = $currentTplid.trim();
		if ($filterStorage[BIZ].calendar_begin && $filterStorage[BIZ].calendar_end) {
			payload['calendar_begin'] = $filterStorage[BIZ].calendar_begin;
			payload['calendar_end'] = $filterStorage[BIZ].calendar_end;
		}

		let { skip: _skip, ...payloadWithoutSkip } = payload;
		//搜索条件发生了变化， 就要切换到第一页
		let queryKey = 'TODO_' + $filterStorage[BIZ].status;
		if (
			!$lastQuery[queryKey] ||
			false === Utils.objectEqual(payloadWithoutSkip, $lastQuery[queryKey])
		) {
			payload.skip = 0;
			$srPage[BIZ] = 0;
		}
		$lastQuery[queryKey] = payloadWithoutSkip;

		payload['showpostponed'] = $mtcSession.showpostponed;
		const loadPost = async () => {
			loadingFromServer = true;
			const ret = await api.post(
				ENDPOINT,
				payload,
				user.sessionToken,
				bypassCache ? api.CACHE_FLAG.bypass : cacheFlag,
			);
			if (bypassCache === true) {
				bypassCache = false;
			}
			if (clearLoadingFromServerTimer) {
				clearTimeout(clearLoadingFromServerTimer);
			}
			clearLoadingFromServerTimer = setTimeout(() => {
				loadingFromServer = false;
				clearLoadingFromServerTimer = null;
			}, 2000);
			if (ret.error) {
				if (ret.error === 'KICKOUT') {
					setFadeMessage($_('userSession.forcetohome'), 'warning');
					goto('/');
				} else {
					setFadeMessage(ret.message, 'warning');
				}
			} else {
				let todos = ret.objs;
				let tmp = 0;
				for (let i = 0; i < todos.length; i++) {
					if (todos[i].newer && $clientViewedTodoIds.indexOf(todos[i].todoid) < 0) tmp = tmp + 1;
					//设置postpone下拉列表的缺省选择项
					todos[i]['postponeday'] = 1;
					//计算已存在的postpone的显示值
					if (todos[i].postpone > 0) {
						todos[i].fromNow = TimeTool.fromNow(
							TimeTool.dayjs(todos[i].postPonedAt).add(todos[i].postpone, 'day'),
						);
					}
					/* if ($mtcSession.pickedTodoId === todos[i].todoid) {
						todos[i].theWork = await prepareWork(todos[i].todoid);
					} else {
						todos[i]['theWork'] = null;
					} */
					todos[i]['theWork'] = null;
				}
				if (append) {
					rows.push(...todos);
					rows = rows;
				} else {
					rows = todos;
				}
				rowsCount = rows.length;
				$newerTodoNumber = tmp;
				if ($todoCache[$filterStorage[BIZ].status]) {
					$todoCache[$filterStorage[BIZ].status] = rows;
				}
			}
		};
		loadTimer && clearTimeout(loadTimer);
		if (
			bypassCache === false &&
			cacheFlag === api.CACHE_FLAG.useIfExists &&
			api.hasCache(ENDPOINT, payload, user.sessionToken)
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
	}

	function onPageChange(event: CustomEvent) {
		load(event.detail.pageSer, false, 'refresh', api.CACHE_FLAG.useIfExists);
		$srPage[BIZ] = event.detail.pageSer;
	}

	// const calendar_changed = function () {
	// 	if (
	// 		Parser.hasValue($filterStorage[BIZ].calendar_begin) &&
	// 		Parser.isEmpty($filterStorage[BIZ].calendar_end)
	// 	) {
	// 		$filterStorage[BIZ].calendar_end = $filterStorage[BIZ].calendar_begin;
	// 	}
	// 	if (
	// 		Parser.hasValue($filterStorage[BIZ].calendar_begin) &&
	// 		Parser.hasValue($filterStorage[BIZ].calendar_end)
	// 	) {
	// 		searchNow({ preDelete: false, append: false, reason: 'calendar_changed' }).then();
	// 	}
	// };

	async function searchNow(param = { preDelete: false, append: false, reason: '' }) {
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
		load(
			$srPage[BIZ],
			param.append,
			'refresh',
			param.preDelete ? api.CACHE_FLAG.preDelete : api.CACHE_FLAG.useIfExists,
		).then(() => {});
	}

	// 重置所有搜索条件
	function resetQuery(preDelete = false) {
		$filterStorage[BIZ].tplTag = '';
		$filterStorage[BIZ].status = 'ST_RUN';
		$filterStorage[BIZ].tplid = '';
		$filterStorage[BIZ].doer = user.eid;
		$filterStorage[BIZ].pattern = '';
		$filterStorage[BIZ].tspan = 'any';
		$filterStorage[BIZ].calendar_begin = '';
		$filterStorage[BIZ].calendar_end = '';

		if (param_status) {
			if (['ST_DONE', 'ST_RUN'].indexOf(param_status) >= 0) {
				$filterStorage[BIZ].status = param_status;
			} else {
				$filterStorage[BIZ].status = 'ST_RUN'; //default
			}
		}

		show_calendar_select = false;
		aSsPicked = '';
		$srPage[BIZ] = 0;
		if (preDelete) {
			api.removeCacheByPath('work/search');
		}
		searchNow({
			preDelete: preDelete,
			append: false,
			reason: 'calendar_changed',
		}).then();
		if (preDelete) {
			immediateReload();
		}
	}

	const toggleAdvancedSearch = async () => {
		showMoreMenu = false;
		$showAdvancedSearch[BIZ] = !$showAdvancedSearch[BIZ];
		if (($showAdvancedSearch[BIZ] as unknown as boolean) == false) {
			resetQuery();
		} else {
			if (
				!$mtcSession.tplIdsForSearch_for_todo ||
				$mtcSession.tplIdsForSearch_for_todo.length === 0
			) {
				let tmp = await api.post(
					'template/tplid/list',
					{ tags: $filterStorage[BIZ].tplTag },
					user.sessionToken,
				);
				$mtcSession.tplIdsForSearch_for_todo = tmp.map((x: any) => x.tplid);
			}

			if (!$mtcSession.delegators) {
				let delegations = await api.post(
					'/delegation/to/me/today',
					{},
					$page.data.user.sessionToken,
				);
				$mtcSession.delegators = delegations.map((x: any) => x.delegator);
				if ($mtcSession.delegators.includes($page.data.user.eid) === false) {
					$mtcSession.delegators.push($page.data.user.eid);
				}
			}
		}
	};

	async function onSort(event: CustomEvent) {
		$filterStorage[BIZ].sortby =
			(event.detail.dir === 'desc' ? '-' : '') +
			(event.detail.key === 'name' ? 'title' : event.detail.key);
		await load($srPage[BIZ], false, 'refresh', api.CACHE_FLAG.useIfExists);
	}

	function gotoWorkitem(work: Work, anchor = '') {
		goto(`/work/${work.todoid}${anchor}`, {
			replaceState: false,
		});
	}

	function gotoWorkflow(wfid: string) {
		goto(`/workflow/${wfid}`, { replaceState: false });
	}
	let lastImmediate = new Date().getTime();

	const immediateReload = () => {
		let now = new Date().getTime();
		if (now - lastImmediate < 1000) return;
		else lastImmediate = now;
		bypassCache = true;
		searchNow({ preDelete: false, append: false, reason: 'immediateReload' });
		if ($worklistChangeFlag) {
			$worklistChangeFlag = 0;
		}
	};

	//在流程变化，通过goto回到本页时，设置 delayLoadOnMount，等待服务端完成工作，可获得最新的列表
	//delayLoadOnMount缺省为0，
	//$: $worklistChangeFlag && $delayLoadOnMount === 0 && immediateReload();

	const relogin = async () => {
		await post(`/auth/logout`);
		goto('/login', { replaceState: true, invalidateAll: true });
		setFadeMessage($_('userSession.relogin'), 'warning');
	};

	const postpone = async (todoid: string, days: number) => {
		$mtcConfirm = {
			title: $_('confirm.title.postpone'),
			body:
				days > 0
					? $_('confirm.body.postpone', { values: { days: days } })
					: $_('confirm.body.cancelpostpone'),
			buttons: [$_('confirm.button.confirm')],
			callbacks: [
				async () => {
					api.post('/work/postpone', { todoid, days }, user.sessionToken);
					resetQuery(true);
				},
			],
		};
	};

	onMount(async () => {
		$pageName = $_('navmenu.worklist');
		//根据产品的更新情况，这里是新的代码要求有tenant._id
		const tenantid = $page.data.user.tenant._id;
		if (!tenantid) {
			await relogin();
		}
		if ($workRefreshInterval) {
			clearInterval($workRefreshInterval as number);
		}

		setTimeout(
			async () => {
				if ($showAdvancedSearch[BIZ] === undefined) {
					LOADING_TIMEOUT = 0;
					$showAdvancedSearch[BIZ] = false;
					resetQuery($forcePreDelete);
					$forcePreDelete = false;
				} else {
					LOADING_TIMEOUT = 400;
					if ($showAdvancedSearch[BIZ] === false) {
						resetQuery($forcePreDelete);
						$forcePreDelete = false;
					} else {
						await searchNow({
							preDelete: $forcePreDelete,
							append: false,
							reason: 'loading_timer',
						});
						$forcePreDelete = false;
					}
				}
				if ($delayLoadOnMount !== 0) $delayLoadOnMount = 0;
			},
			$delayLoadOnMount ? $delayLoadOnMount : 0,
		);
	});

	onDestroy(async () => {
		bypassCache = false;
		clearInterval($workRefreshInterval as number);
	});


	const prepareWork = async (todoid: string) => {
		let theWork = await api.post('work/info', { todoid: todoid }, $page.data.user.sessionToken);
		//let delegators = [];
		if (theWork && theWork.wf) {
			theWork.wf.history.map((x: any) => {
				x.isCurrent = x.workid === theWork.workid;
				x.classname = 'col mt-3 kfk-highlight-track' + (x.isCurrent ? '-current' : '');
				return x;
			});
			theWork.routingOptions.sort();
			try {
				//let delegations = await api.post('/delegation/to/me/today', {}, user.sessionToken);
				/* delegators = (delegations as unknown as any[]).map((x) => x.delegator);
				if (delegators.includes($page.data.user.eid) === false) {
					delegators.push($page.data.user.eid);
				} */
			} catch (e) {
				console.error(e);
			}
			if ($mtcSession.comment_wfid === theWork.wfid) {
				theWork.comments = $mtcSession.comments;
			} else {
				let cmtRes = await api.post(
					'comment/workflow/load',
					{ wfid: theWork.wfid },
					user.sessionToken,
				);
				if (cmtRes.error) {
					$mtcSession.comment_wfid = '';
					$mtcSession.comments = [];
				} else {
					theWork.comments = cmtRes as any;
					//$mtcSession.comment_wfid = theWork.wfid;
					//$mtcSession.comments = theWork.comments;
				}
			}
		} else {
			theWork = null;
		}
		return theWork;
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
	$: $director_work_searchNow &&
		(async () => {
			if ($workRefreshInterval) {
				clearInterval($workRefreshInterval as number);
			}

			await searchNow({
				preDelete: false,
				append: false,
				reason: 'director changed',
			});
			$director_work_searchNow = false;
		})();
	let ui2 = true;
	let filterStatus = 'ST_RUN';
	let showMoreMenu = false;
	let useFilter_tplid = false;
	function toggleMore() {
		showMoreMenu = !showMoreMenu;
	}
	function showRunning() {
		filterStatus = 'ST_RUN';
		useFilter_tplid = false;
		$showAdvancedSearch[BIZ] = false;
		showTodos();
	}
	function showDone() {
		filterStatus = 'ST_DONE';
		useFilter_tplid = false;
		$showAdvancedSearch[BIZ] = false;
		showTodos();
	}
	function showFootprint() {
		filterStatus = 'ST_FOOTPRINT';
		useFilter_tplid = false;
		$showAdvancedSearch[BIZ] = false;
		showTodos();
	}
	function showPaused() {
		filterStatus = 'ST_PAUSE';
		useFilter_tplid = false;
		$showAdvancedSearch[BIZ] = false;
		showTodos();
	}
	function showStopped() {
		filterStatus = 'ST_STOP';
		useFilter_tplid = false;
		$showAdvancedSearch[BIZ] = false;
		showTodos();
	}
	function showAll() {
		filterStatus = 'ST_ALL';
		useFilter_tplid = false;
		showTodos();
	}
	function showTodos() {
		showMoreMenu = false;
		$filterStorage[BIZ].status = filterStatus;
		if (filterStatus === 'ST_RUN') searchNow({ preDelete: true, append: false, reason: '' });
		else if (!$todoCache[filterStatus]) {
			//如果不使用todoCache
			searchNow({ preDelete: true, append: false, reason: '' });
		} else {
			//如果使用todoCache，但当前没有数据，就加载
			if ($todoCache[filterStatus].length === 0) {
				searchNow({ preDelete: true, append: false, reason: '' });
			} else {
				//如果使用todoCache，但当前有数据，就使用todoCache里的数据
				rows = $todoCache[filterStatus];
				rowsCount = rows.length;
			}
		}
	}

	function loadMore() {
		if ($todoCache[$filterStorage[BIZ].status]) {
			searchNow({ preDelete: true, append: true, reason: 'load more' });
		}
	}

	$: $refreshFlag &&
		(async () => {
			searchNow({ preDelete: true, append: false, reason: '' });
		})();
	let open = false;
	const toggleBizPicker = () => (open = !open);
	const pickNone = () => {
		$currentTplid = '';
		toggleBizPicker();
		searchNow({ preDelete: false, append: lastAppend, reason: 'bizpicker' });
	};
</script>

<div class="container mt-2">
	{#if ui2}
		<div class="row">
			<ul class="nav justify-content-center">
				<li class="nav-item kfk-link">
					<a
						class="nav-link"
						aria-current="page"
						on:click={showRunning}
						href={'#'}>
						{$_('status.ST_RUN')}
					</a>
				</li>
				<li class="nav-item kfk-link">
					<a
						class="nav-link"
						on:click={showDone}
						href={'#'}>
						{$_('status.ST_DONE')}
					</a>
				</li>
				<li class="nav-item kfk-link">
					<a
						class="nav-link"
						on:click={showFootprint}
						href={'#'}>
						{$_('status.ST_FOOTPRINT')}
					</a>
				</li>
				<li class="nav-item kfk-link">
					<a
						class="nav-link"
						on:click={toggleAdvancedSearch}
						href={'#'}>
						<i class="bi bi-search" />
					</a>
				</li>
				<li class="nav-item kfk-link">
					<a
						class="nav-link"
						href={'#'}
						on:keydown={null}
						on:click={toggleMore}>
						{$_('button.' + (showMoreMenu ? 'less' : 'more'))}
					</a>
				</li>
				{#if showMoreMenu}
					<li class="nav-item kfk-link">
						<a
							class="nav-link"
							on:click={showPaused}
							href={'#'}>
							{$_('status.ST_PAUSE')}
						</a>
					</li>
					<li class="nav-item kfk-link">
						<a
							class="nav-link"
							on:click={showStopped}
							href={'#'}>
							{$_('status.ST_STOP')}
						</a>
					</li>
					<li class="nav-item kfk-link">
						<a
							class="nav-link"
							on:click={showAll}
							href={'#'}>
							{$_('status.All')}
						</a>
					</li>
				{/if}
			</ul>
		</div>
		<div class="col mb-2">
			<a
				class="kfk-link"
				on:click={(_) => {
					toggleBizPicker();
				}}
				href={'#'}
				color="primary">
				{$_('bizpicker.button')}
				{$currentTplid ? $currentTplid : $_('bizpicker.none')}
			</a>
			{#if $currentTplid}
				<a
					class="kfk-link"
					on:click={(_) => {
						$currentTplid = '';
						searchNow({ preDelete: false, append: lastAppend, reason: 'bizpicker' });
					}}
					href={'#'}>
					<i class="bi bi-x fs-3" />
				</a>
			{/if}
		</div>
		<Offcanvas
			header={$_('bizpicker.pickone')}
			scroll
			isOpen={open}
			toggle={toggleBizPicker}
			backdrop={false}>
			{$_('bizpicker.desc')}
			<a
				class="kfk-link"
				href={'#'}
				on:click={pickNone}>
				{$_('bizpicker.picknone')}
			</a>
			<BizPicker
				on:biz={(e) => {
					$currentTplid = e.detail;
					toggleBizPicker();
					searchNow({ preDelete: false, append: lastAppend, reason: 'bizpicker' });
				}} />
		</Offcanvas>

		{#if $showAdvancedSearch[BIZ]}
			<TodoAdvancedSearchForm
				on:resetQuery={async (e) => {
					e.preventDefault();
					resetQuery(e.detail);
				}}
				on:searchNow={async (e) => {
					e.preventDefault();
					await searchNow(e.detail);
				}} />
		{/if}

		{#each rows as todo}
			<div class="row m-0 card mb-2 p-2 ">
				<MobileTodo
					{todo}
					{filterStatus} />
			</div>
		{/each}
		{#if $filterStorage[BIZ].status === 'ST_RUN' && rowsCount === 0}
			<div class="row mt-5 text-center">
				<div class="col-12"><i class="bi bi-file-earmark-minus fs-1" /></div>
				<div class="col-12">{$_('todo.congrat')}</div>
			</div>
		{/if}
		{#if $todoCache[$filterStorage[BIZ].status] && rows.length > 0}
			<div
				class="row justify-content-center"
        role="none"
				on:keydown={null}
				on:click={loadMore}>
				<div class="col text-center">
					<div class="btn bg-transparent">{$_('button.loadmore')}</div>
				</div>
			</div>
		{/if}
	{:else}
		<div class={currentWork ? 'nodisplay' : ''}>
			<!-- START 头部第一行 信息 及 按钮 -->
			<div class="row">
				<div class="col col-sm-8">
					<div class="row">
						<div class="col">
							<PageTitle>
								{$_('title.worklist')}
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
													await searchNow({
														preDelete: false,
														append: false,
														reason: 'status',
													});
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
						<div class="col-auto">
							<ButtonToggleSearch
								on:click={toggleAdvancedSearch}
								{BIZ} />
						</div>
						<div class="col-auto">
							<ButtonResetQuery
								on:click={() => {
									$currentTplid = '';
									aSsPicked = '';
									resetQuery(true);
								}} />
						</div>
					</div>
				</div>
			</div>
			<!-- END 头部第一行 信息 及 按钮 -->

			<!--START 标签选择行-->
			<!--END 标签选择行-->
			<!-- START 高级搜索表单 -->
			{#if $showAdvancedSearch[BIZ]}
				<TodoAdvancedSearchForm
					on:resetQuery={async (e) => {
						e.preventDefault();
						resetQuery(e.detail);
					}}
					on:searchNow={async (e) => {
						e.preventDefault();
						await searchNow(e.detail);
					}} />
			{/if}
			<!-- END 高级搜索表单 -->

			{#if rowsCount > 0}
				<!-- START 表格排序设置, 以及每页显示行数,每行显示个数的设置 -->
				<!-- {JSON.stringify($filterStorage[BIZ].sortby)} -->
				<div class="container p-0">
					<div class="row">
						{#key rowsCount}
							<div class="">
								<Pagination
									pageSer={$srPage[BIZ]}
									pageSize={$filterStorage.pageSize}
									count={rowsCount}
									on:pageChange={onPageChange} />
							</div>
						{/key}
					</div>
					<div class="row">
						<div class="col col-12 col-md-6">
							<div class="row">
								<div class="col">{$_('remotetable.sortBy')}:</div>
								<div class="col">
									{$_('remotetable.title')}
									<Sort
										key="title"
										on:sort={onSort}
										dir={$filterStorage[BIZ].sortby.indexOf('title') < 0
											? 'asc'
											: $filterStorage[BIZ].sortby[0] === '-'
											? 'desc'
											: 'asc'} />
								</div>
								<div class="col">
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
								<div class="col">
									{$_('remotetable.createdAt')}
									<Sort
										key="createdAt"
										on:sort={onSort}
										dir={$filterStorage[BIZ].sortby.indexOf('createdAt') < 0
											? 'asc'
											: $filterStorage[BIZ].sortby[0] === '-'
											? 'desc'
											: 'asc'} />
								</div>
								<div class="col">
									{$_('remotetable.lasting')}
									<Sort
										key="lastdays"
										on:sort={onSort}
										dir={$filterStorage[BIZ].sortby.indexOf('lastdays') < 0
											? 'asc'
											: $filterStorage[BIZ].sortby[0] === '-'
											? 'desc'
											: 'asc'} />
								</div>
							</div>
						</div>
						<div class="col col-6 col-md-3">
							<PageSize
								on:pagesize={async (e) => {
									e.preventDefault();
									await load(0, false, 'refresh', api.CACHE_FLAG.useIfExists);
								}} />
						</div>
						<div class="col col-6 col-md-3">
							<ColPerRowSelection />
						</div>
					</div>
				</div>
				<!-- END 表格排序设置, 以及每页显示行数,每行显示个数的设置 -->
				<div>
					<Row cols={$filterStorage.col_per_row}>
						{#each rows as row}
							<div
								class="col mb-2 card p-2 card_{row.status} {$mtcSession.pickedTodoId === row.todoid
									? 'currentTodo'
									: ''}">
								<div class="row">
									<div class="col">
										AAAASTATUS
										<h5 class="ID_{row.status}">
											<a
												class="preview-link kfk-work-id tnt-work-id"
												href={'#'}
												on:click|preventDefault={async (e) => {
													e.preventDefault();
													$mtcSession.pickedTodoId = row.todoid;
													currentTop = document.scrollingElement
														? document.scrollingElement.scrollTop
														: 0;
													currentWork = await prepareWork(row.todoid);
													if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
													gotoWorkitem(row);
												}}>
												{row.title}
												<sup>
													{#if row.nodeid === 'ADHOC'}
														/ adhoc
													{/if}
													{#if row.rehearsal}
														/ <i class="bi-patch-check-fill" />
														{row.doer}
													{/if}
												</sup>
											</a>
										</h5>
									</div>
									<div class="col-auto text-nowrap ">
										{$_('remotetable.lasting')}:
										{row.lastdays}
									</div>
									<div class="col-auto text-nowrap ">
										{#if row.status === 'ST_RUN'}
											<Dropdown class="nav-link dropdown ">
												<DropdownToggle
													caret
													id="menu001"
													data-toggle="dropdown"
													class="m-0 py-0 bg-transparent border-0">
													{$_('remotetable.postpone.text')}
												</DropdownToggle>
												<DropdownMenu>
													{#each [1, 2, 3, 4, 5, 6, 7] as day}
														<DropdownItem class="d-flex justify-content-end">
															<a
																href={'#'}
																class="kfk-link ppday"
																data-toggle="dropdown"
																on:click={async (e) => {
																	e.preventDefault();
																	await postpone(row.todoid, day);
																}}>
																<AniIcon
																	icon="plus-circle"
																	ani="aniShake" />
																{$_('remotetable.postpone.text')}
																{$_('remotetable.postpone.' + (day === 1 ? 'single' : 'plural'), {
																	values: { days: day },
																})}
															</a>
														</DropdownItem>
													{/each}
												</DropdownMenu>
											</Dropdown>
										{:else}&nbsp;{/if}
									</div>
								</div>
								{#if row.postpone > 0}
									<div class="row">
										<div class="col">&nbsp;</div>
										<div class="col-auto">
											{$_('remotetable.postpone.in')}{row.fromNow}
											<div
												class="btn btn-sm m-0 p-0"
                        role="none"
												on:keydown={() => {}}
												on:keyup={() => {}}
												on:keypress={() => {}}
												on:click|preventDefault={() => {
													postpone(row.todoid, 0);
												}}>
												{$_('button.cancel')}
											</div>
										</div>
									</div>
								{/if}
								<div class="row">
									<div class="col-auto">
										<span class="kfk-label">{$_('remotetable.status')}:</span>
										<span class="fw-bold fc_{row.status}">{$_('status.' + row.status)}</span>
									</div>
									<div class="col">
										<span class="kfk-label">{$_('remotetable.updatedAt')}:</span>
										{#if row.doneat}
											{$date(new Date(row.doneat))}
											{$time(new Date(row.doneat))}
										{:else}
											{$date(new Date(row.createdAt))}
											{$time(new Date(row.createdAt))}
										{/if}
									</div>
								</div>
								<div class="row fs-6">
									<div class="col kfk-tag">
										{$_('remotetable.belongTo')}:
										<a
											class="kfk-link fs-6"
											href={'#'}
											on:click={(e) => {
												e.preventDefault();
												gotoWorkflow(row.wfid);
											}}>
											{row.wftitle}
										</a>
										{#if row.allowdiscuss}
											<a
												href={'#'}
												class="ms-3 fs-6 kfk-workflow-id tnt-workflow-id kfk-link"
												on:click={() => gotoWorkitem(row, '#discussion_area')}>
												<AniIcon
													icon="chat-dots-fill"
													ani="aniShake" />
												{row.commentCount > 0 ? row.commentCount : ''}
											</a>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</Row>
				</div>

				<Row>
					<div class="col">&nbsp;</div>
					<div class="col-auto">
						<input
							type="checkbox"
							bind:checked={$mtcSession.showpostponed}
							on:change={() => {
								resetQuery(true);
							}} />
						显示延后工作项
					</div>
				</Row>

				{#key rowsCount}
					<div class="mt-3 ">
						<Pagination
							pageSer={$srPage[BIZ]}
							pageSize={$filterStorage.pageSize}
							count={rowsCount}
							on:pageChange={onPageChange} />
					</div>
				{/key}
			{:else}
				<div class="mt-5">
					{$_('work.empty')}
				</div>
			{/if}
		</div>

		<!-- START: 如果有curentWork,则像进入这个work的单独route一样,显示这个work的信息-->
		{#if currentWork}
			<div class="lmn">
				<div class="row">
					<a
						href={'#'}
						class="ms-3 fs-6 kfk-link"
						on:click={() => {
							currentWork = null;
							if (document.scrollingElement) document.scrollingElement.scrollTop = currentTop;
						}}>
						<AniIcon
							icon="arrow-left"
							ani="aniShake" />
					</a>
				</div>
				<WorkHeader work={currentWork} />
				<WorkPage
					work={currentWork}
					on:statusChanged={(e) => {
						e.preventDefault();
						currentWork = null;
						/* row.theWork.status = e.detail.status;
							row.theWork.doneat = e.detail.doneat;
							row = row; */
					}} />
			</div>
		{/if}
		<!-- END: 如果有curentWork,则像进入这个work的单独route一样,显示这个work的信息-->
	{/if}
</div>

<style>
	.statusLine a {
		font-size: 12px;
		text-decoration: none;
	}
	.statusLine a:hover {
		text-decoration: underline;
	}
	.ppday {
		text-decoration: none;
	}
	.ID_ST_DONE a {
		color: var(--bs-success);
	}
	.ID_ST_PAUSE a {
		color: var(--bs-warn);
	}

	.card_ST_DONE {
		background-color: rgba(0, 0, 0, 0.175);
	}

	.fc_ST_DONE {
		color: var(--bs-success);
	}
	.fc_ST_RUN {
		color: var(--bs-link-color);
	}
	.fc_ST_PAUSE {
		color: var(--bs-warn);
	}
	.dropdown a {
		text-decoration: none;
	}
</style>
