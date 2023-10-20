<script lang="ts">
	import { _ } from '$lib/i18n';
	import { UiSection } from '$lib/Stores';
</script>

{#if $UiSection['show']}
	<div class="input-group">
		<div class="mx-2">
			<div class="form-check">
				<input
					class="form-check-input"
					type="checkbox"
					role="switch"
					id="tag_Checked"
					bind:checked={$UiSection['tag']} />
				<label
					class="form-check-label"
					for="tag_Checked">
					{$_('uisection.tag')}
				</label>
			</div>
		</div>
		<div class="mx-2">
			<div class="form-check">
				<input
					class="form-check-input"
					type="checkbox"
					role="switch"
					id="search_Checked"
					bind:checked={$UiSection['search']} />
				<label
					class="form-check-label"
					for="search_Checked">
					{$_('uisection.search')}
				</label>
			</div>
		</div>
		<div class="mx-2">
			<div class="form-check ">
				<input
					class="form-check-input"
					type="checkbox"
					role="switch"
					id="sort_Checked"
					bind:checked={$UiSection['sort']} />
				<label
					class="form-check-label"
					for="sort_Checked">
					{$_('uisection.sort')}
				</label>
			</div>
		</div>
		<div class="mx-2">
			<div class="form-check">
				<input
					class="form-check-input"
					type="checkbox"
					id="layout_Checked"
					bind:checked={$UiSection['layout']} />
				<label
					class="form-check-label"
					for="layout_Checked">
					{$_('uisection.layout')}
				</label>
			</div>
		</div>
	</div>
{/if}
