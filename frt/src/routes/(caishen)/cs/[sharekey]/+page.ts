import * as api from '$lib/api';
import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageLoad = async ({ url, params, fetch, parent }) => {
	api.setFetch(fetch);

	const shareit = await api.get(`caishen/cs/${params.sharekey}`, '');
	console.log(shareit);

	return {
		shareit,
	};
};
