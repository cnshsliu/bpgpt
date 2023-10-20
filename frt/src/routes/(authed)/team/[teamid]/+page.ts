import type { PageLoad } from './$types';
import * as api from '$lib/api';
export const load: PageLoad = async ({ params, fetch, parent }) => {
	const { user } = await parent();
	let teamid = params.teamid;
	if (teamid && teamid.charAt(0) === '@') teamid = teamid.substring(1);
	api.setFetch(fetch);
	const team = await api.post('team/read', { teamid: params.teamid }, user.sessionToken);
	console.log(team);

	return {
		team: team,
		export_to_filename: team.teamid,
	};
};
