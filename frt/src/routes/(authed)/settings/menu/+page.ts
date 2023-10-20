import * as api from '$lib/api';
import type { PageLoad } from './$types';
export const load: PageLoad = async ({ url, params, data, fetch, parent }) => {
	//const { user } = await parent();
	api.setFetch(fetch);
	/*
	let showComment = false;
	if (url.searchParams.has('showComment') && url.searchParams.get('showComment') == 'true') {
		showComment = true;
	}
	let wfid = url.searchParams.get('wfid');
	api.setFetch(fetch);
	if (wfid && wfid.charAt(0) === '@') wfid = wfid.substring(1);

		return {
			workflow: {
				wftitle: 'Not Found'
			},
			wfid: wfid,
			showComment: false
		};
		*/
};
