<script lang="ts">
	import Action_AI_Pre from './Action_AI_Pre.svelte';
	import Action_AI_AtWork from './Action_AI_AtWork.svelte';
	import Action_AI_Post from './Action_AI_Post.svelte';
	export let nodeInfo: any;
	export let readonly: boolean;
</script>

<nav class="mt-3">
	<div
		class="nav nav-tabs"
		id="nav-tab"
		role="tablist">
		<button
			class="nav-link active"
			id="nav-pre-tab"
			data-bs-toggle="tab"
			data-bs-target="#nav-pre"
			type="button"
			role="tab"
			aria-controls="nav-pre"
			aria-selected="true">
			Pre-work
		</button>
		<button
			class="nav-link"
			id="nav-atwork-tab"
			data-bs-toggle="tab"
			data-bs-target="#nav-atwork"
			type="button"
			role="tab"
			aria-controls="nav-atwork"
			aria-selected="false">
			At-work
		</button>
		<button
			class="nav-link"
			id="nav-post-tab"
			data-bs-toggle="tab"
			data-bs-target="#nav-post"
			type="button"
			role="tab"
			aria-controls="nav-post"
			aria-selected="false">
			Post-work
		</button>
	</div>
</nav>
<div
	class="tab-content"
	id="nav-tabContent">
	<div
		class="tab-pane fade show active"
		id="nav-pre"
		role="tabpanel"
		aria-labelledby="nav-pre-tab"
		tabindex="0">
		<Action_AI_Pre
			bind:ai={nodeInfo.nodeProps.ACTION.ai}
			{readonly} />
	</div>
	<div
		class="tab-pane fade"
		id="nav-atwork"
		role="tabpanel"
		aria-labelledby="nav-atwork-tab"
		tabindex="0">
		<Action_AI_AtWork
			bind:ai={nodeInfo.nodeProps.ACTION.ai}
			{readonly} />
	</div>
	<div
		class="tab-pane fade"
		id="nav-post"
		role="tabpanel"
		aria-labelledby="nav-post-tab"
		tabindex="0">
		<Action_AI_Post
			bind:id={nodeInfo.nodeProps.ACTION.id}
			bind:ai={nodeInfo.nodeProps.ACTION.ai}
			{readonly} />
	</div>
</div>
