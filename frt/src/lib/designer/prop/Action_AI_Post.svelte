<script lang="ts">
	import Prompt from './Action_AI_prompt.svelte';
	export let id: string;
	export let ai: any;
	export let readonly: boolean = true;
</script>

Post work ChatGPT:
<div>
	Automatically ask ChatGPT and store answer into kvar named "chatgpt_post_answer_{id}"
</div>
<div class="form-check mt-3">
	<input
		class="form-check-input"
		type="checkbox"
		value=""
		disabled={readonly}
		id="flexCheckChecked"
		bind:checked={ai.post.enable} />
	<label
		class="form-check-label"
		for="flexCheckChecked">
		Enable post work auto-ChatGPT
	</label>
</div>

{#if ai.post.enable}
	<div>
		You may embed any process contextual variable's into any inputbox here with
		&#123;&#123;kvar&#125;&#125;
	</div>
	<Prompt
		{readonly}
		prompt={ai.post.prompt}
		show={{ system: true, user: true, assistants: true }} />
{/if}
