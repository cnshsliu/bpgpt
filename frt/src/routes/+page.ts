// since there's no dynamic data here, we can prerender
// it so that it gets served as a static asset in production
export const prerender = false;
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { API_SERVER } from '$lib/Env';

const EMP_SERVER_ADDRESS = API_SERVER.replace('https://', '');

export const load: PageLoad = async ({ parent, fetch }) => {
	//用户访问/login时，如果已经登录，重定向到/work
	const { user, version, url } = await parent();
	const res = await fetch(`https://${EMP_SERVER_ADDRESS}/caishen/getContext`);
	const json = await res.json();
	if (url.hostname === 'mtc.localhost') {
		throw redirect(302, '/mtc');
	} else {
		return { user, context: json, version: version ?? '2.0', url };
	}
};
