// withDemoAccount will automatically register an demo account for user in '+page.ts'
// and logo user in in here '+page.svelte'
// the, goto '$whereAfterLogin' location (if not set, goto '/work')
import ShortUniqueId from 'short-unique-id';
import * as api from '$lib/api';

export async function load({ fetch }) {
	api.setFetch(fetch);
	let uid = new ShortUniqueId({ length: 10 });

	let demoAccount: string = '';
	let demoPassword: string = '';
	for (let i = 0; i < 100; i++) {
		demoAccount = `D${uid()}`;
		demoPassword = `Demo@${uid()}`;
		let ret = await api.post('account/register', {
			account: demoAccount,
			username: demoAccount,
			// password: demoPassword,
			demo: true,
		});
		if (ret.error) console.log(ret);
		else break;
	}
	return {
		demoAccount,
		demoPassword,
	};
}
