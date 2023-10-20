import * as api from '$lib/api';
import { redirect } from '@sveltejs/kit';
export async function load({ params, parent, fetch }) {
	const { user } = await parent();
	api.setFetch(fetch);
	console.log('start', params.tryid, 'token:', user.sessionToken);
	const wf = await api.post(
		'try/start',
		{ tryid: params.tryid, wftitle: 'TITLE TITLE' },
		user.sessionToken,
	);
	return {
		wf,
	};
}
