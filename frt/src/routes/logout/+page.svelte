<script lang="ts">
	import { goto, beforeNavigate } from '$app/navigation';
	import { clientlocale } from '$lib/mtcLocalStores';

	import { tick, onMount } from 'svelte';

	onMount(async () => {
		let backupClientLocale = $clientlocale;
		localStorage.clear();
		$clientlocale = backupClientLocale;

		await tick();
		console.log('logout svelte clear localStorage');
		setTimeout(() => {
			goto('/', { replaceState: true, invalidateAll: true });
		});
	});

	beforeNavigate(async () => {
		return true;
	});
</script>
