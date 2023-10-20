<script lang="ts">
	import { pageName } from '$lib/Stores';
	import { _ } from '$lib/i18n';
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	export let data: PageData;
	import { Container, Row, Col } from 'sveltestrap';
	import { getUrlQuery } from '$lib/utils';
	import { onMount } from 'svelte';
	import * as api from '$lib/api';
	import { toast } from '$lib/Toast';
	let message = '';
	let tenant: any;
	$: ({ tenantid } = data);
	let joincode = '';
	onMount(async () => {
		$pageName = $_('tenant.apply_to_join');
		joincode = getUrlQuery('joincode');
		// console.log(joincode);
		// console.log($page.data)
		// if($page.data.user) {
		let response = await api.get(`tenant/detail/${tenantid}`, $page.data.user.sessionToken);
		if (response.code == 0) {
			tenant = response.data;
			console.log(tenant);
		} else {
			toast(response.msg);
		}
		// } else {
		//     toast($_('login.verify.needRelogin'));
		//     setTimeout(() => {
		//         goto('/login?joincode='+joincode+'&tenantid='+tenantid);
		//     }, 1000);
		// }
	});
	const joinOrg = async () => {
		let res = await api.post(
			'tnt/join',
			{
				joincode,
			},
			$page.data.user.sessionToken,
		);
		console.log(res);
		message = res.message;
		toast(message);
	};
</script>

<svelte:head>
	<title>{tenantid} • Tenant</title>
</svelte:head>
{#if $page.data.user && tenant}
	<Container>
		<h3 class="text-center title">{$_('setting.tenant.apply_to_join')}{tenant.name}</h3>
		<Row cols="2">
			<Col>
				<p class="text-end">{$_('setting.tenant.action')}：</p>
			</Col>
			<Col>
				<p>{tenant.name}</p>
			</Col>
		</Row>
		<!-- <Button>{$_('setting.tenant.apply_to_join')}</Button> -->
		<div class="w-100 d-flex justify-content-end">
			<button
				class="w-100 btn btn-lg btn-primary pull-xs-right mt-5"
				type="submit"
				on:click={joinOrg}>
				{$_('setting.tenant.apply_to_join')}
			</button>
		</div>
	</Container>
{/if}

<style>
	.title {
		margin-top: 30px;
	}
</style>
