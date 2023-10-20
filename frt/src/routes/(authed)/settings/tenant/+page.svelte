<script lang="ts">
	import { pageName } from '$lib/Stores';
	import { MTC_SERVER } from '$lib/Env';
	import QRCode from 'qrcode';
	import {
		Button,
		Icon,
		Container,
		Row,
		InputGroup,
		InputGroupText,
		Input,
		Card,
		CardBody,
		CardHeader,
		CardSubtitle,
		CardText,
		CardTitle,
	} from 'sveltestrap';
	import QtoBInput from '$lib/QuanJiaoToBanJiaoInput.svelte';
	import AniIcon from '$lib/AniIcon.svelte';
	import { invalidateAll } from '$app/navigation';
	import TimeZone from '$lib/Timezone';
	import { page } from '$app/stores';
	import { mtcSession } from '$lib/Stores';
	import { TagStorage } from '$lib/mtcLocalStores';
	import { setFadeMessage } from '$lib/Notifier';
	import { onMount } from 'svelte';
	import TenantMenu from '$lib/tenantMenu.svelte';
	import { _ } from '$lib/i18n';
	import type { EmpResponse, MtcTags } from '$lib/types';
	import { post } from '$lib/utils';
	import * as api from '$lib/api';
	import { toast } from '$lib/Toast';
	import type { PageData } from './$types';
	export let data: PageData;
	export let errors: any;
	let { user } = data;
	$: ({ user } = data);

	let myorg: any = {
		orgname: '',
		orgtheme: '',
		orgtimezone: '',
		orgleveltags: '',
		owner: '',
	};

	let orgname = '';
	let orgtheme = '';
	let orgtimezone = '';
	let orgleveltags = '';
	let orgchartadmin = '';
	let orgchartadmin_array: { eid: string; cn: string }[] = [];
	let currentAdmin = '';

	let generatedJoinCode = '';
	let userDefinedJoinCode = '';
	let in_progress: boolean;

	let password_for_admin = '';
	let set_group_to = '';
	let set_password_to = '';
	let tzArray = TimeZone.getTimeZoneArray();
	let invitation: string;

	async function refreshMyOrg() {
		myorg = await api.post('tnt/my/org', {}, $page.data.user.sessionToken);
		$mtcSession.org = myorg;
		console.log(myorg);
		orgname = myorg.orgname;
		orgtheme = myorg.css;
		orgtimezone = myorg.timezone;
		orgleveltags = myorg.tags;
		if (myorg && myorg.joinapps && Array.isArray(myorg.joinapps)) {
			for (let i = 0; i < myorg.joinapps.length; i++) {
				myorg.joinapps[i].checked = true;
				myorg.joinapps[i].eid = myorg.joinapps[i].account;
			}
		}
		await refreshMyOrgChartAdmins();
	}

	const refreshMyOrgChartAdmins = async () => {
		let res = await api.post('orgchart/list/admin', {}, user.sessionToken);
		if (res.error) {
			console.log(res.message);
			orgchartadmin_array = [];
		} else {
			orgchartadmin_array = res;
		}
	};

	let orgchartrelationtest_conf = {
		show: { leader: true, query: true },
		useThisQuery: null,
		useThisLeader: null,
		lstr: '',
		qstr: '',
	};

	async function setMyTenantName() {
		in_progress = true;

		let ret = await api.post('tnt/set/name', { orgname: orgname }, $page.data.user.sessionToken);
		if (ret.error) {
			setFadeMessage(ret.message, 'warning');
		} else {
			//eslint-disable-next-line
			if (ret.orgname) {
				setFadeMessage('Orgniazation name is set succesfully', 'success');
				const response = (await post(`/auth/refresh`, {})) as unknown as EmpResponse;

				if (response.user) {
					console.log(response.user);
					invalidateAll();
				}
			} else {
				setFadeMessage('Error', 'warning');
			}
		}

		in_progress = false;
	}

	async function setMyTenantTheme() {
		in_progress = true;

		let ret = await api.post('tnt/set/theme', { css: orgtheme }, $page.data.user.sessionToken);
		if (ret.error) {
			setFadeMessage(ret.message, 'warning');
		} else {
			//eslint-disable-next-line
			if (ret.css) {
				console.log(ret.css);
				setFadeMessage('Orgniazation theme is set succesfully', 'success');
				const response = (await post(`/auth/refresh`, {})) as unknown as EmpResponse;

				if (response.user) {
					console.log(response.user);
					invalidateAll();
				}
			} else {
				setFadeMessage('Error', 'warning');
			}
		}

		in_progress = false;
	}

	async function setMyTenantTimezone() {
		in_progress = true;

		let ret = await api.post(
			'tnt/set/timezone',
			{ timezone: orgtimezone },
			$page.data.user.sessionToken,
		);
		if (ret.error) {
			setFadeMessage(ret.message, 'warning');
		} else {
			//eslint-disable-next-line
			if (ret.timezone) {
				setFadeMessage('Orgniazation timezone is set succesfully', 'success');
				const response = (await post(`/auth/refresh`, {})) as unknown as EmpResponse;

				if (response.user) {
					console.log(response.user);
					invalidateAll();
				}
			} else {
				setFadeMessage('Error', 'warning');
			}
		}

		in_progress = false;
	}

	async function setMyTenantOrgLevelTags() {
		in_progress = true;

		let ret = await api.post(
			'tnt/set/tags',
			//{ tags: orgleveltags, password: password_for_admin },
			{ tags: orgleveltags },
			$page.data.user.sessionToken,
		);
		if (ret.error) {
			setFadeMessage(ret.message, 'warning');
		} else {
			setFadeMessage('Success', 'success');
			orgleveltags = ret.tags;
			myorg.tags = ret.tags;
			const allTags: MtcTags = $TagStorage;
			allTags.org = ret.tags;
			TagStorage.set(allTags);
		}

		in_progress = false;
	}

	async function generateJoinCode() {
		let res = await api.post('tnt/joincode/new', {}, $page.data.user.sessionToken);
		if (res.error) {
			setFadeMessage(res.message, 'warning');
		} else if (res.joincode) {
			generatedJoinCode = res.joincode;
			myorg.joincode = generatedJoinCode;
		}
	}

	async function setUserDefinedJoinCode() {
		let res = await api.post(
			'tnt/set/joincode',
			{ joincode: userDefinedJoinCode },
			$page.data.user.sessionToken,
		);
		if (res.error) {
			setFadeMessage(res.message, 'warning');
		} else if (res.joincode) {
			generatedJoinCode = res.joincode;
			myorg.joincode = generatedJoinCode;
		}
	}

	async function approveJoinOrgApplications() {
		console.log(myorg.joinapps);
		// let accounts = myorg.joinapps.filter((x: any) => x.checked).map((x: any) => x.account);
		// let eids = myorg.joinapps.filter((x: any) => x.checked).map((x: any) => x.eids);
		let account_eids = [];
		for (let i = 0; i < myorg.joinapps.length; i++) {
			let obj: any = {};
			obj.account = myorg.joinapps[i].account;
			obj.eid = myorg.joinapps[i].eid;
			account_eids.push(obj);
		}
		let res = await api.post(
			'tnt/approve',
			{ account_eids },
			// { accounts, password: password_for_admin },
			$page.data.user.sessionToken,
		);
		if (res.error) {
			setFadeMessage(res.message, 'warning');
		} else {
			if (res.joinapps) {
				myorg.joinapps = res.joinapps;
				for (let i = 0; i < myorg.joinapps.length; i++) {
					myorg.joinapps[i].checked = true;
					myorg.joinapps[i].eid = myorg.joinapps[i].account;
				}
			}
		}
	}

	async function sendInvitation() {
		let eids = invitation.split(/[ ;,]/).filter((x) => x.length > 0);
		let res = await api.post('tnt/send/invitation', { eids: eids }, $page.data.user.sessionToken);
		if (res.error) {
			setFadeMessage(res.message, 'warning');
			/* } else { */
			/*   refreshMembers(); */
		}
	}

	let qrcodeLink = `${MTC_SERVER}/apply/${user.tenant?._id}?joincode=${myorg.joincode}`;

	const generateJoinQrCode = () => {
		QRCode.toDataURL(qrcodeLink, opts, function (err: any, url: string) {
			if (err) throw err;

			const img = document.getElementById('qrcode-image-1') as HTMLInputElement;
			if (img) img.src = url;
		});
	};
	$: if (myorg.joincode) {
		qrcodeLink = `${MTC_SERVER}/apply/${user.tenant?._id}?joincode=${myorg.joincode}`;
		generateJoinQrCode();
	}

	onMount(async () => {
		$pageName = $_('setting.tab.tenant');
		try {
			await refreshMyOrg();
			generateJoinQrCode();
		} catch (e) {}
	});

	const handleClickAddOrgchartAdmin = async (e: MouseEvent) => {
		e.preventDefault();
		in_progress = true;

		let ret = await api.post('orgchart/add/admin', { eid: orgchartadmin }, user.sessionToken);
		if (ret.error) {
			setFadeMessage(ret.message, 'warning');
		} else {
			setFadeMessage('Success', 'success');
			orgchartadmin = '';
			orgchartadmin_array = ret;
		}

		in_progress = false;
	};
	const handleClickDelOrgchartAdmin = async (eid: string) => {
		in_progress = true;

		let ret = await api.post('orgchart/del/admin', { eid }, user.sessionToken);
		if (ret.error) {
			setFadeMessage(ret.message, 'warning');
		} else {
			setFadeMessage('Success', 'success');
			orgchartadmin = '';
			orgchartadmin_array = ret;
		}

		in_progress = false;
	};

	var opts = {
		errorCorrectionLevel: 'H',
		type: 'image/jpeg',
		quality: 0.3,
		margin: 1,
		color: {
			dark: '#010599FF',
			light: '#FFBF60FF',
		},
	};

	const upgrade = async (e: MouseEvent) => {
		e.preventDefault();
		let ret = await api.post(
			'tenant/upgrade',
			{ tenantid: $page.data.user.tenant._id },
			$page.data.user.sessionToken,
		);
		console.log(ret);
		toast(ret.msg);
		if (ret.code == 0) {
			// setFadeMessage('Success', 'success');
			setTimeout(() => {
				location.reload();
			}, 500);
		} else {
			// setFadeMessage(ret.msg, 'warning');
		}
	};
</script>

<form>
	<Container class="mt-3 mb-3">
		<Row>
			<TenantMenu />
		</Row>
		<div class="w-100 text-center fs-3">{orgname}</div>
		<div class="w-100 text-center fs-6">
			{$_('setting.tenant.administrator')}: {myorg.owner === $page.data.user.eid
				? 'Me'
				: myorg.owner}
		</div>
		<div class="w-100 text-center fs-6">
			{$_('setting.tenant.myrole')}: {$page.data.user.group}
		</div>
		{#if $page.data.user.group === 'ADMIN'}
			<form>
				<Card class="mt-3">
					<CardHeader><CardTitle>{$_('setting.tenant.myorg')}</CardTitle></CardHeader>
					<CardBody>
						<!--InputGroup class="mb-1">
							<InputGroupText>{$_('setting.tenant.adminpwd')}</InputGroupText>
							<Input
								type="password"
								autocomplete="current-password"
								bind:value={password_for_admin}
								placeholder={$_('setting.tenant.adminpwd_ph')} />
						</InputGroup -->
						<InputGroup class="mb-1">
							<InputGroupText>{$_('setting.tenant.name')}</InputGroupText>
							<Input
								bind:value={orgname}
								placeholder={$_('setting.tenant.name_ph')} />
							<Button
								on:click={(e) => {
									e.preventDefault();
									setMyTenantName();
								}}>
								{$_('button.set')}
							</Button>
						</InputGroup>
						<InputGroup class="mb-1">
							<InputGroupText>{$_('setting.tenant.theme')}</InputGroupText>
							<Input
								bind:value={orgtheme}
								placeholder={$_('setting.tenant.theme_ph')} />
							<Button
								on:click={(e) => {
									e.preventDefault();
									setMyTenantTheme();
								}}>
								{$_('button.set')}
							</Button>
						</InputGroup>
						<InputGroup class="mb-1">
							<InputGroupText>{$_('setting.tenant.timezone')}</InputGroupText>
							<Input
								type="select"
								bind:value={orgtimezone}>
								{#each tzArray as tz}
									<option value={tz.tzutc}>{tz.name} ({tz.diff})</option>
								{/each}
							</Input>
							<Button
								on:click={(e) => {
									e.preventDefault();
									setMyTenantTimezone();
								}}>
								{$_('button.set')}
							</Button>
						</InputGroup>
						<InputGroup class="mb-1">
							<InputGroupText>{$_('setting.tenant.orgtags')}</InputGroupText>
							<!-- Convert 全角标点符号到半角标点符号 -->
							<QtoBInput bind:value={orgleveltags} />
							<Button
								on:click={(e) => {
									e.preventDefault();
									setMyTenantOrgLevelTags();
								}}>
								{$_('button.set')}
							</Button>
						</InputGroup>
						<InputGroup class="mb-1">
							<input
								class="ms-3 form-check-input"
								type="checkbox"
								bind:checked={myorg.regfree}
								on:change={async (e) => {
									e.preventDefault();

									let ret = await api.post(
										'tnt/set/regfree',
										{ regfree: myorg.regfree },
										$page.data.user.sessionToken,
									);
									if (ret.error) {
										setFadeMessage(ret.message, 'warning');
									} else {
										if (myorg.regfree) {
											setFadeMessage($_('setting.tenant.regfree_true'));
										} else {
											setFadeMessage($_('setting.tenant.regfree_false'));
										}
									}
								}} />
							{$_(`setting.tenant.allow_regfree`)}
						</InputGroup>
						<!-- <InputGroup class="mb-1"> -->
						<!-- 	<input -->
						<!-- 		class="ms-3 form-check-input" -->
						<!-- 		type="checkbox" -->
						<!-- 		bind:checked={myorg.allowemptypbo} -->
						<!-- 		on:change={async (e) => { -->
						<!-- 			e.preventDefault(); -->

						<!-- 			let ret = await api.post( -->
						<!-- 				'tnt/set/allowemptypbo', -->
						<!-- 				{ allow: myorg.allowemptypbo }, -->
						<!-- 				$page.data.user.sessionToken, -->
						<!-- 			); -->
						<!-- 			if (ret.error) { -->
						<!-- 				setFadeMessage(ret.message, 'warning'); -->
						<!-- 			} else { -->
						<!-- 				if (ret.allowemptypbo) { -->
						<!-- 					setFadeMessage($_('setting.tenant.allowemptypbo_true')); -->
						<!-- 				} else { -->
						<!-- 					setFadeMessage($_('setting.tenant.allowemptypbo_false')); -->
						<!-- 				} -->
						<!-- 				console.log(ret.allowemptypbo); -->
						<!-- 			} -->
						<!-- 		}} /> -->
						<!-- 	{$_('setting.tenant.allowemptypbo')} -->
						<!-- </InputGroup> -->
						{#if !myorg.orgmode}
							<Button
								class="upgrade"
								color="info"
								size="sm"
								on:click={upgrade}>
								{$_('button.upgrade')}
							</Button>
						{/if}
						<Container class="pt-4">
							<InputGroup class="mb-1">
								<InputGroupText>{$_('setting.tenant.ocadmins')}</InputGroupText>
								<Input
									type="text"
									bind:value={orgchartadmin}
									placeholder={$_('setting.tenant.ocadmins_ph')} />
								<Button on:click={handleClickAddOrgchartAdmin}>{$_('button.add')}</Button>
							</InputGroup>
							{#each orgchartadmin_array as anAdmin}
								<span
									class="pe-3"
                  role="none"
									on:mouseover={() => {
										currentAdmin = anAdmin.eid;
									}}
									on:focus={() => {
										currentAdmin = anAdmin.eid;
									}}
									on:mouseout={() => {
										currentAdmin = '';
									}}
									on:blur={() => {
										currentAdmin = '';
									}}>
									{anAdmin.cn}
									{#if currentAdmin === anAdmin.eid}
										<a
											href={'#'}
											class="kfk-link"
											on:click={async (e) => {
												e.preventDefault();
												await handleClickDelOrgchartAdmin(anAdmin.eid);
											}}>
											<AniIcon
												icon="backspace-fill"
												ani="aniShake" />
										</a>
									{:else}
										<Icon name="backspace-fill" />
									{/if}
								</span>
							{/each}
						</Container>
					</CardBody>
				</Card>
			</form>
		{:else}
			<Card class="mt-3">
				<CardHeader><CardTitle>{$_('setting.tenant.myorg')}</CardTitle></CardHeader>
				<CardBody>
					<CardSubtitle>{$_('setting.tenant.myorgname')}</CardSubtitle>
					<CardText>
						{orgname}
					</CardText>
					<CardSubtitle>{$_('setting.tenant.myorgtimezone')}</CardSubtitle>
					<CardText>
						{orgtimezone}
						{TimeZone.getDiff(orgtimezone)}
					</CardText>
					<CardText>{$_('setting.tenant.messagefornoadmin')}</CardText>
				</CardBody>
			</Card>
		{/if}
		{#if myorg.adminorg}
			<Card class="mt-5">
				<CardHeader><CardTitle>{$_('setting.tenant.joincode')}</CardTitle></CardHeader>
				<CardBody>
					<div class="w-100 d-flex align-content-center">
						{$_('setting.tenant.currentcode')}: {myorg.joincode}
					</div>
					<InputGroup class="mb-1">
						<InputGroupText>{$_('setting.tenant.genjoincode')}</InputGroupText>
						<Input bind:value={generatedJoinCode} />
						<Button
							on:click={(e) => {
								e.preventDefault();
								generateJoinCode();
							}}>
							Generate
						</Button>
					</InputGroup>
					<InputGroup class="mb-1">
						<InputGroupText>{$_('setting.tenant.selfjoincode')}</InputGroupText>
						<Input bind:value={userDefinedJoinCode} />
						<Button
							on:click={(e) => {
								e.preventDefault();
								setUserDefinedJoinCode();
							}}>
							Use it
						</Button>
					</InputGroup>
				</CardBody>
			</Card>
			<Card class="mt-3">
				<CardHeader>
					<CardTitle>{$_('setting.tenant.invite')}</CardTitle>
				</CardHeader>
				<CardBody>
					<!-- {$_('setting.tenant.invite_with_eid')} -->
					<!-- <InputGroup class="mb-1">  // 老板邮箱邀请删除后暂时不做账号邀请
						<Input
							type="textarea"
							bind:value={invitation}
							placeholder={$_('setting.tenant.invite_ph')} />
						<Button
							on:click={(e) => {
								e.preventDefault();
								sendInvitation();
							}}>
							Invite
						</Button>
					</InputGroup> -->
					{$_('setting.tenant.invite_with_qrcode')}
					<div class="row my-2">
						<div class="col">
							<img
								alt="qrcode-1"
								id="qrcode-image-1" />
						</div>
					</div>
					<div class="row my-2">
						<div class="col">
							User will be directed to:
							<br />
							{qrcodeLink}
						</div>
					</div>
				</CardBody>
			</Card>
			<Card class="mt-3">
				<CardHeader>
					<CardTitle>{$_('setting.tenant.joinapplication')}</CardTitle>
				</CardHeader>
				<CardBody>
					<Button
						color="secondary"
						on:click={(e) => {
							e.preventDefault();
							refreshMyOrg();
						}}>
						Refresh
					</Button>
					{#if myorg.joinapps && Array.isArray(myorg.joinapps) && myorg.joinapps.length > 0}
						<table class="w-100">
							<thead>
								<tr>
									<th>Account</th>
									<th>Name</th>
									<th>Eid</th>
									<th>Approve</th>
								</tr>
							</thead>
							<tbody>
								{#each myorg.joinapps as appl}
									<tr>
										<td>
											{appl.account}
										</td>
										<td>
											{appl.user_name}
										</td>
										<td>
											<input
												type="text"
												bind:value={appl.eid} />
										</td>
										<td>
											<Input
												type="checkbox"
												bind:checked={appl.checked} />
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
						<!-- <InputGroup class="mb-1">
							<Input
								type="password"
								bind:value={password_for_admin}
								placeholder="Confirm with org password" />
							<Button
								on:click={(e) => {
									e.preventDefault();
									approveJoinOrgApplications();
								}}>
								Approve
							</Button>
						</InputGroup> -->
						<Button
							style="display: block; margin: 10px auto;"
							on:click={(e) => {
								e.preventDefault();
								approveJoinOrgApplications();
							}}>
							Approve
						</Button>
					{:else}
						{$_('setting.tenant.noapplication')}
					{/if}
				</CardBody>
			</Card>
		{/if}
	</Container>
</form>
{#if errors?.description}
	<p class="error">{errors.description}</p>
{/if}

<style>
	:global(.upgrade) {
		margin-left: 15px;
		margin-top: 10px;
	}
</style>
