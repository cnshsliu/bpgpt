<script lang="ts">
	import Prompt from './Action_AI_prompt.svelte';
	export let ai: any;
	export let readonly: boolean;
</script>

<div>
	<ul>
		<li>Ask ChatGPT before work start, the answer will be displayed to user;</li>
		<li>
			A normal usage of 'Pre-work' AI is to provide Decision Support to user, whether he/she should
			approve a process or not, what actions could he/she to take on current task.
		</li>
		<li>What this 'Pre-work' AI could do depends on your question;</li>
		<li>
			The workflow process log is automatically carried to ChatGPT in the format of 'process log:
			...', so you may refer to it by 'process log';
		</li>
		<li>
			You may embed any process contextual variable's into question here with
			&#123;&#123;kvar&#125;&#125;
		</li>
	</ul>
</div>
<div class="form-check mt-3">
	<input
		class="form-check-input"
		type="checkbox"
		disabled={readonly}
		value=""
		id="flexCheckChecked_withwflog"
		bind:checked={ai.pre.enable} />
	<label
		class="form-check-label"
		for="flexCheckChecked_withwflog">
		Enabled Pre-work auto-ChatGPT
	</label>
</div>

{#if ai.pre.enable}
	<div>
		You may embed any process contextual variable's into any inputbox here with
		&#123;&#123;kvar&#125;&#125;
	</div>
	<Prompt
		{readonly}
		prompt={ai.pre.prompt}
		show={{ system: true, user: true, assistants: true }} />
{/if}
