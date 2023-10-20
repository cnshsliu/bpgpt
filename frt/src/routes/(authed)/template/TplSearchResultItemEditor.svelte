<script lang="ts">
	import { _ } from '$lib/i18n';
	import * as api from '$lib/api';
	import { mtcSession } from '$lib/Stores';
	import { onMount } from 'svelte';
	import { qtb } from '$lib/utils';
	import type { User } from '$lib/types';
	import BadgeWithDel from '$lib/input/BadgeWithDel.svelte';
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
	import { Button, Row, InputGroup } from 'sveltestrap';
	import { page } from '$app/stores';
	import { ClientPermControl } from '$lib/clientperm';
	let user: User = $page.data.user;
	export let rows: any;
	export let row: any;
	export let visi_rds_input: string;
	export let index: any;
	export let desc_input: string = row.desc;
	export let tplid_input: string = row.tplid;
	export let author_input: string = '';
	let tag_input: string = '';
	let copyfromtplid = '';
	export let setFadeMessage: any;
	export let reloadTags: any;
	export let SetFor: any;
	const toggleDiscuss = async (row: any) => {
		return await api.post(
			'comment/toggle',
			{ objtype: 'template', objid: row.tplid },
			$page.data.token,
		);
	};
	const toggleMustHavePbo = async (row: any) => {
		return await api.post(
			'musthavepbo/toggle',
			{ objtype: 'template', objid: row.tplid },
			$page.data.token,
		);
	};

	async function copyDocFrom(copyfromtplid: string, totplid: string) {
		if (ClientPermControl(user.perms, user.eid, 'template', '', 'create') === false) {
			setFadeMessage("You don't have permission");
			return;
		}
		await api.post(
			'template/copyfrom',
			{ fromtplid: copyfromtplid, totplid: totplid },
			$page.data.token,
		);
		setFadeMessage('Success');
	}

	async function setAutostop(tempalte: any) {
		if (ClientPermControl(user.perms, user.eid, 'template', '', 'create') === false) {
			setFadeMessage("You don't have permission");
			return;
		}
		await api.post(
			'template/set/autostop',
			{ tplid: tempalte.tplid, autostop: tempalte.autostop },
			$page.data.token,
		);
		setFadeMessage('Success');
	}

	onMount(async () => {
		if (!$mtcSession.tplIds) {
			$mtcSession.tplIds = [];
		}
		if ($mtcSession.tplIds.length < 1) {
			let tmp = await api.post('template/tplid/list', {}, $page.data.token);
			$mtcSession.tplIds = tmp.map((x: any) => x.tplid);
		}
	});
</script>

{#if Array.isArray(row.tags) && row.tags.length > 0}
	<div
		class="kfk-link"
    role="none"
		on:keydown={() => {}}
		on:keyup={() => {}}
		on:keypress={() => {}}
		on:click={() => {
			if (SetFor.setTagFor !== row.tplid) {
				SetFor.setTagFor = row.tplid;
			} else {
				SetFor.setTagFor = '';
			}
		}}>
		{$_('remotetable.tags')}
		{#each row.tags as tag}
			{#if tag.owner === user.eid}
				<BadgeWithDel
					bind:text={tag.text}
					on:delete={async () => {
						let tags = await api.post(
							'tag/del',
							{ objtype: 'template', objid: row.tplid, text: tag.text },
							$page.data.token,
						);
						row.tags = tags;
						row = row;
						await reloadTags();
					}} />
			{/if}
		{/each}
	</div>
{/if}
{#if SetFor.settingFor === row.tplid && user.perms && ClientPermControl(user.perms, user.eid, 'template', row, 'delete')}
	<div class="card ms-0 border-3 border-primary">
		<div class="card-header">
			<InputGroup>
				<div class="flex-fill">
					{$_('remotetable.template.set.title')}
				</div>
				<Button
					color="primary"
					on:click={(e) => {
						e.preventDefault();
						row.checked = false;
						SetFor.settingFor = '';
						SetFor.setTagFor = '';
						SetFor.setAuthorFor = '';
						SetFor.setDescFor = '';
						SetFor.setWeComBotFor = '';
						SetFor.setVisiFor = '';
						visi_rds_input = '';
					}}>
					{$_('button.closetemplatesetting')}
				</Button>
			</InputGroup>
		</div>
		<div class="card-body">
			<Row>
				<InputGroup>
					<div class="form-floating flex-fill">
						<input
							class="form-control"
							id={'input-tplid-' + index}
							placeholder="Template ID"
							bind:value={tplid_input} />
						<label for={`input-tplid-${index}`}>{$_('remotetable.template.set.tplid')}</label>
					</div>
					<Button
						color="primary"
						on:click={async (e) => {
							e.preventDefault();
							tplid_input = tplid_input.trim();
							let ret = await api.post(
								'template/rename',
								{ fromid: row.tplid, tplid: tplid_input },
								$page.data.token,
							);
							if (ret.error) {
								setFadeMessage(ret.message, 'warning');
							} else {
								setFadeMessage('Success', 'success');
								let oldTplid = row.tplid;
								row.tplid = ret.tplid ? ret.tplid : ret;
								dispatch('rowChanged', row);
								dispatch('tplidChanged', { from: oldTplid, to: row.tplid });
							}
						}}>
						{$_('button.set')}
					</Button>
				</InputGroup>
			</Row>
			<Row>
				<InputGroup>
					<div class="form-floating flex-fill">
						<input
							class="form-control"
							id={'input-desc-' + index}
							placeholder="Description"
							bind:value={desc_input} />
						<label for={`input-desc-${index}`}>{$_('remotetable.template.set.setdesc')}</label>
					</div>
					<Button
						color="primary"
						on:click={async (e) => {
							e.preventDefault();
							desc_input = desc_input.trim();
							let ret = await api.post(
								'template/desc',
								{ tplid: row.tplid, desc: desc_input },
								$page.data.token,
							);
							if (ret.err) {
								setFadeMessage(ret.message, 'warning');
							} else {
								setFadeMessage('Success', 'success');
							}
							row.desc = desc_input;
							rows = rows;
							dispatch('rowChanged', row);
						}}>
						{$_('button.set')}
					</Button>
				</InputGroup>
			</Row>
			<Row>
				<InputGroup>
					<div class="form-floating flex-fill">
						<input
							name={'newtag-' + index}
							class="form-control"
							id={'input-tags-' + index}
							placeholder="New tags"
							bind:value={tag_input}
							on:change={async (e) => {
								e.preventDefault();
								if (tag_input.trim().length > 0) {
									let tags = await api.post(
										'tag/add',
										{ objtype: 'template', objid: row.tplid, text: tag_input.trim() },
										$page.data.token,
									);
									if (tags.error) {
										setFadeMessage(tags.message, 'warning');
									} else {
										row.tags = tags;
										row = row;
										await reloadTags();
										api.removeCacheByPath('template/search');
									}
								}
								tag_input = '';
							}} />
						<label for={`input-tags-${index}`}>
							{$_('remotetable.template.set.settags')}
						</label>
					</div>
					<Button
						color="primary"
						on:click={async (e) => {
							e.preventDefault();
							if (tag_input.trim().length > 0) {
								let tags = await api.post(
									'tag/add',
									{ objtype: 'template', objid: row.tplid, text: tag_input.trim() },
									$page.data.token,
								);
								if (tags.error) {
									setFadeMessage(tags.message, 'warning');
								} else {
									row.tags = tags;
									row = row;
									await reloadTags();
								}
							}
							tag_input = '';
						}}>
						{$_('button.set')}
					</Button>
				</InputGroup>
			</Row>
			<Row>
				<InputGroup>
					<div class="form-floating flex-fill">
						<input
							class="form-control"
							id={'input-owner-' + index}
							placeholder="User ID"
							bind:value={author_input} />
						<label for={`input-owner-${index}`}>{$_('remotetable.template.set.setauthor')}</label>
					</div>
					<Button
						color="primary"
						on:click={async (e) => {
							e.preventDefault();
							author_input = author_input.trim();
							if (author_input.length <= 0) return;
							let ret = await api.post(
								'template/set/author',
								{ tplid: row.tplid, author: author_input },
								$page.data.token,
							);
							if (ret.error) {
								setFadeMessage(ret.message, 'warning');
							} else {
								console.log(JSON.stringify(ret));
								row.author = ret.author;
								row.authorName = ret.authorName;
								row = row;
								dispatch('authorSet', row);
							}
						}}>
						{$_('button.set')}
					</Button>
				</InputGroup>
			</Row>
			<Row>
				<InputGroup>
					<div class="form-floating flex-fill">
						<input
							class="form-control"
							id={'input-visi-pds-' + index}
							placeholder="PDS"
							bind:value={visi_rds_input} />
						<label for={`input-visi-pds-${index}`}>
							{$_('remotetable.template.set.setvisito')}
						</label>
					</div>
					<!-- svelte-ignore missing-declaration -->
					<Button
						color="primary"
						on:click={async (e) => {
							e.preventDefault();
							visi_rds_input = qtb(visi_rds_input);
							//will use temaid=""(no specified team, but may use T:team_name in pds), eid = current user
							let people = await api.post('explain/pds', { pds: visi_rds_input }, $page.data.token);
							console.log(people);
							row.visipeople = people;
							row.checked = true;
							rows[index] = row;
							rows = rows;
						}}>
						{$_('button.check')}
					</Button>
					<Button
						color="secondary"
						on:click={async (e) => {
							e.preventDefault();
							visi_rds_input = qtb(visi_rds_input);
							let res = await api.post(
								'template/setvisi',
								{ tplid: row.tplid, visi: visi_rds_input },
								$page.data.token,
							);
							if (res.error) {
								setFadeMessage(res.message, 'warning');
							} else {
								row.visi = res.visi;
								rows[index] = row;
								rows = rows;
							}
						}}
						disabled={!row.checked}>
						{$_('button.set')}
					</Button>
					<Button
						on:click={async (e) => {
							e.preventDefault();
							SetFor.setVisiFor = '';
							visi_rds_input = '';
							row.visipeople = null;
							let res = await api.post(
								'template/clearvisi',
								{ tplid: row.tplid },
								$page.data.token,
							);
							if (res.error) {
								setFadeMessage(res.message, 'warning');
							} else {
								row.visi = '';
								rows[index] = row;
								rows = rows;
							}
						}}>
						{$_('button.clear')}
					</Button>
				</InputGroup>
			</Row>
			<Row>
				<InputGroup>
					<div class="form-floating flex-fill">
						<select
							class="form-control"
							bind:value={copyfromtplid}>
							<option value="">{$_('remotetable.template.set.selecttocopyfrom')}</option>
							{#each $mtcSession.tplIds as tplid}
								<option value={tplid}>{tplid}</option>
							{/each}
						</select>
					</div>
					<Button
						color="primary"
						on:click={async (e) => {
							e.preventDefault();
							await copyDocFrom(copyfromtplid, row.tplid);
						}}>
						{$_('button.copy')}
					</Button>
				</InputGroup>
			</Row>
			<Row>
				<InputGroup>
					<div class="form-floating flex-fill">
						<input
							class="form-control"
							id={'input-autostop-' + index}
							placeholder="autostop if stale for minutes"
							bind:value={row.autostop} />
						<label for={`input-autostop-${index}`}>
							{$_('remotetable.template.set.autostop')}
						</label>
					</div>
					<Button
						color="primary"
						on:click={async (e) => {
							e.preventDefault();
							await setAutostop(row);
						}}>
						{$_('button.set')}
					</Button>
				</InputGroup>
			</Row>
			<!--Row>
				<InputGroup>
					<div class="form-floating flex-fill">
						<input
							class="form-control"
							id={'input-wecombotkey-' + index}
							placeholder="WeComBot Key"
							bind:value={row.wecombotkey}
						/>
						<label for={`input-wecombotkey-${index}`}>
							{$_('remotetable.template.set.setwecombotkey')}</label
						>
					</div>
					<Button
						color="primary"
						on:click={async (e) => {
							e.preventDefault();
							row.wecombotkey = row.wecombotkey.trim();
							let ret = await api.post(
								'template/set/wecombot',
								{ tplid: row.tplid, key: row.wecombotkey },
								$page.data.token
							);
							if (ret.err) {
								setFadeMessage(ret.message, 'warning');
							} else {
								setFadeMessage('Success', 'success');
							}
							rows = rows;
						}}
					>
						{$_('button.set')}
					</Button>
				</InputGroup>
			</Row -->
			{#if Array.isArray(row.visipeople)}
				<Row>
					{#each row.visipeople as visiperson}
						<div class="text-center">{visiperson.cn}({visiperson.uid})</div>
					{/each}
				</Row>
			{/if}

			{#if row.author === user.eid || user.group === 'ADMIN'}
				<Row>
					<InputGroup>
						<div class="form-check form-switch">
							<input
								class="form-check-input"
								type="checkbox"
								role="switch"
								id="flexSwitchCheckChecked"
								checked={row.allowdiscuss}
								aria-checked={row.allowdiscuss}
								on:change={async (e) => {
									e.preventDefault();
									row.allowdiscuss = await toggleDiscuss(row);
									row = row;
								}} />
							<label
								class="form-check-label"
								for="flexSwitchCheckChecked">
								{$_('remotetable.template.allowdiscuss.' + row.allowdiscuss)}
							</label>
						</div>
						<div class="form-check form-switch ms-5">
							<input
								class="form-check-input"
								type="checkbox"
								role="switch"
								id="allowemptypboCheck"
								checked={row.musthavepbo}
								aria-checked={row.musthavepbo}
								on:change={async (e) => {
									e.preventDefault();
									row.musthavepbo = await toggleMustHavePbo(row);
									row = row;
								}} />
							<label
								class="form-check-label"
								for="allowemptypboCheck">
								{$_('remotetable.template.musthavepbo.' + row.musthavepbo)}
							</label>
						</div>
					</InputGroup>
				</Row>
			{/if}
		</div>
	</div>
{/if}
