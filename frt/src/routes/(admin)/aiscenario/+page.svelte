<script lang="ts">
	import suuid from 'short-uuid';
	import { onMount } from 'svelte';
	import { toast } from '$lib/Toast';
	import { page } from '$app/stores';
	import * as empApi from '$lib/api';
	import { mtcConfirm, mtcConfirmReset } from '$lib/Stores.js';
	import {
		editGroupIndex,
		pickedGroupIndex,
		editScenarioIndex,
		expandedScenarioIndex,
	} from './localStores.js';

	type scenarioType = {
		groupid: string;
		scenid: string;
		content: {
			desc: string;
			model?: string;
			json?: string;
			note?: string;
			system: string;
			characteristics?: string;
			assistant?: string;
			msg: string[];
			caishen: string[];
			icon?: string;
			require?: string;
			acting?: boolean;
			mustask?: string;
			enableuserassistant?: boolean;
			enablekeypoints?: boolean;
			tags?: string[];
		};
	};
	type groupType = {
		id: string;
		desc: string;
	};

	let groups: groupType[] = [];
	let scenarioInGroup: scenarioType[] = [];

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
	const editGroup = (index: number) => {
		console.log('editGroup');
		$editGroupIndex = $editGroupIndex === index ? -1 : index;
	};
	const deleteGroup = (index: number) => {
		console.log('deleteGroup');
		$mtcConfirm = {
			title: '请确认删除动作',
			body: '删除后不可恢复',
			buttons: ['确认'],
			callbacks: [
				async () => {
					mtcConfirmReset();
					groups = groups.filter((_, idx) => idx !== index);
				},
			],
		};
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
	onMount(async () => {
		console.log('Session:', $page.data.user.sessionToken);
		groups = await empApi.post('/caishen/bs/groups/get', {}, $page.data.user.sessionToken);
		console.log('Groups:', groups);
		console.log('picked:', $pickedGroupIndex);
		doPickGroup($pickedGroupIndex);
		// editScenario(1);
		//	doExpandScenario(1);
	});
	const doSaveGroups = async () => {
		console.log('savegroups');
		console.log(groups);
		await empApi.post('/caishen/bs/groups/set', { groups }, $page.data.user.sessionToken);
	};

	const doSaveScenario = async () => {
		console.log('save');
		console.log('Group Index', groups[$pickedGroupIndex]);
		console.log(scenarioInGroup[$editScenarioIndex]);
		await empApi.post(
			'/caishen/bs/scenario/set',
			{ scen: scenarioInGroup[$editScenarioIndex] },
			$page.data.user.sessionToken,
		);
	};

	const doPickGroup = async (idx: number) => {
		$pickedGroupIndex = idx;
		scenarioInGroup = await empApi.post(
			'/caishen/bs/scenarios/get',
			{ groupid: groups[idx].id },
			$page.data.user.sessionToken,
		);

		scenarioInGroup = scenarioInGroup.map((x) => {
			if (x.content.caishen && x.content.caishen.length === 2) {
				x.content.caishen = x.content.caishen;
			} else if (!x.content.caishen) {
				x.content.caishen = ['', ''];
			} else if (x.content.caishen.length === 1) {
				x.content.caishen = [x.content.caishen[0], ''];
			} else if (x.content.caishen.length === 0) {
				x.content.caishen = ['', ''];
			} else if (x.content.caishen.length > 2) {
				x.content.caishen = [x.content.caishen[0], x.content.caishen[1]];
			}

			x.content.note = x.content.note ?? '';
			x.content.assistant = x.content.assistant ?? '';
			x.content.icon = x.content.icon ?? 'caishen';
			x.content.require = x.content.require ?? '';
			x.content.acting = x.content.acting === undefined ? false : x.content.acting;
			x.content.mustask = x.content.mustask ?? '';
			return x;
		});
	};

	const editScenario = (index: number) => {
		console.log('editScenario');
		$editScenarioIndex = $editScenarioIndex === index ? -1 : index;
		if ($editScenarioIndex > -1) $expandedScenarioIndex = -1;
	};
	const deleteScenario = (index: number) => {
		console.log('deleteScenario');
		$mtcConfirm = {
			title: '请确认删除动作',
			body: '删除后不可恢复',
			buttons: ['确认'],
			callbacks: [
				async () => {
					mtcConfirmReset();
					scenarioInGroup = scenarioInGroup.filter((_, idx) => idx !== index);
				},
			],
		};
	};
	const copyScenario = (index: number) => {
		console.log(index);
		if (index < 0 || index >= scenarioInGroup.length) {
			return;
		}
		const itemCopy = { ...scenarioInGroup[index] };
		itemCopy.scenid = suuid.generate();
		scenarioInGroup.splice(index + 1, 0, itemCopy);
		scenarioInGroup = scenarioInGroup;
	};
	const insertScenario = (index: number) => {
		console.log('insertScenario');
		scenarioInGroup.splice(index, 0, {
			groupid: groups[$pickedGroupIndex].id,
			scenid: suuid.generate(),
			content: {
				desc: '',
				system: '___SYSTEM___',
				characteristics: '',
				assistant: '',
				msg: ['Hello'],
				caishen: [],
				icon: 'caishen',
				mustask: '',
				require: '',
				acting: false,
			},
		});
		scenarioInGroup = scenarioInGroup;
		$editScenarioIndex = index;
	};
	const upScenario = (index: number) => {
		console.log('upScenario');
		scenarioInGroup = moveArrayItem(scenarioInGroup, index, -1);
	};
	const downScenario = (index: number) => {
		console.log('downScenario');
		scenarioInGroup = moveArrayItem(scenarioInGroup, index, 1);
	};
	const doExpandScenario = async (index: number) => {
		$expandedScenarioIndex = $expandedScenarioIndex === index ? -1 : index;
		if ($expandedScenarioIndex > -1) $editScenarioIndex = -1;
	};
</script>

{#if groups.length < 1 || $pickedGroupIndex < 0}
	<div>
		<div class="row">
			<div class="col">&nbsp;</div>
			<div class="col-auto">
				<button
					class="btn btn-primary"
					on:click={doSaveGroups}>
					Save Groups
				</button>
			</div>
		</div>
		{#each groups as _, idx}
			<div class="row">
				<div class="col-auto">
					{#if $editGroupIndex === idx}
						<input
							type="text"
							bind:value={groups[idx].id} />
						<input
							type="text"
							bind:value={groups[idx].desc} />
						<button
							class="btn btn-primary"
							on:click={() => {
								$editGroupIndex = -1;
							}}>
							Save
						</button>
					{:else}
						<a
							href={'#'}
							class="btn m-0 p-0"
							on:click={() => {
								doPickGroup(idx);
							}}>
							{groups[idx].desc}
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
					<i class="bi bi-pen" />
				</div>
				<div
					class="col-auto"
					on:keydown={null}
					on:click={() => {
						deleteGroup(idx);
					}}>
					Delelte
					<i class="bi bi-trash" />
				</div>
				<div
					class="col-auto"
					on:keydown={null}
					on:click={() => {
						insertGroup(idx);
					}}>
					Insert
					<i class="bi bi-plus" />
				</div>
				<div
					class="col-auto"
					on:keydown={null}
					on:click={() => {
						upGroup(idx);
					}}>
					Up
					<i class="bi bi-arrow-up" />
				</div>
				<div
					class="col-auto"
					on:keydown={null}
					on:click={() => {
						downGroup(idx);
					}}>
					Down
					<i class="bi bi-arrow-down" />
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="row">
		<div class="col">
			<a
				href={'#'}
				class="kfk-a"
				on:click={() => {
					$pickedGroupIndex = -1;
				}}>
				Back
			</a>
			{groups[$pickedGroupIndex].desc}
		</div>
	</div>
	{#each scenarioInGroup as _, idx}
		<div class="row">
			<div
				class="col-auto clickable"
				class:fs-1={$expandedScenarioIndex === idx || $editScenarioIndex == idx}
				on:keydown={null}
				on:click={() => {
					editScenario(idx);
				}}>
				{scenarioInGroup[idx].content.desc}
			</div>
			<div
				class="col-auto m-0 p-0"
				on:keydown={null}>
				<button
					class="btn m-0 p-0"
					on:click={() => {
						doExpandScenario(idx);
					}}>
					<i class="bi bi-book" />
				</button>
			</div>
			<div
				class="col-auto m-0 p-0"
				on:keydown={null}>
				<button
					class="btn m-0 p-0"
					on:click={() => {
						editScenario(idx);
					}}>
					<i class="bi bi-pen" />
				</button>
			</div>
			<div
				class="col-auto m-0 p-0"
				on:keydown={null}>
				<button
					class="btn m-0 p-0"
					on:click={() => {
						deleteScenario(idx);
					}}>
					<i class="bi bi-trash" />
				</button>
			</div>
			<div
				class="col-auto m-0 p-0"
				on:keydown={null}>
				<button
					class="btn m-0 p-0"
					on:click={() => {
						copyScenario(idx);
					}}>
					<i class="bi bi-plus-circle" />
				</button>
			</div>
			<div
				class="col-auto m-0 p-0"
				on:keydown={null}>
				<button
					class="btn m-0 p-0"
					on:click={() => {
						insertScenario(idx);
					}}>
					<i class="bi bi-plus" />
				</button>
			</div>
			<div
				class="col-auto m-0 p-0"
				on:keydown={null}>
				<button
					class="btn m-0 p-0"
					on:click={() => {
						upScenario(idx);
					}}>
					<i class="bi bi-arrow-up" />
				</button>
			</div>
			<div
				class="col-auto m-0 p-0"
				on:keydown={null}>
				<button
					class="btn m-0 p-0"
					on:click={() => {
						downScenario(idx);
					}}>
					<i class="bi bi-arrow-down" />
				</button>
			</div>
			<div class="col">&nbsp;</div>
		</div>
		{#if $editScenarioIndex === idx}
			<div>ID: {scenarioInGroup[idx].scenid}</div>
			<div class="col-auto">
				<button
					class="btn btn-primary"
					on:click={() => {
						//$editScenarioIndex = -1;
						doSaveScenario().then(() => {
							toast('已保存', 'Success', 'success');
						});
					}}>
					Save Scenarios
				</button>
			</div>
			<div class="ms-3">
				<div class="row">
					Desc:
					<input
						type="text"
						class="form-control"
						bind:value={scenarioInGroup[idx].content.desc} />
				</div>
				<div class="row">
					TAGS:
					<input
						type="text"
						class="form-control"
						bind:value={scenarioInGroup[idx].content.tags} />
				</div>
				<div class="row">
					Model:
					<select
						class="form-control"
						bind:value={scenarioInGroup[idx].content.model}>
						<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
						<option value="gpt-3.5-turbo-16k">gpt-3.5-turbo-16k</option>
					</select>
				</div>
				<div class="row">
					Note:
					<input
						type="text"
						class="form-control"
						bind:value={scenarioInGroup[idx].content.note} />
				</div>
				<div class="row">
					JSON:
					<textarea
						rows="10"
						class="form-control"
						placeholder="如有JSON，则其它配置被忽略，直接使用JSON, 可嵌 usermsg industry bizmodel human"
						bind:value={scenarioInGroup[idx].content.json} />
				</div>
				<div class="row">
					System:
					<textarea
						rows="10"
						class="form-control"
						bind:value={scenarioInGroup[idx].content.system} />
				</div>
				<div class="row">
					Characteristics:
					<textarea
						rows="10"
						class="form-control"
						bind:value={scenarioInGroup[idx].content.characteristics} />
				</div>
				<div class="row">
					Assistant:
					<textarea
						rows="10"
						class="form-control"
						bind:value={scenarioInGroup[idx].content.assistant} />
				</div>
				<div class="row">
					Caishen 0:
					<div class="input-group mb-3">
						<div class="inputgroup-text">0.</div>
						<input
							type="text"
							class="form-control"
							bind:value={scenarioInGroup[idx].content.caishen[0]} />
					</div>
				</div>
				<div class="row">
					Msgs:
					<button
						on:click={() => {
							scenarioInGroup[idx].content.msg.unshift('');
							scenarioInGroup[idx].content.msg = scenarioInGroup[idx].content.msg;
						}}>
						Add
						<i class="bi bi-plus" />
					</button>
					<div>
						{#each scenarioInGroup[idx].content.msg as _, msgIdx}
							<div class="input-group mb-3">
								<div class="inputgroup-text">{msgIdx}.</div>
								<textarea
									rows="10"
									class="form-control"
									bind:value={scenarioInGroup[idx].content.msg[msgIdx]} />
								<button
									on:click={() => {
										scenarioInGroup[idx].content.msg = scenarioInGroup[idx].content.msg.filter(
											(_, idx) => idx !== msgIdx,
										);
									}}>
									<i class="bi bi-trash" />
								</button>
								<button
									on:click={() => {
										scenarioInGroup[idx].content.msg.splice(msgIdx, 0, '');
										scenarioInGroup[idx].content.msg = scenarioInGroup[idx].content.msg;
									}}>
									<i class="bi bi-plus" />
								</button>
								<button
									on:click={() => {
										if (msgIdx === 0) return;
										let tmp = scenarioInGroup[idx].content.msg[msgIdx];
										scenarioInGroup[idx].content.msg[msgIdx] =
											scenarioInGroup[idx].content.msg[msgIdx - 1];
										scenarioInGroup[idx].content.msg[msgIdx - 1] = tmp;
									}}>
									<i class="bi bi-arrow-up" />
								</button>
								<button
									on:click={() => {
										if (msgIdx === scenarioInGroup[idx].content.msg.length - 1) return;
										let tmp = scenarioInGroup[idx].content.msg[msgIdx];
										scenarioInGroup[idx].content.msg[msgIdx] =
											scenarioInGroup[idx].content.msg[msgIdx + 1];
										scenarioInGroup[idx].content.msg[msgIdx + 1] = tmp;
									}}>
									<i class="bi bi-arrow-down" />
								</button>
							</div>
						{/each}
					</div>
				</div>
				<div class="row">
					Caishen 1:
					<div class="input-group mb-3">
						<div class="inputgroup-text">1.</div>
						<input
							type="text"
							class="form-control"
							bind:value={scenarioInGroup[idx].content.caishen[1]} />
					</div>
				</div>
				<div class="row">
					icon:
					<input
						type="text"
						class="form-control"
						bind:value={scenarioInGroup[idx].content.icon} />
				</div>
				<div class="row">
					Mustask:
					<input
						type="text"
						class="form-control"
						bind:value={scenarioInGroup[idx].content.mustask} />
				</div>
				<div class="row">
					Require:
					<input
						type="text"
						class="form-control"
						bind:value={scenarioInGroup[idx].content.require} />
				</div>
				<div class="row">
					Acting:
					<input
						type="text"
						class="form-control"
						bind:value={scenarioInGroup[idx].content.acting} />
				</div>
			</div>
		{:else if $expandedScenarioIndex === idx}
			<div>
				<span class="fs-5 bg-primary">Tags</span>
				: {scenarioInGroup[idx].content.tags}
			</div>
			<div>
				<span class="fs-5 bg-primary">Model</span>
				: {scenarioInGroup[idx].content.model}
			</div>
			<div>
				<span class="fs-5 bg-primary">Note</span>
				: {scenarioInGroup[idx].content.note}
			</div>
			<div>
				<span class="fs-5 bg-primary">JSON</span>
				: {scenarioInGroup[idx].content.json}
			</div>
			<div>
				<span class="fs-5 bg-primary">System</span>
				: {scenarioInGroup[idx].content.system}
			</div>
			<div>
				<span class="fs-5 bg-primary">Characteristics</span>
				: {scenarioInGroup[idx].content.characteristics}
			</div>
			<div>
				<span class="fs-5 bg-primary">Assistant</span>
				: {scenarioInGroup[idx].content.assistant}
			</div>
			<div>
				<span class="fs-5 bg-primary">Msgs</span>
				:
				{#each scenarioInGroup[idx].content.msg as aMsg, mindex}
					<div>{mindex + 1}. {aMsg}</div>
				{/each}
			</div>
			<div>
				<span class="fs-5 bg-primary">Caishen</span>
				:
				{#each scenarioInGroup[idx].content.caishen ?? [] as aMsg, mindex}
					<div>{mindex + 1}. {aMsg}</div>
				{/each}
			</div>
			<div>
				<span class="fs-5 bg-primary">icon</span>
				: {scenarioInGroup[idx].content.icon}
			</div>
			<div>
				<span class="fs-5 bg-primary">Mustask</span>
				: {scenarioInGroup[idx].content.mustask}
			</div>
			<div>
				<span class="fs-5 bg-primary">Require</span>
				: {scenarioInGroup[idx].content.require}
			</div>
			<div>
				<span class="fs-5 bg-primary">Acting</span>
				: {scenarioInGroup[idx].content.acting}
			</div>
		{/if}
	{/each}
{/if}
