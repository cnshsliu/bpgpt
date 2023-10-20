export async function load({ params }) {
	return {
		adminMode: params.adminMode,
		shownNumber: params.shownNumber,
	};
}
