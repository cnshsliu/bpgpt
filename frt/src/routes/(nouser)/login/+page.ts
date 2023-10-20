import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, fetch }) => {
	//用户访问/login时，如果已经登录，重定向到/work
	const { user } = await parent();
	if (user) {
		throw redirect(302, '/work');
	}
	return {};
};
