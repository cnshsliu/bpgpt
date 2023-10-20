<script lang="ts">
	import { isLocaleLoaded, _, locale } from '$lib/i18n';
	import TimeTool from '$lib/TimeTool';
	import { tick } from 'svelte';
	import { onMount, onDestroy } from 'svelte';
	import EmpFooter from '$lib/EmpFooter.svelte';
	import Yana from '$lib/yana/Yana.svelte';
	import * as empApi from '$lib/api';
	import { toast } from '$lib/Toast';
	import { deviceIsMobile } from '$lib/Stores';
	import type { LayoutData } from './$types';
	import { pageName, printing, showQrCode, reloadById, refreshFlag } from '$lib/Stores';
	import Menu from '$lib/menu/Menu.svelte';
	import { API_SERVER } from '$lib/Env';
	import { menuInSession, menuDataForSet, menuRefreshFlag } from '$lib/menu/MenuData';
	import type { menuDataType } from '$lib/menu/MenuData';
	import { MTC_SERVER } from '$lib/Env';
	import { goto } from '$app/navigation';
	import { director_work_searchNow } from '$lib/MtcDirectors';
	import Me from '$lib/header/Me.svelte';
	import QRCode from 'qrcode';
	import { page } from '$app/stores';
	import { filterStorage } from '$lib/mtcLocalStores';
	import {
		mainAreaClass,
		standaloneTopMenuClass,
		miningMode,
		currentBiz,
		expandFooter,
		clientViewedTodoIds,
		newerTodoNumber,
	} from '$lib/Stores';
	let theMenu: any;
	let menuStyle = 'browser';
	let menuPinned = true;
	let menuSize = 'float-small';
	let menuDef: menuDataType[] = [];
	let showTodosDiv = false;
	let todos = [];

	export let data: LayoutData;

	let {url,  user } = data;
	$: ({url,  user } = data);

	let theYana: any;
	let showYana = false;

	let ntn = 0;
	$: ntn = $newerTodoNumber;
	let checkNewerInterval: ReturnType<typeof setInterval> | null = null;

	//menuInSession, inSession means user logged in.
	$: $menuInSession = $page.data.user ? true : false;
	// If you logged in, tickMenu to refresh user status
	$: $menuInSession + theMenu?.tickMenu();
	// If user logged in, load menu data by calling combineMenus()
	// Re-load menus on user change.

	// Re-load menus on locale change.
	$: $locale &&
		(async () => {
			// console.log($locale);
			await combineMenus();

			getMainAreaClass();
		})();

	// Set main area class to control it's display position
	// on menu style changed. so, the main area does not collapse
	// with the menu.
	const onMenuSizeChanged = async (event: CustomEvent) => {
		const payload = event.detail;
		if (payload === undefined) return;
		changeMenu(payload);
	};

	const changeMenu = function (payload: any) {
		menuSize = payload.to;
		console.log(menuStyle, menuPinned, menuSize);
		getMainAreaClass();
	};

	const closeTodos = () => {
		showTodosDiv = false;
	};

	//TODO: check work/search automatically, and put Icon on new
	//Viewed todo remove red mark, add a indicator field to TODO entry.

	const getMainAreaClass = () => {
		switch (menuStyle) {
			case 'pc':
				$mainAreaClass = 'main-area-pc';
				$standaloneTopMenuClass = 'satm-pc';
				break;
			case 'windows':
				$mainAreaClass = 'main-area-windows';
				$standaloneTopMenuClass = 'satm-windows';
				break;
			case 'mobile':
				$mainAreaClass = 'main-area-mobile';
				$standaloneTopMenuClass = 'satm-mobile';
				break;
			case 'browser':
				switch (menuSize) {
					case 'float-logo':
						$mainAreaClass = '';
						$standaloneTopMenuClass = 'satm-float-logo';
						break;
					case 'float-small':
						$mainAreaClass = menuPinned ? 'main-area-width-big' : 'main-area-width-small';
						$standaloneTopMenuClass = menuPinned ? 'satm-width-big' : 'satm-width-small';
						break;
					case 'float-big':
						$mainAreaClass = 'main-area-width-big';
						$standaloneTopMenuClass = 'satm-width-big';
						break;
				}
				break;
		}
	};

	// callback function for menu change style
	// simply set menuStyle to the specific value.
	const onMenuChangeStyle = async (event: CustomEvent) => {
		const detail = event.detail;
		if (detail === undefined) return;
		menuStyle = detail.style;
		getMainAreaClass();
	};

	const onAddPersonal = async (event: CustomEvent) => {
		const detail = event.detail;
		if (detail === undefined) return;
		addLinkToPersonalMenu(event);
	};

	// get recent business item from localStorage
	// and add as children menuitems of "___recentbiz" menuiem
	const putStoredRecentToMenu = function (tplid: string = '') {
		let recents_subs = getStoredRecent(tplid);
		let tmp = menuDef;
		let recent_menuitem_index = tmp.findIndex((mi) => {
			return mi.id === '___recentbiz';
		});
		if (recent_menuitem_index >= 0) {
			tmp[recent_menuitem_index].sub = recents_subs;
			menuDef = tmp;
		}
	};

	const getStoredRecent = function (tplid: string = '') {
		if (!localStorage) return [];

		let rcts = JSON.parse(localStorage.getItem('recentTemplates') ?? JSON.stringify([]));
		if (tplid) {
			let tmp = rcts.indexOf(tplid);
			if (tmp === 0) return; //如果已经是第一项,则直接返回,不用处理

			if (tmp >= 0) {
				//如果找到, 就在原位置删除
				rcts.splice(tmp, 1);
			}

			rcts.unshift(tplid); //在头部加入
		}
		if (rcts.length > 10) {
			//如多余10个,则限制在10个
			rcts.splice(10);
		}
		if (tplid.startsWith('yana')) console.error('NOOOOO ..... yana');
		localStorage.setItem('recentTemplates', JSON.stringify(rcts));

		let tmpData: menuDataType[] = [];
		for (let i = 0; i < rcts.length; i++) {
			tmpData.push({
				id: `__recentbiz_${rcts[i]}`,
				class: 'recent_biz',
				alias: rcts[i],
				href: `/biz/${rcts[i]}`,
				icon: 'dot',
			});
		}

		return tmpData;
	};

	const saveOneRecentTemplate = function (tplid: string) {
		if (tplid === null || tplid === undefined || tplid === '') return;
		let rcts = JSON.parse(localStorage.getItem('recentTemplates') ?? JSON.stringify([]));
		let tmp = rcts.indexOf(tplid);
		if (tmp === 0) return; //如果已经是第一项,则直接返回,不用处理
		// console.log('Put recent 1', tplid);
		putStoredRecentToMenu(tplid);
		// console.log(menuDef);
		theMenu.__refreshMenu(menuDef);
	};

	$: saveOneRecentTemplate($currentBiz);

	const logout = async () => {
		// console.log('Logout now.....');

		$mainAreaClass = '';
		await tick();
		//use goto here simply cause layout not updated.
		await goto('/logout', { replaceState: true, invalidateAll: true });
	};

	const goHome = async () => {
		// console.log('goHome now.....');

		$mainAreaClass = '';
		await tick();
		//use goto here simply cause layout not updated.
		await goto('/', { replaceState: true, invalidateAll: true });
		await tick();
	};

	async function getMyOrg() {
		let myorg = await empApi.post('tnt/my/org', {}, $page.data.user.sessionToken);
		// console.log(myorg);
		return myorg;
	}

	const qr_opts = {
		width: 200,
		height: 200,
		errorCorrectionLevel: 'H',
		type: 'image/jpeg',
		quality: 0.3,
		margin: 1,
		color: {
			dark: '#010599FF',
			light: '#FFBF60FF',
		},
	};

	const generateJoinQrCode = async () => {
		if ($showQrCode) {
			$showQrCode = false;
		} else {
			let org: any = await getMyOrg();
			let qrcodeLink = `${MTC_SERVER}/${$page.data.user.tenant._id}?joincode=${org.joincode}`;
			QRCode.toDataURL(qrcodeLink, qr_opts, function (err: any, url: string) {
				if (err) throw err;

				const img = document.getElementById('qrcode-image') as HTMLImageElement | null;
				if (img) img.src = url;
			});
			$showQrCode = true;
		}
	};
	const changeWorklistStatus = async (event: CustomEvent) => {
		const payload = event.detail;

		if (payload === undefined) return;
		// console.log(payload);
		$filterStorage['todo'].status = payload.status;
		$director_work_searchNow = true;
		goto('/work');
	};
	const toggleMining = async (event: CustomEvent) => {
		const payload = event.detail;

		if (payload === undefined) return;
		$miningMode = payload.miningMode;
		goto('/workflow');
	};

	const addLinkToPersonalMenu = (e: Event) => {
		e.preventDefault();
		empApi
			.post(
				'menu/personal/add',
				{ url: $page.data.url, pageName: $pageName },
				$page.data.user.sessionToken,
			)
			.then(() => {
				toast($_('message.personal_menuitem_saved'), 'Success', 'success');
				//设置这个store，将重新加载菜单，并自动点击这个值
				//所指向的菜单项，如果是folder，意味着将其展开
				$reloadById = '__pmi__';
			});
	};

	$: $reloadById !== '' &&
		(() => {
			setTimeout(async () => {
				await rebuildMenuThenGoto($reloadById);
				$reloadById = '';
			});
		})();

	const rebuildMenuThenGoto = async (gotoMenuItemId: string) => {
		await combineMenus();
		theMenu.clickById(gotoMenuItemId);
	};

	const buildMenus_internal = async () => {
		if ($isLocaleLoaded && theMenu) {
			let menuDataFromServer: menuDataType[] = [];
			if ($page.data.user) {
				const res = await empApi.post('menu/load/forshow', {}, $page.data.user.sessionToken);
				//确保返回的数据是数组,每一个item有mg和def
				if (res.length && res[0].mg && res[0].def && res[0].def.length && res[0].def[0].id) {
					for (let i = 0; i < res.length; i++) {
						menuDataFromServer.push(...res[i].def);
					}
				}
			}

			menuDef = getLocalizedMenuDef(menuDataFromServer);

			return true;
		} else {
			return false;
		}
	};

	let loadMenuDataTimeout: ReturnType<typeof setTimeout> | undefined;
	const combineMenus = async () => {
		// console.log('combineMenusing..................');
		if ((await buildMenus_internal()) === false) {
			if (loadMenuDataTimeout) {
				clearTimeout(loadMenuDataTimeout);
			}
			loadMenuDataTimeout = setTimeout(async () => {
				if (await buildMenus_internal()) {
					putStoredRecentToMenu();
					loadMenuDataTimeout = undefined;
					$menuDataForSet = menuDef;
					$menuRefreshFlag = true;
				}
			}, 10);
		} else {
			putStoredRecentToMenu();
			loadMenuDataTimeout = undefined;
			$menuDataForSet = menuDef;
			$menuRefreshFlag = true;
		}
	};

	const i18nMenuAlias = function (menus: menuDataType[]) {
		menus = menus.map((x) => {
			if (x.alias?.startsWith('$')) x.alias = $_(x.alias.slice(1));
			if (x.sub) x.sub = i18nMenuAlias(x.sub as menuDataType[]);
			return x;
		});

		return menus;
	};

	const getLocalizedMenuDef = (menuDataFromServer: menuDataType[]) => {
		menuDataFromServer = i18nMenuAlias(menuDataFromServer);
		console.log(menuDataFromServer);
		return [
			{
				id: '_worklist',
				class: 'part1',
				alias: $_('navmenu.worklist'),
				href: '/work',
				icon: 'check-square',
				// sub: [
				// 	{
				// 		id: '_work_running',
				// 		alias: $_('homecard.menu.todos.ST_RUN'),
				// 		href: '/work',
				// 		callback: 'changeWorklistStatus',
				// 		payload: { status: 'ST_RUN' },
				// 	},
				// 	{
				// 		id: '_work_done',
				// 		alias: $_('homecard.menu.todos.ST_DONE'),
				// 		href: '/work',
				// 		callback: 'changeWorklistStatus',
				// 		payload: { status: 'ST_DONE' },
				// 	},
				// 	{
				// 		id: '_work_footprint',
				// 		alias: $_('homecard.menu.todos.ST_FOOTPRINT'),
				// 		href: '/work',
				// 		callback: 'changeWorklistStatus',
				// 		payload: { status: 'ST_FOOTPRINT' },
				// 	},
				// ],
			},
			{
				id: '_worklist',
				class: 'part1',
				alias: $_('homecard.menu.todos.startWorkflow'),
				href: '/template',
				icon: 'caret-right-square',
			},
			{
				//////////////////////////////////////////
				//菜单显示名为:
				// if 有alias
				//    if alias startswith $
				//        使用去掉开始$后的字符串的I18n
				//    else
				//        使用alias
				// else
				//    使用id
				//////////////////////////////////////////
				id: '_template',
				alias: $_('navmenu.planning'),
				href: '/template',
				icon: 'box',
				img: '/favicons/favicon-16x16.png',
				// sub: [
				// 	{
				// 		id: '_template_create',
				// 		alias: $_('button.create'),
				// 		href: '/template?action=create',
				// 	},
				// 	{
				// 		id: '_template_import',
				// 		alias: $_('button.import'),
				// 		href: '/template?action=import',
				// 	},
				// 	{
				// 		id: '_template_search',
				// 		alias: $_('button.search'),
				// 		href: '/template?action=search',
				// 	},
				// ],
			},
			{
				id: '_workflow',
				alias: $_('navmenu.workflow'),
				href: '/workflow',
				icon: 'fan',
				// sub: [
				// 	{
				// 		id: '_workflow_normal',
				// 		alias: $_('navmenu.workflow_normal'),
				// 		href: '/workflow',
				// 		callback: 'toggleMining',
				// 		payload: { miningMode: false },
				// 	},
				// 	{
				// 		id: '_workflow_mingin',
				// 		alias: $_('navmenu.workflow_mining'),
				// 		href: '/workflow',
				// 		callback: 'toggleMining',
				// 		payload: { miningMode: true },
				// 	},
				// ],
			},
			{
				id: '_discuss',
				class: 'part3',
				alias: $_('button.discuss'),
				href: '/discuss',
				icon: 'chat-quote',
			},
			{
				id: '_kshares',
				class: 'part3',
				alias: $_('navmenu.kshares'),
				href: '/kshares',
				icon: 'stack',
			},
			{
				id: '___setting',
				class: 'part3',
				alias: $_('navmenu.settings'),
				href: '/settings',
				icon: 'gear',
			},
			{
				id: '___documents',
				class: 'part3',
				alias: $_('navmenu.doc'),
				href: 'https://cnshsliu.github.io/mtcdocs/',
				target: '_yarknodedoc',
				icon: 'question-circle',
			},
			{
				id: '___separator___',
			},
			...menuDataFromServer,
			{
				id: '___recentbiz',
				class: 'part3',
				alias: $_('navmenu.recentbiz'),
				icon: 'calendar-heart',
			},
			{
				id: '____signin',
				class: 'toplevel',
				alias: $_('footer.signin'),
				icon: 'door-open',
				href: '/login',
				check_visible: { fn: checkValue, what: 'inSession', expect: false },
			},
		];
	};
	const checkValue = (what: string, expect: any) => {
		let ret = false;
		switch (what) {
			case 'inSession':
				ret = $menuInSession === expect;
				break;
		}
		return ret;
	};

	//每次从服务器下拉新的newer的数量
	const refreshNewerTodoIds = async () => {
		let ret = await empApi.post('work/getNewerIds', {}, user.sessionToken);
		ret = ret.map((x) => x.todoid);
		let tmp = 0;
		for (let i = 0; i < ret.length; i++) {
			//去掉在客户端上点击了的todo
			if ($clientViewedTodoIds.indexOf(ret[i]) < 0) {
				tmp = tmp + 1;
			}
		}
		$newerTodoNumber = tmp;
	};

	onMount(async () => {
		TimeTool.setLocale($locale ?? 'zh-cn');
		$deviceIsMobile = navigator
			? navigator.userAgent.match(/Android/i) ||
			  navigator.userAgent.match(/webOS/i) ||
			  navigator.userAgent.match(/iPhone/i) ||
			  navigator.userAgent.match(/iPad/i) ||
			  navigator.userAgent.match(/iPod/i) ||
			  navigator.userAgent.match(/BlackBerry/i) ||
			  navigator.userAgent.match(/Windows Phone/i)
				? true
				: false
			: false;

		if ($deviceIsMobile) {
			menuStyle = 'mobile';
		} else {
			menuStyle = 'browser';
		}
		checkNewerInterval = setInterval(() => {
			if (user) {
				refreshNewerTodoIds();
			}
		}, 3000);

		document.onkeyup = (e) => {
			if (e.ctrlKey && e.key === 'p') {
				showYana = !showYana;
			} else if (e.ctrlKey && e.key === 'g') {
				let elem = document.getElementById('cmtinput_for_todo');
				elem && elem.focus();
			}
		};
	});
	onDestroy(() => {
		if (checkNewerInterval) {
			clearInterval(checkNewerInterval);
		}
	});
	const showTodos = async () => {
		// showTodosDiv = !showTodosDiv;
		// let payload = {
		// 	pattern: '',
		// 	skip: 0,
		// 	limit: 9999,
		// 	sortby: 'createdAt',
		// 	status: 'ST_RUN',
		// 	doer: user.eid,
		// 	tspan: 'any',
		// 	reason: 'myworks',
		// 	tplid: '',
		// };
		// const ret = await empApi.post(
		// 	'work/search',
		// 	payload,
		// 	user.sessionToken,
		// 	empApi.CACHE_FLAG.bypass,
		// );
		// todos = ret.objs;
		$refreshFlag = $refreshFlag + 1;
		goto('/work');
	};
	function gotoWorkitem(work: any, anchor = '') {
		goto(`/work/${work.todoid}${anchor}`, {
			replaceState: false,
		});
	}
</script>

{#if $printing === false && user?.eid}
	<Menu
		bind:this={theMenu}
		{menuDef}
		{menuStyle}
		bind:pinned={menuPinned}
		avatar={{
			img: $page.data.user
				? `${API_SERVER}/avatar/${$page.data.user.eid}?token=${$page.data.user.sessionToken}`
				: 'unknown',
		}}
		logo={{ img: '/svg/yarknode.svg' }}
		on:sizeChanged={onMenuSizeChanged}
		on:changeStyle={onMenuChangeStyle}
		on:toggleMining={toggleMining}
		on:changeWorklistStatus={changeWorklistStatus}
		on:logout={logout}
		on:goHome={goHome}
		on:addPersonal={onAddPersonal}
		on:generateJoinQrCode={generateJoinQrCode}>
		<Me
			avatarStyle={'avatar32'}
			on:logout={logout}
			slot="me" />
	</Menu>
{/if}
<div
	class="p-0 {$mainAreaClass}"
	style={'min-height: 50vh'}>
	<slot />
</div>
{#if user && $isLocaleLoaded}
	<div
		class="half-circle shadow1 m-0 p-0"
    role="button"
    tabindex="0"
		on:keydown={undefined}
		on:click={showTodos}>
		{#if ntn > 0}
			<span class="position-absolute top-0 start-50 translate-middle badge rounded-pill bg-danger">
				{ntn > 99 ? '99+' : ntn}
			</span>
		{/if}
		<span class="position-absolute bottom-0 start-50 translate-middle">
			{$_('navmenu.worklist')}
		</span>
	</div>
{/if}

<!-- {#if $printing === false && url.pathname.indexOf('/template/') < 0} -->
<!-- 	<div -->
<!-- 		class="mt-5 d-flex w-100" -->
<!-- 		style="z-index:9999"> -->
<!-- 		<div -->
<!-- 			class="mt-5 ms-auto clickable kfk-link" -->
<!-- 			on:keydown={undefined} -->
<!-- 			on:click={addLinkToPersonalMenu}> -->
<!-- 			{$_('footer.addpagetopersonalmenu')} -->
<!-- 		</div> -->
<!-- 	</div> -->
<!-- {/if} -->

<!-- <div -->
<!-- 	class="half-circle shadow1 m-0 p-0" -->
<!-- 	on:keydown={undefined} -->
<!-- 	on:click={showTodos}> -->
<!-- 	{#if ntn > 0} -->
<!-- 		<span class="position-absolute top-0 start-50 translate-middle badge rounded-pill bg-danger"> -->
<!-- 			{ntn > 99 ? '99+' : ntn} -->
<!-- 		</span> -->
<!-- 	{/if} -->
<!-- 	<span class="position-absolute bottom-0 start-50 translate-middle text-light"> -->
<!-- 		{$_('navmenu.worklist')} -->
<!-- 	</span> -->
<!-- </div> -->

<!-- We do not use a floating div to show todos now, instead we goto '/work' -->
<!-- directly. however, we keep this part of code for future reference
to enalbe this div, set $showTodosDiv to ture, also see what showTodos() does-->
<!-- {#if showTodosDiv} -->
<!-- 	<div -->
<!-- 		id="todosDivShadow" -->
<!--     role="none" -->
<!-- 		on:keydown={undefined} -->
<!-- 		on:click={() => { -->
<!-- 			showTodosDiv = false; -->
<!-- 		}}> -->
<!-- 		<div id="todosDiv"> -->
<!-- 			<div class="fs-3 fw-bold">{$_('navmenu.worklist')}</div> -->
<!-- 			{#each todos as todo, index} -->
<!-- 				<div class="todo row"> -->
<!-- 					<div -->
<!-- 						class="col-auto text-end" -->
<!-- 						style="min-width:4rem;"> -->
<!-- 						{index + 1}: -->
<!-- 					</div> -->
<!-- 					<div -->
<!-- 						class="col todo-title kfk-link" -->
<!--             role="none" -->
<!-- 						on:keydown={undefined} -->
<!-- 						on:click|preventDefault={(e) => { -->
<!-- 							e.stopPropagation(); -->
<!-- 							gotoWorkitem(todo); -->
<!-- 						}}> -->
<!-- 						{todo.title} -->
<!-- 					</div> -->
<!-- 				</div> -->
<!-- 			{/each} -->
<!-- 			<div -->
<!-- 				class="position-fixed" -->
<!-- 				style="top:0px; right:10px;"> -->
<!-- 				<div -->
<!-- 					class="border-0 m-0 p-0" -->
<!-- 					style="width:24px; height:24px;cursor:pointer" -->
<!--           role="none" -->
<!-- 					on:keydown={null} -->
<!-- 					on:click={async () => { -->
<!-- 						showTodosDiv = false; -->
<!-- 					}}> -->
<!-- 					<i class="fs-3 bi bi-x" /> -->
<!-- 				</div> -->
<!-- 			</div> -->
<!-- 		</div> -->
<!-- 	</div> -->
<!-- {/if} -->

<div class={$showQrCode ? 'code' : 'nocode'}>
	<img
		class="qrcode"
		alt="qrcode-1"
		id="qrcode-image" />
	<a
		href={null}
		class="cursor: pointer"
		on:keydown={() => {}}
		on:keyup={() => {}}
		on:keypress={() => {}}
		on:click={() => {
			$showQrCode = false;
		}}>
		<i class="bi bi-x-circle" />
	</a>
</div>

<div style="height:200px;">&nbsp;</div>
	<!-- Only show Yana & EmpFooter when following conditions are all matched: -->
	<!-- 1. is not printing -->
	<!-- 2. is not editting/show a template GUI -->
	{#if $printing === false && url.pathname.indexOf('/template/') < 0}
		<Yana
			bind:show={showYana}
			bind:this={theYana} />
		<!-- Only show EmpFooter when following conditions are all matched:  -->
		<!-- 1. User has logged in.  -->
		<!-- 2. Device is not mobile.  -->
		<!-- 3. expand footer flag is true -->
		<!-- OR:  -->
		<!-- 1. The current page is home. -->
		{#if (user && $deviceIsMobile === false && $expandFooter === true) || url.pathname.indexOf('/home') === 0 || url.pathname.indexOf('/') === 0}
			<EmpFooter
				on:mainAreaClass={(e) => {
					console.log(e.detail);
				}}
				on:showYana={() => {
					showYana = true;
				}}
				on:restartYana={(e) => {
					showYana = true;
					theYana.restart(e.detail.yanaid);
				}} />
		{/if}
	{/if}

<style>
	.menuMode {
		display: block;
		position: absolute;
		top: 10px;
		left: 30%;
	}
	.nocode {
		display: none;
	}
	.code {
		position: fixed;
		right: 20px;
		top: 40px;
		/*transform: translate(-50%, -50%);*/
		display: block;
		width: 250px;
		height: 250px;
		background: #fff;
		border-radius: 5px;
		z-index: 100;
		box-shadow: rgb(204, 204, 204) 2px 2px 9px;
	}
	.qrcode {
		margin: 25px;
	}

	.bi-x-circle {
		position: absolute;
		right: -5px;
		top: -10px;
		font-size: 20px;
		padding: 10px;
	}

	.main-area-width-big {
		margin-left: 218px;
		margin-right: 1.5rem;
	}
	.main-area-width-small {
		margin-left: 55px;
	}
	.personal_menu_item {
		stop-color: hello;
	}

	.text {
		display: block;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: #fff;
	}
	/* #todosDivShadow { */
	/* 	z-index: 8999; */
	/* 	position: fixed; */
	/* 	left: 0px; */
	/* 	top: 0px; */
	/* 	width: 100%; */
	/* 	height: 100%; */
	/* 	background-color: #0006; */
	/* } */
	/* #todosDiv { */
	/* 	z-index: 9000; */
	/* 	position: fixed; */
	/* 	width: 100%; */
	/* 	max-width: 400px; */
	/* 	height: 100%; */
	/* 	max-height: 600px; */
	/* 	bottom: 0px; */
	/* 	right: 50%; */
	/* 	background-color: #fff; */
	/* 	border-top: 1px solid #000; */
	/* 	border-left: 1px solid #000; */
	/* 	border-right: 1px solid #000; */
	/* 	border-radius: 1rem 1rem 0 0; */
	/* 	padding: 1rem; */
	/* 	overflow: auto; */
	/* 	transform: translate(50%, 0); */
	/* 	box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); */
	/* } */
	.half-circle {
		position: fixed;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100px;
		height: 50px;
		border-radius: 100px 100px 0 0;
		vertical-align: text-bottom;
		text-align: center;
		cursor: pointer;
		z-index: 10000;
		white-space: nowrap;
		background-color: #2726ff33;
		background: linear-gradient(rgb(255, 255, 255), rgb(16, 54, 97));
		/* background: linear-gradient(rgba(255, 255, 255, 0.5), #2726ff33), */
		/* 	url('/svg/yarknode.svg') no-repeat center bottom; */
		/* background-size: 10%; */
	}

.shadow1 {
	box-shadow: -1px 0 5px rgb(16,54,97), 0 1px 5px rgb(16,54,97), 1px 0 5px rgb(16,54,97), 0 -1px 5px rgb(16,54,97);
}
</style>
