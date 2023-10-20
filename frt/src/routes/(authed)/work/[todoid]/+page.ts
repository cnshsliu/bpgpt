import * as api from '$lib/api';
import { get } from 'svelte/store';
import { mtcSession } from '$lib/Stores';
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { HistoryTodoEntryType, DelegationType } from '$lib/types';

export const load: PageLoad = async ({ params, url, fetch, parent }) => {
	const { user } = await parent();
	const anchor = url.searchParams.get('anchor');
	let todoid = params.todoid;
	if (todoid && todoid.charAt(0) === '@') todoid = todoid.substring(1);

	api.setFetch(fetch);
	const work = await api.post('work/info', { todoid: todoid }, user.sessionToken);

	const theWork = work;
	let delegators: string[] = [];
	if (theWork && theWork.wf) {
		theWork.wf.history.map((x: HistoryTodoEntryType) => {
			x.isCurrent = x.workid === theWork.workid;
			x.classname = 'col mt-3 kfk-highlight-track' + (x.isCurrent ? '-current' : '');
			return x;
		});
		theWork.routingOptions.sort();
		try {
			const delegations: DelegationType[] = await api.post(
				'/delegation/to/me/today',
				{},
				user.sessionToken,
			);
			delegators = delegations.map((x) => x.delegator);
			if (delegators.includes(user.eid) === false) {
				delegators.push(user.eid);
			}
		} catch (e) {
			console.error(e);
		}
		if (get(mtcSession).comment_wfid === theWork.wfid) {
			theWork.comments = get(mtcSession).comments;
		} else {
			const cmtRes = await api.post(
				'comment/workflow/load',
				{ wfid: theWork.wfid },
				user.sessionToken,
			);
			if (cmtRes.error) {
				const tmp = get(mtcSession);
				delete tmp.comment_wfid;
				delete tmp.comments;
				mtcSession.set(tmp);
			} else {
				theWork.comments = cmtRes;
				const tmp = get(mtcSession);
				tmp.comment_wfid = theWork.wfid;
				tmp.comments = theWork.comments;
				mtcSession.set(tmp);
			}
		}
	}
	if (theWork.error) {
		throw redirect(307, `/notfound`);
	} else {
		return {
			todoid: todoid,
			work: theWork,
			delegators: delegators,
			anchor: anchor,
		};
	}
};
