<script lang="ts">
	import * as api from '$lib/api';
	import type { PageData } from './$types';
	import KShareForm from '$lib/KShareForm.svelte';
	export let data: PageData;
</script>

{#if data.user}
	{#await api.post('kshare/able', {}, data.user.sessionToken)}
		waiting.
	{:then ksadmin}
		{#if ksadmin.ksable}
			<KShareForm
				token={data.user.sessionToken}
				tplid={data.tplid}
				scenarios={data.scenarios}
				industries={data.industries} />
		{:else}
			Your domain <b>{data.user.tenant.domain}</b>
			 is not allowed to share business
		{/if}
	{:catch error}
		{error.message}
	{/await}
{:else}
	Biziness share only for logged in users
{/if}
