import * as api from '$lib/api';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function GET({ locals, params, fetch }) {
	const token: string = locals.user && locals.user.sessionToken;
	//api.setFetch(fetch);
	let doer = params.doer;
	if (doer === 'default') doer = locals.user && locals.user.eid;
	console.log({ Doer: doer, token: token });
	const works = await api.post(
		'work/list',
		{ doer, filter: { status: 'ST_RUN', wfstatus: 'ST_RUN' } },
		token,
	);
	console.log('Works', works);

	return {
		body: works,
	};
}
