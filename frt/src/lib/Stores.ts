import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { MtcConfirmType, MtcSessionType, Work, UiSectionType } from '$lib/types';
export const finderFilter = writable();
export interface findFilterType {
	wfid: string;
	todoid?: string;
	nodeid?: string;
	title?: string;
	msg?: string;
}
//will force work/+page.svelte to call seachNow() on value change
export const todoCache = writable({
	ST_DONE: [] as Work[],
	ST_FOOTPRINT: [] as Work[],
});
export const deviceIsMobile: Writable<boolean> = writable(false);
export const expandFooter: Writable<boolean> = writable(false);
export const clientViewedTodoIds: Writable<String[]> = writable([]);
export const newerTodoNumber = writable(0);
export const refreshFlag = writable(0);
export const reloadById = writable('');
export const whereAfterLogin = writable('');
export const showQrCode = writable(false);
export const toastMessage = writable({ msg: '', title: '', color: '' });
export const finderMsg = writable('Finding');
export const printing = writable(false);
export const tstABC = writable('abc');
export const pageName = writable('');
export const workRefreshInterval = writable();
export const fetchCache = writable({});
export const siteinfo = writable(null);
export const delayLoadOnMount = writable(0);
export const menus = writable([]);
export const forcePreDelete = writable(false);
export const worklistChangeFlag = writable(0);
export const miningMode = writable(false);
export const mainAreaClass = writable('main-area-unknown');
export const standaloneTopMenuClass = writable('satm-unknown');
export const miningConfig = writable({
	showOnlyAboveThreshold: false,
	withWhat: { process: true, todos: true },
	barTypes: { lasting: true, works: true, todos: true },
	redlight_unit: 'hour',
	process_threshold_days: 7,
	redlight_threshold_days: 1,
	redlight_threshold_hours: 24,
	dimension: 'time',
	peopleby: 'tasks_number',
});
export const currentBiz = writable('');
export const breakpoint = writable(2);
export const showAdvancedSearch = writable({ todo: false, tpl: false, wf: false }); //Caution: please dont' give it any intial value
export const srPage = writable({ todo: 0, tpl: 0, wf: 0 });
export const lastQuery = writable({ todo: {}, wf: {}, tpl: {} });
export const lastMining = writable({});
export const savedSearches = writable({ todo: [], wf: [] });
export const mylocale = writable('en');
export const pickedKShareTags: Writable<string[]> = writable([]);
export const mtcSession: Writable<MtcSessionType> = writable({
	avatarChangedFlag: 0,
	signatureChangedFlag: 0,
	tplIds: [] as string[],
	tplIdsForSearch_for_wf: [] as string[],
	delegators: [] as string[],
	tplIdsForSearch_for_todo: [] as string[],
	comment_wfid: '',
	pickedTodoId: '',
	comments: [] as string[],
	showpostponed: false,
	wfid: '',
	user: null,
	org: null,
	orgname: '',
	locale: '',
});
export const TagStorage = writable({
	org: ['TO_BE_RELOADED'],
	mine: ['TO_BE_RELOADED'],
});
export const wfPage = writable(0);
export const currentTplid = writable('');
export const UiSection: Writable<UiSectionType> = writable({
	show: false,
	tag: true,
	search: false,
	sort: false,
	layout: false,
});
export const todoPage = writable(0);
export const mtcSearchCondition = writable({
	todo: {
		init: 0,
		search: '',
		extra: {},
	},
});
export const mtcTplViewMode = writable('unknown');
export interface notifyType {
	title?: string;
	msg: string;
	type?: string;
	pos?: string;
	duration?: number;
}
export const notifyMessage: Writable<notifyType> = writable({
	title: 'Notification',
	msg: 'Hello Yarknode',
	type: 'warning',
	pos: 'center',
	duration: 3,
});

export const mtcConfirm: Writable<MtcConfirmType> = writable({
	title: '',
	body: '',
	buttons: [],
	callbacks: [],
});

export const mtcConfirmReset = () => {
	mtcConfirm.set({
		title: '',
		body: '',
		buttons: [],
		callbacks: [],
	});
};
