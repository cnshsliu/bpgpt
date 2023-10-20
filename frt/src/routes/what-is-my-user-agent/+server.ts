import { json } from '@sveltejs/kit';
import type { RequestEvent, RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }: RequestEvent) => {
	return json(
		{
			// retrieve a specific header
			userAgent: request.headers.get('user-agent'),
		},
		{
			// set a header on the response
			headers: { 'x-custom-header': 'potato' },
		},
	);
};
