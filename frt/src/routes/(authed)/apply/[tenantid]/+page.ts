export async function load({ url, params, parent }) {
	let tenantid = params.tenantid;
	if (tenantid && tenantid.charAt(0) === '@') tenantid = tenantid.substring(1);
	const { user, token } = await parent();
	return {
		tenantid,
		user,
		token
	};
}
