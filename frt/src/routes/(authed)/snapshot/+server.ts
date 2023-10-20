// @migration task: Check imports
import * as api from '$lib/api';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function GET({ url, params, locals }) {
	const token = locals.user && locals.user.sessionToken;
	const objtype = url.searchParams.get('objtype');
	const objid = url.searchParams.get('objid');
	const ret = await api.get(`snapshot/${objtype}/${objid}`, token);
	const responseInit: ResponseInit = {
		headers: {
			'Cache-Control': 'public,max-age:3600',
			'Content-Type': 'image/svg+xml',
		},
	};
	return new Response(ret, responseInit);
}
