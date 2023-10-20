<script lang="ts">
	import { standaloneTopMenuClass, pageName } from '$lib/Stores';
	import { menuReloadRecent } from '$lib/menu/MenuData';
	import type { PageData } from './$types';
	import { mtcSession } from '$lib/Stores';
	import { menuMode } from '$lib/menu/MenuData';
	export let data: PageData;
	$: ({ user } = data);

	import { _ } from '$lib/i18n';
	import { API_SERVER } from '$lib/Env';
	import type { User, Template, Team, KsTpl } from '$lib/types';
	import ErrorNotify from '$lib/ErrorNotify.svelte';
	import AniIcon from '$lib/AniIcon.svelte';
	import { filterStorage } from '$lib/mtcLocalStores';
	import { setFadeMessage } from '$lib/Notifier';
	import { ClientPermControl } from '$lib/clientperm';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { title } from '$lib/title';
	import * as api from '$lib/api';
	import { NavLink, NavItem, Dropdown, DropdownToggle, DropdownMenu, Icon } from 'sveltestrap';
	import KShareForm from '$lib/KShareForm.svelte';
	import { onMount } from 'svelte';
	import { enhance } from '$lib/form';
	let { template, tplid, tpl_mode, scenarios, industries } = $page.data;

	$title = template.tplid;
	let Designer: any;
	let theDesigner: any;
	let readonly = tpl_mode !== 'edit';
	let recentTemplates: string[] = [];
	let recentTeams = [];
	let showNodeId = false;
	let newTplId = '';
	let oldTplId = '';
	let ksable = false;

	interface hasTplid {
		tplid: string;
		searchable: boolean;
	}
	const saveOneRecentTemplate = function (template: hasTplid) {
		if (template.searchable === false) return;
		let tplid = template.tplid;
		if (tplid === null || tplid === undefined || tplid === '') return;
		let tmp = recentTemplates.indexOf(tplid);
		if (tmp > -1) {
			recentTemplates.splice(tmp, 1);
		}
		recentTemplates.unshift(tplid);
		if (recentTemplates.length > 10) {
			recentTemplates.splice(10);
		}
		localStorage.setItem('recentTemplates', JSON.stringify(recentTemplates));
		recentTemplates = recentTemplates;
		$menuReloadRecent = true;
	};

	onMount(async () => {
		$pageName = tplid;
		const module = await import('$lib/designer/Designer.svelte');
		Designer = module.default;
		if (localStorage) {
			recentTemplates = JSON.parse(localStorage.getItem('recentTemplates') ?? JSON.stringify([]));
			recentTeams = JSON.parse(localStorage.getItem('recentTeams') ?? JSON.stringify([]));
			saveOneRecentTemplate(template);
		}

		//过去在服务端检查，可以使用kshare功能，有两个条件：一是必须是管理员，二是当面用户的domain在允许的domain中
		//这样非常麻烦，因为需要前置打开domain是否允许，应该让所有domain缺省都能分享，只有不能分享的再关闭
		let tsadmin = await api.post('kshare/able', {}, user.sessionToken);
		if (tsadmin.ksable) {
			ksable = true;
		}
	});

	let urls = {
		create: `${API_SERVER}/template/create`,
		rename: `${API_SERVER}/template/rename`,
		copyto: `${API_SERVER}/template/copyto`,
	};

	export let form_status: Record<string, boolean> = {
		create: false,
		search: false,
		sort: false,
		export: false,
		rename: false,
		copyto: false,
		delete: false,
		start: false,
		kshare: false,
	};

	export let form_name = '';
	export let export_to_filename = template.tplid;

	function hide_all_form() {
		Object.keys(form_status).forEach((key) => {
			form_status[key] = false;
		});
		form_name = '';
		theDesigner.documentEventOn();
	}

	function showForm(what: string) {
		hide_all_form();
		form_status[what] = true;
		form_name = what;
		theDesigner.documentEventOff();
	}

	async function change_mode(what: string) {
		tpl_mode = what;
		readonly = tpl_mode === 'read';
		goto(`/template/${template.tplid}&${tpl_mode}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true,
		});
		await theDesigner.changeViewMode(tpl_mode);
	}

	async function startIt() {
		goto(`/template/${template.tplid}&${tpl_mode}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true,
		});
		await theDesigner.changeViewMode(tpl_mode);
	}

	//$: readonly = tpl_mode === 'read';
	function show_delete_template_modal() {
		hide_all_form();
	}

	function delete_template() {
		hide_all_form();
		setTimeout(async () => {
			let ret = await api.post(
				'template/delete/by/tplid',
				{ tplid: template.tplid },
				user.sessionToken,
			);
			if (ret.error) {
				setFadeMessage(ret.message);
			} else {
				await api.removeCacheByPath('template/search');
				goto('/template', { replaceState: false });
			}
		}, 1);
	}

	function removeElementsByClass(className: string) {
		const elements = document.getElementsByClassName(className);
		while (elements.length > 0) {
			elements[0].parentNode?.removeChild(elements[0]);
		}
	}

	function export_template() {
		if (export_to_filename.endsWith('.xml'))
			export_to_filename = export_to_filename.substring(0, export_to_filename.lastIndexOf('.xml'));
		api.post('template/download', { tplid: template.tplid }, user.sessionToken).then((response) => {
			const url = window.URL.createObjectURL(new Blob([response as unknown as BlobPart]));
			removeElementsByClass('tempLink');
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute('download', `${export_to_filename}.xml`); //or any other extension
			link.setAttribute('class', 'tempLink');
			document.body.appendChild(link);
			//点击这个临时连接实现内容下载
			link.click();
			hide_all_form();
		});
	}

	async function viewInstanceTemplate(wfid: string) {
		let payload = { wfid: wfid };
		let ret = await api.post('workflow/dump/instemplate', payload, user.sessionToken);
		goto(`/template/${wfid}_instemplate&read`);
		$title = wfid + '_instemplate';
		return;
	}

	const renameTemplate = async (e: Event) => {
		e.preventDefault();
		let ret = await api.post(
			'template/rename',
			{ fromid: oldTplId, tplid: newTplId },
			user.sessionToken,
		);
		if (ret.error) {
			if (ret.error === 'ALREADY_EXIST') {
				setFadeMessage('同名模板已存在, 请重新录入', 'warning');
			} else {
				setFadeMessage(ret.message, 'warning');
			}
		} else {
			await api.removeCacheByPath('template/search');
			form_status['rename'] = false;
			hide_all_form();
			//await theDesigner.setTemplateId(ret);
			goto(`/template/${ret.tplid}&${tpl_mode}`, {
				replaceState: true,
				keepFocus: true,
				noScroll: true,
			});
			await theDesigner.loadTemplate(ret, tpl_mode);
		}
	};
	const copyTemplate = async (e: Event) => {
		e.preventDefault();
		let ret = await api.post(
			'template/copyto',
			{ fromid: oldTplId, tplid: newTplId },
			user.sessionToken,
		);
		if (ret.error) {
			if (ret.error === 'ALREADY_EXIST') {
				setFadeMessage($_('tpl.copy_duplicated', { values: { tplid: newTplId } }), 'warning');
			} else {
				setFadeMessage(ret.message, 'warning');
			}
		} else {
			await api.removeCacheByPath('template/search');
			template = ret;
			form_status['copyto'] = false;
			$title = template.tplid;
			goto(`/template/${template.tplid}&${tpl_mode}`, {
				replaceState: true,
				noScroll: true,
				keepFocus: true,
			});
			setFadeMessage($_('tpl.copy_successed', { values: { tplid: newTplId } }), 'success');
			//await theDesigner.loadTemplate(template.tplid, tpl_mode);
		}
		hide_all_form();
	};

	let isPreview: boolean = template?.tplid?.startsWith('preview_');
</script>

<svelte:head>
	<title>{template.tplid} • Template</title>
</svelte:head>
{#if template.tplid === 'Not Found'}
	{#if $mtcSession.wfid}
		<ErrorNotify
			title="Original Template not Found"
			subtitle={`${tplid}`}
			info={`
				does not exist.
					Seems like you are trying to view the ORIGINAL TEMPLATE of a workflow ${$mtcSession.wfid},
					however, the ORIGINAL TEMPLATE of this workflow might have been deleted.
					you may view the INSTANCE TEMPLATE of this workflow instead`}
			btnTitle="View Instance Template Instead"
			callback={() => {
				viewInstanceTemplate($mtcSession.wfid);
			}} />
	{:else}
		<ErrorNotify
			title="Error Found"
			subtitle="Template not found"
			info={`Template ${tplid} does not exist`}
			btnTitle="Back"
			callback={() => {
				goto('/template');
			}} />
	{/if}
{:else}
	<!-- not equals NOT_FOUND -->
	{#if isPreview === false}
		<div class={`designer-topmenu ${$standaloneTopMenuClass}`}>
			<div class="hstack gap-1 nav">
				<NavLink
					class="kfk-link kfk-light"
					on:click={() => {
						theDesigner.showTplProp();
					}}>
					<AniIcon
						icon="app"
						ani="aniShake" />
					{$_('tpl.prop')}
				</NavLink>
				{#if template.ins === false}
					{#if ClientPermControl(user.perms, user.eid, 'template', template, 'update')}
						<NavLink
							class="kfk-link kfk-light"
							on:click={async () => {
								hide_all_form();
								if (readonly) {
									await change_mode('edit');
								} else {
									await change_mode('read');
								}
							}}>
							<AniIcon
								icon={readonly ? 'pen' : 'eye'}
								ani="aniShake" />
							{readonly ? $_('tpl.editit') : $_('tpl.viewit')}
						</NavLink>
					{:else}
						<NavLink disabled>
							<Icon name={readonly ? 'pen' : 'eye'} />
							{readonly ? $_('tpl.editit') : $_('tpl.viewit')}
						</NavLink>
					{/if}
					{#if ClientPermControl(user.perms, user.eid, 'workflow', '', 'create')}
						<NavLink
							class="kfk-link kfk-light"
							on:click={() => {
								// showForm('start');
								goto(`/template/start?tplid=${template.tplid}`);
							}}>
							<AniIcon
								icon="hypnotize"
								ani="aniSpin" />
							{$_('tpl.startit')}
						</NavLink>
					{:else}
						<NavLink disabled>
							<Icon name="hypnotize" />
							{$_('tpl.startit')}
						</NavLink>
					{/if}
					<NavLink
						class="kfk-link kfk-light"
						on:click={() => {
							goto(`/biz/${template.tplid}`);
						}}>
						<AniIcon
							icon="arrow-left-circle"
							ani="aniShake" />
						{$_('button.gotobiz')}
					</NavLink>
				{/if}
				<Dropdown class="ms-auto">
					<DropdownToggle
						caret
						id="menu001"
						data-toggle="dropdown"
						class="m-0 py-0 border-0 bg-transparent">
						{$_('tpl.dropdown')}
					</DropdownToggle>
					<DropdownMenu>
						{#if ClientPermControl(user.perms, user.eid, 'template', template, 'create')}
							<NavLink
								class="kfk-link"
								data-toggle="dropdown"
								on:click={() => {
									showForm('create');
									document.getElementById('menu001')?.click();
								}}>
								<AniIcon
									icon="plus-circle"
									ani="aniShake" />
								{$_('tpl.new')}
							</NavLink>
						{:else}
							<NavLink disabled>
								<Icon name="plus-circle" />
								{$_('tpl.new')}
							</NavLink>
						{/if}
						<NavLink
							class="kfk-link"
							on:click={() => {
								showForm('export');
								document.getElementById('menu001')?.click();
							}}>
							<AniIcon
								icon="cloud-download"
								ani="aniShake" />
							{$_('tpl.export')}
						</NavLink>
						{#if ClientPermControl(user.perms, user.eid, 'template', template, 'create')}
							<NavLink
								class="kfk-link"
								on:click={() => {
									oldTplId = template.tplid;
									newTplId = template.tplid;
									showForm('copyto');
									document.getElementById('menu001')?.click();
								}}>
								<AniIcon
									icon="files"
									ani="aniShake" />
								{$_('tpl.copyto')}
							</NavLink>
						{:else}
							<NavLink
								class="kfk-link"
								disabled>
								<Icon name="files" />
								{$_('tpl.copyto')}
							</NavLink>
						{/if}
						{#if template.ins === false}
							{#if ClientPermControl(user.perms, user.eid, 'template', template, 'update')}
								<NavLink
									class="kfk-link"
									on:click={() => {
										oldTplId = template.tplid;
										newTplId = template.tplid;
										showForm('rename');
										document.getElementById('menu001')?.click();
									}}>
									<AniIcon
										icon="input-cursor-text"
										ani="aniShake" />
									{$_('tpl.rename')}
								</NavLink>
							{:else}
								<NavLink
									class="kfk-link"
									disabled>
									<Icon name="input-cursor-text" />
									{$_('tpl.rename')}
								</NavLink>
							{/if}
						{/if}
						{#if ksable}
							<NavLink
								class="kfk-link"
								on:click={() => {
									showForm('kshare');
									document.getElementById('menu001')?.click();
								}}>
								<AniIcon
									icon="share"
									ani="aniShake" />
								{$_('tpl.kshare')}
							</NavLink>
						{/if}
					</DropdownMenu>
				</Dropdown>
				<Dropdown class="">
					<DropdownToggle
						caret
						id="menu002"
						class="m-0 py-0 bg-transparent border-0">
						{$_('tpl.view')}
					</DropdownToggle>
					<DropdownMenu>
						<NavItem class="kfk-link">
							<input
								type="checkbox"
								class="form-check-input"
								bind:checked={showNodeId}
								on:change={async () => {
									await theDesigner.showNodeIdDIV(showNodeId);
									document.getElementById('menu002')?.click();
								}} />
							{$_('designer.showid')}
						</NavItem>
						<NavItem class="kfk-link">
							<input
								type="checkbox"
								class="form-check-input"
								bind:checked={$filterStorage.curve}
								on:change={async () => {
									await theDesigner.setLineCurve($filterStorage.curve);
									document.getElementById('menu002')?.click();
								}} />
							{$_('designer.curve')}
						</NavItem>
					</DropdownMenu>
				</Dropdown>
			</div>
			<div id="tpmenu_op_area">
				{#if form_status.export}
					<div class="hstack gap-2 w-75 m-2 mb-3">
						<div class="input-group me-auto">
							<span class="input-group-text">
								{$_('tpl.form.exportto')}
							</span>
							<input
								class="form-control"
								type="text"
								name="exorttoname"
								placeholder="Export to file"
								bind:value={export_to_filename}
								autocomplete="off" />
						</div>
						<button
							type="button"
							class="btn btn-small btn-primary my-0 py-0  text-nowrap"
							on:keyup={null}
							on:click={(e) => {
								e.preventDefault();
								export_template();
							}}
							color="primary">
							{$_('button.export')}
						</button>
						<div class="vr">&nbsp;</div>
						<button
							type="button"
							class="btn btn-small btn-outline-secondary my-0 py-0  text-nowrap"
							on:keyup={null}
							on:click={(e) => {
								e.preventDefault();
								hide_all_form();
							}}
							color="secondary">
							{$_('button.cancel')}
						</button>
					</div>
				{/if}

				{#if form_status.create}
					<form
						action={urls.create}
						method="post"
						use:enhance={{
							token: user.sessionToken,
							result: async (res, form) => {
								const created = await res.json();
								if (created.error) {
									console.error(created.error);
									let errmsg = created.errMsg;
									if (errmsg.indexOf('MongoError: E11000 duplicate key error') >= 0) {
										errmsg = '同名模板已存在, 请重新录入';
									}
									setFadeMessage(errmsg, 'warning');
								} else {
									template = created;
									goto(`/template/${template.tplid}&${tpl_mode}`, {
										replaceState: false,
										keepFocus: true,
									});
									await theDesigner.loadTemplate(template, tpl_mode);
									form_status['create'] = false;
									form.reset();
								}
								hide_all_form();
							},
						}}>
						<div class="hstack gap-2 w-75 m-2">
							<div class="input-group me-auto">
								<span class="input-group-text">
									{$_('tpl.form.newtplname')}
								</span>
								<input
									class="form-control"
									name="tplid"
									aria-label="Create template"
									placeholder="New template name"
									autocomplete="off" />
							</div>
							<button
								type="submit"
								class="btn btn-small btn-primary my-0 py-0  text-nowrap">
								{$_('button.create')}
							</button>
							<div class="vr">&nbsp;</div>
							<button
								type="button"
								class="btn btn-small btn-outline-secondary my-0 py-0  text-nowrap"
								on:keyup={null}
								on:click={(e) => {
									e.preventDefault();
									hide_all_form();
								}}>
								{$_('button.cancel')}
							</button>
						</div>
					</form>
				{/if}

				{#if form_status.rename}
					<div class="hstack gap-2 w-75 m-2">
						<div class="input-group me-auto">
							<span class="input-group-text">
								{$_('tpl.form.renameto')}
							</span>
							<input
								class="form-control"
								type="text"
								name="tplid"
								placeholder="Rename: new template name"
								bind:value={newTplId}
								autocomplete="off" />
						</div>
						<button
							type="button"
							class="btn btn-small btn-primary my-0 py-0  text-nowrap"
							on:keyup={null}
							on:click={renameTemplate}>
							{$_('button.rename')}
						</button>
						<div class="vr">&nbsp;</div>
						<button
							type="button"
							class="btn btn-small btn-outline-secondary my-0 py-0  text-nowrap"
							on:keyup={null}
							on:click={(e) => {
								e.preventDefault();
								hide_all_form();
							}}>
							{$_('button.cancel')}
						</button>
					</div>
				{/if}

				{#if form_status.copyto}
					<div class="hstack gap-2 w-75 m-2">
						<div class="input-group me-auto">
							<span class="input-group-text">
								{$_('tpl.form.copyto')}
							</span>
							<input
								class="form-control"
								type="text"
								name="tplid"
								placeholder="New template name"
								bind:value={newTplId}
								autocomplete="off" />
						</div>
						<button
							type="button"
							class="btn btn-small btn-primary my-0 py-0  text-nowrap"
							on:keyup={null}
							on:click={copyTemplate}>
							{$_('button.copy')}
						</button>
						<div class="vr">&nbsp;</div>
						<button
							type="button"
							class="btn btn-small btn-outline-secondary my-0 py-0  text-nowrap"
							on:keyup={null}
							on:click={(e) => {
								e.preventDefault();
								hide_all_form();
							}}>
							{$_('button.cancel')}
						</button>
					</div>
				{/if}

				{#if form_status.kshare}
					<KShareForm
						tplid={template.tplid}
						token={user.sessionToken}
						{scenarios}
						{industries}
						on:cancel={() => {
							hide_all_form();
						}} />
				{/if}
			</div>
		</div>
	{/if}

	<svelte:component
		this={Designer}
		bind:this={theDesigner}
		{template}
		{tpl_mode}
		{isPreview}
		on:readInProp={async () => {
			await change_mode('read');
		}}
		on:editInProp={async () => {
			await change_mode('edit');
		}} />
{/if}

<style>
	.satm-float-logo {
		padding-left: 80px;
	}
</style>
