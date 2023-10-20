import * as api from '$lib/api';
import type { PageLoad } from './$types';
export const load: PageLoad = async ({ url, params, data, fetch, parent }) => {
	const { user } = await parent();
	const wfid = params.wfid;
	api.setFetch(fetch);
	const workflow = await api.post(
		'workflow/read',
		{ wfid: wfid, withdoc: true },
		user.sessionToken
	);
	const routeStatus = await api.post('/workflow/routes', { wfid: wfid }, user.sessionToken);

	try {
		return {
			workflow: workflow,
			routeStatus: routeStatus,
			wfid: params.wfid
		};
	} catch (e) {
		console.error(e);
		return {
			workflow: {
				wftitle: 'Not Found'
			},
			routeStatus: [],
			wfid: params.wfid
		};
	}
};
