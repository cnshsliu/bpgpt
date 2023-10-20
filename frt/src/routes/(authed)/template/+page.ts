import * as api from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, url, fetch, parent }) => {
	const action = url.searchParams.get('action');
	return {
		action: action,
	};
};
