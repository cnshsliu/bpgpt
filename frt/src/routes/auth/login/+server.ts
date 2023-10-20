import * as api from '$lib/api';
import { respond } from '../_respond';
export const POST = async ({ request, fetch }): Promise<ReturnType<typeof respond>> => {
	//const { request, locals } = event;
	const body = await request.json();
	api.setFetch(fetch);
	const ret = await api.post('account/login', {
		account: body.account,
		password: body.password,
		openid: body.openid
	});
	if (ret.error) {
		console.error('auth/login', ret);
	}
	console.log(ret);
	return respond(ret);
};
