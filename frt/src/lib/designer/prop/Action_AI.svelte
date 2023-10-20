<script lang="ts">
	export let nodeInfo;
	export let readonly;
	export let withContext: boolean = true;
	export let prompt = {
		system: '',
		assistants: [''],
		user: '',
	};
</script>

<div class="form-check mt-3">
	<input
		class="form-check-input"
		type="checkbox"
		value=""
		id="flexCheckChecked"
		bind:checked={withContext} />
	<label
		class="form-check-label"
		for="flexCheckChecked">
		Bring Workflow Context Data as assistant message
	</label>
</div>
<div>
	ChatGPT answer will be put into kvar named "chatgpt_answer_{nodeInfo.nodeProps.ACTION.id}"
</div>
<div>
	You may embed any process contextual variable's into any inputbox here with &#123;kvar&#125;
</div>
<div class="input-group mb-3 gap-3">
	<div class="inputgroup-text fixed-width-label">System</div>
	{#if !readonly}
		<textarea
			rows="1"
			class="form-control"
			placeholder="ChatGPT system setting (what AI should be)"
			bind:value={prompt.system} />
	{:else}
		{prompt.system}
	{/if}
</div>
<div class="input-group mb-3 gap-3">
	<div class="inputgroup-text fixed-width-label">User</div>
	{#if !readonly}
		<textarea
			rows="1"
			class="form-control"
			placeholder="ChatGPT user message (question)"
			bind:value={prompt.user} />
	{:else}
		{prompt.user}
	{/if}
</div>
{#each prompt.assistants as assistant, i}
	<div class="input-group mb-3 gap-3">
		<div class="inputgroup-text fixed-width-label">Assistant {i + 1}</div>
		{#if !readonly}
			<textarea
				rows="1"
				class="form-control"
				placeholder="ChatGPT assistant message"
				bind:value={assistant} />
			<div class="inputgroup-text">
				<a
					href={'#'}
					on:click={() => {
						prompt.assistants.splice(i, 1);
						prompt.assistants = prompt.assistants;
					}}>
					<i class="bi bi-x-circle" />
				</a>
			</div>
		{:else}
			{assistant}
		{/if}
	</div>
{/each}
{#if !readonly}
	<div class="input-group mb-3 gap-3">
		<div class="inputgroup-text fixed-width-label">&nbsp;</div>
		<div class="d-flex justify-content-end col">
			<button
				class="btn btn-primary btn-sm"
				on:click={() => {
					prompt.assistants.push('');
					prompt.assistants = prompt.assistants;
				}}>
				Add new assistant
			</button>
		</div>
	</div>
{/if}

<style>
	.fixed-width-label {
		width: 100px; /* You can adjust this width based on your design needs */
		text-align: left; /* Align the text to the left within the given space */
	}
</style>
