import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	// we only use this endpoint for the api
	// and don't need to see the page
	cookies.delete('jwt', {
		path: '/',
	});

	console.log('logout server deleted cookie');

	return {};
};
