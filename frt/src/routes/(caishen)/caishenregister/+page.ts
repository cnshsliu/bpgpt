import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url, params, parent }) => {
	/* const { user } = await parent();
	if (user) {
		throw redirect(302, '/');
	} */
	const joincode = url.searchParams.get('joincode');
	return { joincode, url };
};
