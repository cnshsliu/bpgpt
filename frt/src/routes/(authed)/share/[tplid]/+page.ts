import * as api from '$lib/api';
import type { PageLoad } from './$types';
export const load: PageLoad = async ({ params, fetch }) => {
	api.setFetch(fetch);
	let tplid = params.tplid;
	if (tplid && tplid.charAt(0) === '@') tplid = tplid.substring(1);
	const res = await api.post('ksconfig/get', {});
	const scenarios = res.scenarios;
	const industries = res.industries;
	return {
		tplid: tplid,
		scenarios,
		industries,
	};
};
