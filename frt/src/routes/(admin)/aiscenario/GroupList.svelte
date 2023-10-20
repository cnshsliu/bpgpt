<script lang="ts">
	import { editGroupIndex } from './localStores.js';
	import * as empApi from '$lib/api';
	import { page } from '$app/stores';
	let saving_group = false;
	import { createEventDispatcher } from 'svelte';
	let dispatch = createEventDispatcher();
	export let groups: any[];

	function moveArrayItem(arr: any[], index: number, direction: number) {
		if ((direction === -1 && index === 0) || (direction === 1 && index === arr.length - 1)) {
			// If trying to move the first item up or the last item down, do nothing
			return arr;
		}

		const item = arr[index];
		arr.splice(index, 1); // Remove the item from its current position
		arr.splice(index + direction, 0, item); // Insert it to the new position

		return arr;
	}

	const doSaveGroups = async () => {
		await empApi.post('/caishen/bs/groups/set', { groups }, $page.data.user.sessionToken);
	};
	const editGroup = (index: number) => {
		console.log('editGroup');
		$editGroupIndex = $editGroupIndex === index ? -1 : index;
	};
	const deleteGroup = (index: number) => {
		console.log('deleteGroup');
		groups = groups.filter((_, idx) => idx !== index);
	};
	const insertGroup = (index: number) => {
		console.log('insertGroup');
		groups.splice(index, 0, { id: '', desc: '' });
		groups = groups;
		$editGroupIndex = index;
	};
	const upGroup = (index: number) => {
		console.log('upGroup');
		groups = moveArrayItem(groups, index, -1);
	};
	const downGroup = (index: number) => {
		console.log('downGroup');
		groups = moveArrayItem(groups, index, 1);
	};
</script>

<div>
	<div class="row">
		<div class="col">&nbsp;</div>
		<div class="col-auto">
			<button
				class="btn btn-primary"
				on:click|preventDefault={async () => {
					saving_group = true;
					await doSaveGroups();
					saving_group = false;
				}}>
				Save Groups
				{#if saving_group}
					<i class="bi bi-cloud-arrow-up-fill" />
				{:else}
					<i class="bi bi-cloud-arrow-up" />
				{/if}
			</button>
		</div>
	</div>
	{#each groups as _, idx}
		<div class="row">
			<div class="col">
				{#if $editGroupIndex === idx}
					<input
						type="text"
						placeholder="ID"
						bind:value={groups[idx].id} />
					<input
						type="text"
						placeholder="DESC"
						bind:value={groups[idx].desc} />
					<button
						class="btn btn-primary"
						on:click={() => {
							$editGroupIndex = -1;
						}}>
						Save
					</button>
				{:else}
					{groups[idx].id}
					{groups[idx].desc}
					<a
						href={'#'}
						class="btn m-0 p-0"
						on:click={() => {
							dispatch('doPickGroup', idx);
						}}>
						Pick
					</a>
				{/if}
			</div>
			<div
				class="col-auto"
				on:keydown={null}
				on:click={() => {
					editGroup(idx);
				}}>
				Edit
			</div>
			<div
				class="col-auto"
				on:keydown={null}
				on:click={() => {
					deleteGroup(idx);
				}}>
				Delete
			</div>
			<div
				class="col-auto"
				on:keydown={null}
				on:click={() => {
					insertGroup(idx);
				}}>
				Insert
			</div>
			<div
				class="col-auto"
				on:keydown={null}
				on:click={() => {
					upGroup(idx);
				}}>
				Up
			</div>
			<div
				class="col-auto"
				on:keydown={null}
				on:click={() => {
					downGroup(idx);
				}}>
				Down
			</div>
		</div>
	{/each}
</div>
