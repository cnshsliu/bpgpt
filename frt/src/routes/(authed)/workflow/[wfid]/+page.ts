import * as api from '$lib/api';
import type { PageLoad } from './$types';
export const load: PageLoad = async ({ url, params, data, fetch, parent }) => {
	const { user } = await parent();
	let showComment = false;
	if (url.searchParams.has('showComment') && url.searchParams.get('showComment') == 'true') {
		showComment = true;
	}
	console.log('Params', params);
	let wfid = params.wfid;
	api.setFetch(fetch);
	if (wfid && wfid.charAt(0) === '@') wfid = wfid.substring(1);

	const workflow = await api.post(
		'workflow/read',
		{ wfid: wfid, withdoc: false },
		user.sessionToken
	);

	if (workflow.error) {
		workflow.wftitle = 'Not Found';
	}

	try {
		return {
			workflow: workflow,
			wfid: params.wfid,
			showComment: showComment
		};
	} catch (e) {
		console.error(e);
		return {
			workflow: {
				wftitle: 'Not Found'
			},
			wfid: params.wfid
		};
	}
};
