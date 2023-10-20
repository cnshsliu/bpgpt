<script lang="ts">
	import { _ } from '$lib/i18n';
	import { mainAreaClass, standaloneTopMenuClass } from '$lib/Stores';
	export let bizname: string;
	export let subaction: string = '';
</script>

<div class={$standaloneTopMenuClass}>
	<nav
		style="--bs-breadcrumb-divider: '>';"
		aria-label="breadcrumb">
		<ol class="breadcrumb">
			<li class="breadcrumb-item">
				<a
					href="/template"
					class="kfk-link">
					{$_('title.template')}
				</a>
			</li>
			<li
				class="breadcrumb-item active"
				aria-current="page">
				{#if subaction}
					<a
						href={`/biz/${bizname}`}
						class="kfk-link">
						{bizname}
					</a>
				{:else}
					{bizname}
				{/if}
			</li>
		</ol>
	</nav>
</div>

<style>
	.satm-float-logo {
		padding-left: 80px;
	}
</style>
