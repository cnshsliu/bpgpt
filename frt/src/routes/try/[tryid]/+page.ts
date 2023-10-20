import * as api from '$lib/api';
import { redirect } from '@sveltejs/kit';
export async function load({ params, fetch, parent }) {
	const { user } = await parent();
	api.setFetch(fetch);
	if (user) {
		throw redirect(307, `/trynow/${params.tryid}`);
	} else {
		let what = await api.post('/try', { tryid: params.tryid });
		return {
			tryid: params.tryid,
			what,
		};
	}
}
