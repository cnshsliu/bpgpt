import * as api from '$lib/api';
import type { PageLoad } from './$types';
export const load: PageLoad = async ({ url, params, data, fetch, parent }) => {
	const { user } = await parent();
	const tpl_mode = params.mode;
	let tplid = params.tplid;
	if (tplid && tplid.charAt(0) === '@') tplid = tplid.substring(1);
	api.setFetch(fetch);
	const res = await api.post('ksconfig/get', {}, user.sessionToken);
	const scenarios = res.scenarios;
	const industries = res.industries;
	try {
		const template = await api.post('template/read', { tplid: tplid }, user.sessionToken);
		return {
			template: template,
			tplid: tplid,
			tpl_mode,
			scenarios,
			industries
		};
	} catch (err) {
		console.error(err);
		return {
			template: { tplid: 'Not Found' },
			tplid: tplid,
			tpl_mode,
			scenarios: [],
			industries: []
		};
	}
};
