<script lang="ts">
	import { pageName } from '$lib/Stores';
	import { Button, Container, Row, Col, InputGroup, Input } from 'sveltestrap';
	import { _ } from '$lib/i18n';
	import { page } from '$app/stores';
	import { mtcSession } from '$lib/Stores';
	import type { KFKError, User, EmpResponse } from '$lib/types';
	import AniIcon from '$lib/AniIcon.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as api from '$lib/api';
	import { API_SERVER } from '$lib/Env';
	interface pondFile {
		serverId: string;
		wf: any;
		pondfile: any;
	}
	let files: pondFile[];

	async function fixPondfile() {
		await api.post('fix', {}, $page.data.user.sessionToken);
	}

	async function deleteFile(serverId: string) {
		let res = await api.post(
			'files/mine/delete',
			{ serverId: serverId },
			$page.data.user.sessionToken,
		);
		if (res.success) {
			files = files.filter((x: pondFile) => x.serverId !== serverId);
			files = files ?? [];
		}
	}

	function downloadFile(serverId: string, realName: string, mode = 'download') {
		fetch(`${API_SERVER}/files/mine/viewer/${serverId}`, {
			headers: {
				Authorization: $page.data.user.sessionToken,
			},
		})
			.then((res) => {
				return res.blob();
			})
			.then((data) => {
				var a = document.createElement('a');
				a.href = window.URL.createObjectURL(data);
				if (mode === 'download') {
					a.download = realName;
				} else if (mode === 'newtab') {
					a.name = realName;
					a.target = '_blank';
				}
				a.click();
			});
	}

	const loadData = async (q = '', wf = '') => {
		files = await api.post('files/mine', { q: q, wf: wf }, $page.data.user.sessionToken);
		if ((files as unknown as KFKError).error) {
			console.log(files);
			files = [];
		}
	};

	const onSearch = async (e: Event | undefined = undefined) => {
		e && e.preventDefault();
		await loadData($mtcSession.q, $mtcSession.whichwf);
	};

	onMount(async () => {
		$pageName = $_('setting.tab.myfiles');
		await loadData();
	});
</script>

<Container class="mt-3">
	<Row>
		<nav aria-label="breadcrumb">
			<ol class="breadcrumb">
				<li class="breadcrumb-item kfk-tag">
					<a
						class="kfk-link"
						href={'#'}
						on:click={() => {
							goto('/settings');
						}}>
						{$_('navmenu.settings')}
					</a>
				</li>
				<li
					class="breadcrumb-item active"
					aria-current="page">
					{$_('setting.myfiles.nav')}
				</li>
			</ol>
		</nav>
	</Row>
	<Row class="mb-2">
		<Col>
			<InputGroup>
				<div class="form-input">
					<Input
						class="form-input"
						name="searchq"
						bind:value={$mtcSession.q}
						id="searchq"
						placeholder="Search by file name" />
				</div>
				<Button on:click={onSearch}><i class="bi bi-search" /></Button>
			</InputGroup>
			{#if $mtcSession.whichwf}
				In worlflow: {$mtcSession.whichwf}
				<a
					class="kfk-link kfk-tag"
					href={'#'}
					on:click|preventDefault={() => {
						delete $mtcSession.whichwf;
						onSearch();
					}}>
					Clear
				</a>
			{/if}
		</Col>
	</Row>
	<Row cols={2}>
		{#each files ?? [] as file}
			<Col>
				<div class="card mt-2">
					<div class="card-header fs-4 fw-bolder">
						{file.wf
							? file.wf.attachments.realName
							: file.pondfile
							? file.pondfile.realName
							: file.serverId}
					</div>
					<div class="card-body">
						<div class="card-title kfk-tag">
							{#if file.wf}
								use in: <a href="/workflow/{file.wf.wfid}">{file.wf.wftitle}</a>
								<span>
									<a
										class="kfk-link"
										href={'#'}
										on:click|preventDefault={() => {
											$mtcSession.whichwf = file.wf.wfid;
											onSearch();
										}}>
										<AniIcon
											icon="filter-circle"
											ani="aniShake" />
										{$_('setting.myfiles.filter')}
									</a>
								</span>
							{:else}
								Spare file
							{/if}
						</div>
						<p class="card-text">
							<span class="kfk-tag">
								<a
									class="kfk-link"
									href={'#'}
									on:click|preventDefault={() => {
										downloadFile(
											file.serverId,
											file.wf
												? file.wf.attachments.realName
												: file.pondfile
												? file.pondfile.realName
												: file.serverId,
											'newtab',
										);
									}}>
									<AniIcon
										icon="box-arrow-up-right"
										ani="aniShake" />
									{$_('setting.myfiles.view')}
								</a>
							</span>
							<span class="kfk-tag">
								<a
									href={'#'}
									class="kfk-link"
									on:click|preventDefault={() => {
										downloadFile(
											file.serverId,
											file.wf
												? file.wf.attachments.realName
												: file.pondfile
												? file.pondfile.realName
												: file.serverId,
											'download',
										);
									}}>
									<AniIcon
										icon="download"
										ani="aniShake" />
									{$_('setting.myfiles.download')}
								</a>
							</span>
							{#if !file.wf}
								<span class="kfk-tag">
									<a
										href={'#'}
										class="kfk-link"
										on:click|preventDefault={() => {
											deleteFile(file.serverId);
										}}>
										<AniIcon
											icon="trash"
											ani="aniShake" />
										{$_('setting.myfiles.delete')}
									</a>
								</span>
							{/if}
						</p>
					</div>
				</div>
			</Col>
		{/each}
	</Row>
</Container>
{#if $page.data.user.group === 'ADMIN'}
	<Button on:click={fixPondfile}>FixPondFile</Button>
{/if}
