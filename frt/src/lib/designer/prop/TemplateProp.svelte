<script lang="ts">
	import { _ } from '$lib/i18n';
	import type { Template, Workflow, KFKclass } from '$lib/types';
	import { Input, InputGroup, InputGroupText, FormGroup } from 'sveltestrap';
	export let template: Template;
	export let readonly: boolean;
</script>

<InputGroup>
	<InputGroupText>{$_('prop.tpl.tplid')}</InputGroupText>
	<div class="ms-2">{template.tplid}</div>
</InputGroup>
<InputGroup>
	<InputGroupText>{$_('prop.tpl.readonly')}</InputGroupText>
	<div class="ms-2">{readonly}</div>
</InputGroup>
<InputGroup>
	<InputGroupText>{$_('prop.tpl.freejump')}</InputGroupText>
	<input
		disabled={readonly}
		class="ms-2"
		type="checkbox"
		bind:checked={template.freejump} />
</InputGroup>
<!--
						<div><span class="fw-bold">Allow set PBO when</span></div>
						{#if readonly}
							{template.pboat === 'STARTER_START'
								? 'At start only'
								: template.pboat === 'STARTER_RUNNING'
								? 'STARTER at running task'
								: template.pboat === 'STARTER_ANY'
								? 'starter at any task'
								: template.pboat === 'ANY_RUNNING'
								? 'Anyone at running task'
								: template.pboat === 'ANY_ANY'
								? 'Anyone at anytime'
								: 'Unknown'}
						{:else}
							<Input type="select" bind:value={template.pboat}>
								<option value="STARTER_START">At start only</option>
								<option value="STARTER_RUNNING">STARTER at running task</option>
								<option value="STARTER_ANY">starter at any task</option>
								<option value="ANY_RUNNING">anyone at running task</option>
								<option value="ANY_ANY">anyone at anytime</option>
							</Input>
						{/if}
						-->
{#if readonly}
	<div>
		<span class="fw-bold">{$_('prop.tpl.callback.endpoint')}:</span>
		<br />
		{template.endpoint}
	</div>
	<div>
		<span class="fw-bold">{$_('prop.tpl.callback.mode')}:</span>
		<br />
		{template.endpointmode}
	</div>
{:else}
	<InputGroup>
		<InputGroupText>{$_('prop.tpl.callback.endpoint')}</InputGroupText>
		<Input
			bind:value={template.endpoint}
			placeholder="https://" />
	</InputGroup>
	<FormGroup>
		<Input
			id="em_all"
			type="radio"
			bind:group={template.endpointmode}
			value="both"
			label={$_('prop.tpl.callback.both')} />
		<Input
			id="em_user"
			type="radio"
			bind:group={template.endpointmode}
			value="user"
			label={$_('prop.tpl.callback.onserver')} />
		<Input
			id="em_server"
			type="radio"
			bind:group={template.endpointmode}
			value="server"
			label={$_('prop.tpl.callback.onclient')} />
	</FormGroup>
{/if}
