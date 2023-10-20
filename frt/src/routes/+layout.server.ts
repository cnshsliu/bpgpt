type localWithUser = {
	user: any;
};

import type { LayoutServerLoad } from './$types';
//export const load: LayoutServerLoad = async ({ request, locals, setHeaders }) => {
export const load: LayoutServerLoad = async ({ locals }) => {
	const { user } = locals as localWithUser;
	return { user: user, token: user ? user.sessionToken : 'NO_LOGIN_TOKEN', version: '1.1' };
};
