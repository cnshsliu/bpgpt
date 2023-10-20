<svelte:options accessors />

<script lang="ts">
	import { API_SERVER } from '$lib/Env';
	import { page } from '$app/stores';
	import * as api from '$lib/api';
	import { tick, onMount } from 'svelte';
	export let eid: string;
	export let uname: string;
	export let style: string;
	let avatar = true;
	let tenant = $page.data.user.tenant._id;
	let imgUrl = `${API_SERVER}/avatar/${eid}?token=${$page.data.user.sessionToken}`;
	onMount(async () => {});
	export const refresh = () => {
		avatar = true;
		imgUrl = imgUrl + '&t=' + new Date().getTime();
	};
</script>

{#if avatar}
	<img
		src={imgUrl}
		class={style}
		alt="avatar"
		on:error={(e) => {
			console.error(e);
			avatar = false;
		}} />
{:else}
	<div class="kfk-avatar-letter-small text-center">
		{uname ? uname : ' '}
	</div>
{/if}
