<script lang="ts">
	import { _, date, time } from '$lib/i18n';
	import * as api from '$lib/api';
	import { page } from '$app/stores';
	import { tick } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let preText: string = '';
	export let eid: string;
	export let recentUsers: string[] = [];
	let eidCheckingResult = '';

	let cssClasses = '';

	let check_timer: ReturnType<typeof setTimeout> | null;
	const onInputUser = async function () {
		if (check_timer) clearTimeout(check_timer);
		await tick();
		check_timer = setTimeout(async () => {
			if (eid === '' || eid.trim() === '') {
				eidCheckingResult = '';
			} else {
				let ret = await api.post('check/coworker', { whom: eid }, $page.data.user.sessionToken);
				if (ret.error) {
					cssClasses = 'is-invalid';
					eidCheckingResult = ret.message;
				} else {
					cssClasses = 'valid';
					console.log(ret);
					eidCheckingResult = `${ret.nickname}(${ret.eid})`;
				}
				check_timer = null;
			}
		}, 1000);
	};
</script>

<div class="input-group">
	{#if preText.trim()}
		<div class="input-group-text">{preText}</div>
	{/if}
	<input
		class="form-control {cssClasses}"
		on:input={onInputUser}
		on:change={onInputUser}
		on:blur={onInputUser}
		bind:value={eid} />
	{#if eidCheckingResult.trim()}
		<div class="input-group-text">{eidCheckingResult}</div>
	{/if}
	{#if recentUsers.length > 0}
		<div class="input-group-text">
			<div class="dropdown recent_users_section">
				<button
					class="btn btn-outline-secondary dropdown-toggle"
					type="button"
					data-bs-toggle="dropdown"
					aria-expanded="false">
					{$_('tips.flexible.pickeid')}
				</button>
				<ul class="dropdown-menu">
					{#each recentUsers as aRecentEid}
						<li>
							<a
								class="dropdown-item"
								href={'#'}
								on:click={async (e) => {
									e.preventDefault();
									eid = aRecentEid;
									onInputUser();
								}}>
								{aRecentEid}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}
</div>
