<script lang="ts">
	import { goto, beforeNavigate } from '$app/navigation';
	import { clientlocale } from '$lib/mtcLocalStores';

	import { tick, onMount } from 'svelte';

	onMount(async () => {
		let backupClientLocale = $clientlocale;
		localStorage.clear();
		$clientlocale = backupClientLocale;

		await tick();
		setTimeout(() => {
			window.location.href = '/caishenlogin';
		}, 100);
	});

	beforeNavigate(async () => {
		return true;
	});
</script>
