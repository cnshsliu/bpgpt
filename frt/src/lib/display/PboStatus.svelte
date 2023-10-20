<script lang="ts">
	import { _ } from '$lib/i18n';
	import { StatusClass } from '$lib/status';
	export let wf: any;
</script>

{#if wf.pbostatus}
	{#if wf.pbostatus !== '__init__'}
		{wf.pbostatus}
	{:else}
		<span class={StatusClass(wf.status)}>{$_('status.' + wf.status)}</span>
	{/if}
{:else}
	&nbsp;aaa
{/if}
