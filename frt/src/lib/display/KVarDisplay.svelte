<script lang="ts">
	import { _ } from '$lib/i18n';
	import { Col } from 'sveltestrap';
	import Parser from '$lib/parser';
	import DisplayTable from '$lib/display/Table.svelte';
	import CsvDisplay from '$lib/display/CsvDisplay.svelte';
	import WorkFile from '$lib/workfile.svelte';

	export let work: any;
	export let kvar: any;
</script>

{#if kvar.ui.includes('context') || work.rehearsal}
	{#if kvar.breakrow}
		<div class="w-100" />
	{/if}
	{#if ['textarea', 'tbl'].includes(kvar.type)}
		<div class="w-100" />
	{/if}
	<div
		class={kvar.type === 'tbl'
			? ' col p-3 w-100 border border-1 rounded'
			: ' col p-2 ' + (['textarea', 'tbl'].includes(kvar.type) ? ' w-100' : '')}>
		<div class="fw-bold">
			{#if kvar.label === 'Starter'}
				{$_('todo.Starter')}{work.rehearsal ? `(${kvar.name})` : ''}
			{:else if kvar.label === 'StarterCN'}
				{$_('todo.StarterCN')}{work.rehearsal ? `(${kvar.name})` : ''}
			{:else if kvar.label === 'StarterOU'}
				{$_('todo.StarterOU')}{work.rehearsal ? `(${kvar.name})` : ''}
			{:else if kvar.label.startsWith('OUof_')}
				{$_('todo.OUof') + '(' + kvar.label.substring(5) + ')'}{work.rehearsal
					? `(${kvar.name})`
					: ''}
			{:else}
				{kvar.label}{work.rehearsal ? `(${kvar.name})` : ''}
			{/if}
		</div>
		<span class="kfk-kvar-value-display">
			{#if kvar.type === 'textarea'}
				{@html Parser.newlineToBreak(kvar.value)}
			{:else if kvar.type === 'url'}
				<a
					href={kvar.value}
					target="_blank"
					rel="noreferrer">
					{kvar.value}
				</a>
			{:else if kvar.type === 'file'}
				<WorkFile
					{work}
					title={''}
					forWhat={'workflow'}
					forWhich={work.wfid}
					forKey={kvar.name}
					forKvar={kvar.label}
					uploader={false} />
			{:else if kvar.type === 'csv'}
				<CsvDisplay fileId={kvar.value} />
			{:else if kvar.type === 'tbl'}
				<DisplayTable {kvar} />
			{:else if work.rehearsal}
				{kvar.display ? kvar.value + '(' + kvar.display + ')' : kvar.value}
			{:else}
				{kvar.display
					? kvar.display
					: kvar.type === 'checkbox'
					? $_(`boolean.${kvar.value}`)
					: kvar.value}
			{/if}
		</span>
	</div>
	{#if ['textarea', 'tbl'].includes(kvar.type) || kvar.name === 'ou_SOU'}
		<div class="w-100" />
	{/if}
{/if}
