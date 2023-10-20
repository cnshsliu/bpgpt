import * as api from '$lib/api';
import type { PageLoad } from './$types';
export const load: PageLoad = async ({ params, fetch, parent }) => {
  const { user } = await parent();
  api.setFetch(fetch);
  console.log(params.tplid);
  return {
    tplid: params.tplid,
  };
};
