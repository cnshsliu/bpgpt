<script lang="ts">
	import { pageName } from '$lib/Stores';
	import { _ } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { Container } from 'sveltestrap';

	onMount(async () => {
		$pageName = $_('navmenu.recentbiz');
		//await loadFromServer();
	});
</script>

<Container class="mt-3 ms-5">
	<div class="row row-cols-1 row-cols-md-2"><div class="col fs-1">All available business</div></div>
	<div class="row row-cols-1 row-cols-md-2">
		<div class="col">
			<div class="fs-3">left</div>
			<ul>
				<li>item1</li>
				<li>item2</li>
			</ul>
		</div>
		<div class="col">right</div>
	</div>
</Container>
