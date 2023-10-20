export async function load({ url, params, fetch }) {
	const wfid = params.wfid;

	try {
		return {
			wfid: params.wfid
		};
	} catch (e) {
		console.error(e);
	}
}
