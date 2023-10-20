import * as api from '$lib/api';
export async function load({ params, fetch }) {
	api.setFetch(fetch);
	let what = await api.post('/try', { tryid: params.tryid });
	return {
		tryid: params.tryid,
		what,
	};
}
