// src/routes/+layout.server.ts

import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
//export const load: LayoutServerLoad = async ({ request, locals, setHeaders }) => {
export const load: LayoutServerLoad = async ({ url, params, locals }) => {
	const { user } = locals;
	if (!locals.user) {
		console.log('Access without user, will redirect to /login ', url);
		if (url.pathname.startsWith('/apply')) {
			console.log(url.pathname);
			const tenantid = params.tenantid;
			throw redirect(307, '/login' + url.search + '&tenantid=' + tenantid);
		} else {
			throw redirect(307, '/login');
		}
	}
	return { user: user, token: user ? user.sessionToken : 'NO_LOGIN_TOKEN' };
};
