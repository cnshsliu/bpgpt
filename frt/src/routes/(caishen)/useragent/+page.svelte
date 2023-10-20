<script lang="ts">
	import { onMount,  } from 'svelte';
  let myUserAgent="";
	onMount(async () => {
		await fetch('/what-is-my-user-agent')
			.then((res) => res.json())
			.then((json) => (myUserAgent = json.userAgent));
  });
</script>

<svelte:head>
	<title>My User Agent</title>
</svelte:head>
{myUserAgent}
