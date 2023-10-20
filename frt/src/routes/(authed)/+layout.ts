import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url, data }) => {
	const { user, token } = data;
	console.log('In (authed) layout.ts, return', { url, user, token });
	return {
		url,
		user,
		token,
	};
};
