<script lang="ts">
	import { _ } from '$lib/i18n';
	import { InputGroup, Input } from 'sveltestrap';

	export let nodeInfo: any;
	export let readonly: boolean;
</script>

<InputGroup>
	<Input
		class="ms-1"
		id="chk_allowpbo"
		type="checkbox"
		label={$_('prop.action.p10t.allowpbo')}
		bind:checked={nodeInfo.nodeProps.ACTION.allowpbo}
		disabled={readonly} />
	<Input
		class="ms-1"
		id="chk_mustsign"
		type="checkbox"
		label={$_('prop.action.p10t.mustsign')}
		bind:checked={nodeInfo.nodeProps.ACTION.mustsign}
		disabled={readonly} />
	<Input
		class="ms-1"
		id="chk_cmt"
		type="checkbox"
		label={$_('prop.action.p10t.withcmt')}
		bind:checked={nodeInfo.nodeProps.ACTION.withcmt}
		disabled={readonly} />
	<Input
		id="chk_transferable"
		type="checkbox"
		label={$_('prop.action.p10t.transferable')}
		bind:checked={nodeInfo.nodeProps.ACTION.transferable}
		disabled={readonly} />
	<Input
		class="ms-1"
		id="chk_sendback"
		type="checkbox"
		label={$_('prop.action.p10t.withsb')}
		bind:checked={nodeInfo.nodeProps.ACTION.withsb}
		disabled={readonly} />
	<Input
		class="ms-1"
		id="chk_revoke"
		type="checkbox"
		label={$_('prop.action.p10t.withrvk')}
		bind:checked={nodeInfo.nodeProps.ACTION.withrvk}
		disabled={readonly} />
	<Input
		class="ms-1"
		id="chk_adhoc"
		type="checkbox"
		label={$_('prop.action.p10t.withadhoc')}
		bind:checked={nodeInfo.nodeProps.ACTION.withadhoc}
		disabled={readonly} />
</InputGroup>
