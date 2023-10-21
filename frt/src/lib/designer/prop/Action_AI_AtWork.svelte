<script lang="ts">
	import Prompt from './Action_AI_prompt.svelte';
	export let ai: any;
	export let readonly: boolean;
</script>

<div class="mt-3">
	<ul>
		<li>User can chat on the current process</li>
		<li>as well as the PBO files</li>
	</ul>
</div>

<div class="form-check">
	<input
		class="form-check-input"
		type="checkbox"
		disabled={readonly}
		value=""
		id="flexCheckChecked_chatAtWork"
		bind:checked={ai.atwork.enable} />
	<label
		class="form-check-label"
		for="flexCheckChecked_chatAtWork">
		Enable at-work ChatGPT
	</label>
</div>

{#if ai.atwork.enable}
	<div>
		You may embed any process contextual variable's into any inputbox here with
		&#123;&#123;kvar&#125;&#125;
	</div>
	<Prompt
		{readonly}
		prompt={ai.atwork.prompt}
		show={{ system: true, user: false, assistants: true }} />
{/if}
