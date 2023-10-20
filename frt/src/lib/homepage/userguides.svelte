<script lang="ts">
	import { _ } from '$lib/i18n';
	import { goto } from '$app/navigation';
	import UserGuidesCol from '$lib/homepage/userguides_col.svelte';
	import { Accordion, AccordionItem, Nav, NavItem, NavLink } from 'sveltestrap';
</script>

<div class="container mt-5">
	<div class="row">
		<UserGuidesCol
			data={{
				icon: 'star',
				title: $_('home.getstart.title'),
				content: $_('home.getstart.content'),
				link: $_('home.getstart.link'),
			}}
			on:click={() => {
				goto('/getstart');
			}} />

		<UserGuidesCol
			data={{
				icon: 'box',
				title: $_('home.hub.title'),
				content: $_('home.hub.content'),
				link: $_('home.hub.link'),
			}}
			on:click={() => {
				goto('/kshares');
			}} />

		<UserGuidesCol
			data={{
				icon: 'book',
				title: $_('home.doc.title'),
				content: $_('home.doc.content'),
				link: $_('home.doc.link'),
			}}
			on:click={() => {
				window.open('https://cnshsliu.github.io/mtcdocs/', '_mtcdocs');
			}} />

		<UserGuidesCol
			data={{
				icon: 'github',
				title: $_('home.opensource.title'),
				content: $_('home.opensource.content'),
				link: $_('home.opensource.link'),
			}}
			on:click={() => {
				goto('/opensource');
			}} />
	</div>
</div>
