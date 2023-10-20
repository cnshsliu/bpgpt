<script lang="ts">
	import { _ } from '$lib/i18n';
	import type { PageData } from './$types';
	import { Container } from 'sveltestrap';
	import AdminMenu from './__AdminMenu.svelte';
	import PersonalMenu from './__PersonalMenu.svelte';
	export let data: PageData;
	let { user } = data;
	$: ({ user } = data);

	let menuType = user.group === 'ADMIN' ? 'ADMIN' : 'PERSONAL';
</script>

<Container class="mt-3">
	<nav aria-label="breadcrumb">
		<ol class="breadcrumb">
			<li class="breadcrumb-item kfk-tag">
				<a
					class="kfk-link"
					href={'/settings'}>
					{$_('navmenu.settings')}
				</a>
			</li>
			{#if user.group === 'ADMIN'}
				<li class="breadcrumb-item kfk-tag">
					<a
						class="kfk-link"
						href={'#'}
						on:click={() => {
							menuType = 'ADMIN';
						}}>
						{$_('setting.menu.groupmenu')}
					</a>
				</li>
			{/if}
			<li class="breadcrumb-item kfk-tag">
				<a
					class="kfk-link"
					href={'#'}
					on:click={() => {
						menuType = 'PERSONAL';
					}}>
					{$_('setting.menu.personalmenu')}
				</a>
			</li>
		</ol>
	</nav>
	{#if menuType === 'ADMIN'}
		<div class="row">
			<div class="d-flex">
				<div class="flex-shrink-0 fs-3">{$_('setting.menu.groupmenu')}</div>
				<div class="mx-5 align-self-center flex-grow-1">&nbsp;</div>
			</div>
		</div>
		<AdminMenu {data} />
	{:else}
		<div class="row">
			<div class="d-flex">
				<div class="flex-shrink-0 fs-3">{$_('setting.menu.personalmenu')}</div>
				<div class="mx-5 align-self-center flex-grow-1">&nbsp;</div>
			</div>
		</div>
		<PersonalMenu {data} />
	{/if}
</Container>
