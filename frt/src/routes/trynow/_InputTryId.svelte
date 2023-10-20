<script lang="ts">
	import { goto } from '$app/navigation';
	export let tryid = '';

	export let msg = 'Input try ID please';

	const checkEnter = (e: KeyboardEvent) => {
		if (e.key === 'Enter') submit();
	};
	const submit = () => {
		goto(`/try/${tryid}`);
	};
</script>

{msg}
<input
	bind:value={tryid}
	on:keypress={checkEnter} />
<button on:click={submit}>Try</button>
