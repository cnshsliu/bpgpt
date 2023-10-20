<script lang="ts">
	// withDemoAccount will automatically register an demo account for user in '+page.ts'
	// and logo user in in here '+page.svelte'
	// the, goto '$whereAfterLogin' location (if not set, goto '/work')

	import type { PageData } from './$types';
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { whereAfterLogin } from '$lib/Stores';
	import { post } from '$lib/utils';
	import { onMount } from 'svelte';

	export let data: PageData;

	let { demoAccount, demoPassword } = data;

	onMount(async () => {
		console.log('demoAccount', demoAccount);
		console.log('demoPassword', demoPassword);

		await post('auth/login', {
			account: demoAccount,
			password: demoPassword,
			openid: '',
		});

		tick();
		if ($whereAfterLogin) {
			goto($whereAfterLogin, { replaceState: true, invalidateAll: true });
			setTimeout(() => {
				whereAfterLogin.set('');
			}, 300);
		} else goto('/work');
	});
</script>

<!-- body is unnecessary -->
