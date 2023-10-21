<script lang="ts">
	export let readonly: boolean;
	export let prompt: { system: string; user: string; assistants: string[] };
	export let show: { system: boolean; user: boolean; assistants: boolean } = {
		system: true,
		user: true,
		assistants: true,
	};
</script>

{#if show.system}
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
{/if}
{#if show.user}
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
{/if}
{#if show.assistants}
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
{/if}

<style>
	.fixed-width-label {
		width: 100px; /* You can adjust this width based on your design needs */
		text-align: left; /* Align the text to the left within the given space */
	}
	textarea {
		resize: vertical !important;
	}
</style>
