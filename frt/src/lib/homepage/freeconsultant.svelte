<script lang="ts">
	import { _ } from '$lib/i18n';
	import UserGuidesCol from '$lib/homepage/userguides_col.svelte';
	import { Accordion, AccordionItem, Nav, NavItem, NavLink } from 'sveltestrap';
</script>

<div class="container mt-5">
	<div class="row">
		<UserGuidesCol
			data={{
				icon: 'chat-right-heart',
				title: $_('home.c4f.title'),
				content: $_('home.c4f.content'),
				link: $_('home.c4f.link'),
			}}
			on:click={() => {
				console.log('click');
			}} />
	</div>
</div>
