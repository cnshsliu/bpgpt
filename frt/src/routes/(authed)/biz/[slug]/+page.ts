import * as api from '$lib/api';
import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';
//export const load: PageLoad = async ({ url, params, data, fetch, parent }) => {
export const load: PageLoad = async ({ url, params, fetch, parent }) => {
	const { user } = await parent();
	api.setFetch(fetch);
	const action = url.searchParams.get('action');

	//如果没有提供业务名称,则重定向到/work
	if (!params.slug) {
		throw redirect(302, '/work');
	}

	const template = await api.post('template/basic', { tplid: params.slug }, user.sessionToken);

	return {
		bizname: params.slug,
		template: template,
		action: action,
		user: user,
	};
};
