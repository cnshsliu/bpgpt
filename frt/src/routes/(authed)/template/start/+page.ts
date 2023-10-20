import type { SearchResult } from '$lib/types';
import type { PageLoad } from './$types';
import * as api from '$lib/api';
export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { user } = await parent();
	const tplid = url.searchParams.get('tplid');
	api.setFetch(fetch);
	const res_team: SearchResult = (await api.post(
		'team/search',
		{ limit: 1000 },
		user.sessionToken
	)) as unknown as SearchResult;
	const theTeams = res_team.objs;

	return {
		tplid: tplid,
		teams: theTeams
	};
};
