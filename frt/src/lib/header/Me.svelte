<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { createEventDispatcher } from 'svelte';
	import { toast } from '$lib/Toast';
	import LocaleSwitcher from '$lib/LocaleSwitcher.svelte';
	import {
		Row,
		InputGroup,
		InputGroupText,
		Col,
		Icon,
		Navbar,
		Nav,
		NavItem,
		NavLink,
		Dropdown,
		DropdownToggle,
		DropdownMenu,
		DropdownItem,
		Container,
		Modal,
		ModalFooter,
		ModalHeader,
		ModalBody,
		Button,
		Input,
	} from 'sveltestrap';
	import TimeTool from '$lib/TimeTool';
	import { browser } from '$app/environment';
	import { mtcSession, showQrCode } from '$lib/Stores';
	import { _, locale } from '$lib/i18n';
	import { goto } from '$app/navigation';
	import { post } from '$lib/utils';
	import { DEPLOY_MODE } from '$lib/Env';
	import { onMount, onDestroy } from 'svelte';
	import Avatar from '$lib/display/Avatar.svelte';
	import { MTC_SERVER } from '$lib/Env';
	import QRCode from 'qrcode';
	import * as api from '$lib/api';

	const dispatch = createEventDispatcher();

	export let avatarStyle = 'avatar40';
	export let label: string = '';
	export let isVisisble: boolean = true;

	let isMenuOpen = true;
	let theAvatar: any;
	let theAvatar2: any;

	let showConfirmModal = false;
	let fullscreen = false;
	let tenant = '';
	let clientTenantId = '0';
	let tenantName = '';
	let opts = {
		width: 200,
		height: 200,
		errorCorrectionLevel: 'H',
		type: 'image/jpeg',
		quality: 0.3,
		margin: 1,
		color: {
			dark: '#010599FF',
			light: '#FFBF60FF',
		},
	};
	let tenantList: any = [];
	const toggle = () => (isMenuOpen = !isMenuOpen);
	const turn = () => (showConfirmModal = !showConfirmModal);

	async function logout() {
		dispatch('logout');
	}
	$: if ($mtcSession.avatarChangedFlag) {
		theAvatar.refresh();
		theAvatar2.refresh();
	}

	const switchTenant = (event: Event) => {
		event.preventDefault();
		clientTenantId = (event.target as HTMLInputElement).value;
	};

	const generateJoinQrCode = async () => {
		if ($showQrCode === true) {
			$showQrCode = false;
		} else {
			let org: any = await getMyOrg();
			let qrcodeLink = `${MTC_SERVER}/${tenant}?joincode=${org.joincode}`;
			QRCode.toDataURL(qrcodeLink, opts, function (err: any, url: string) {
				if (err) throw err;

				const img = document.getElementById('qrcode-image') as HTMLImageElement | null;
				if (img) img.src = url;
			});
			$showQrCode = true;
		}
	};

	async function getMyOrg() {
		let myorg = await api.post('tnt/my/org', {}, $page.data.user.sessionToken);
		console.log(myorg);
		return myorg;
	}

	const getTenant = async () => {
		if ($page.data.user) {
			let res: any = await api.post(
				'tenant/list',
				{
					account: $page.data.user.account,
				},
				$page.data.user.sessionToken,
			);
			if (res.code == 0) {
				tenantList = res.data;
				tenant = clientTenantId;
			}
		}
	};

	const changeTenant = async () => {
		if (clientTenantId == '0') return;
		turn();
		const response: any = await post(`/auth/tenantswitch`, {
			account: $page.data.user.account,
			tenantid: clientTenantId,
		});
		if (response.user) {
			tenantName = response.user.tenant.name;
			toast($_('message.switch_tenant_success'), 'Change Tenant', 'success');
		}
	};

	onMount(async () => {
		await getTenant();
	});
</script>

{#if $page.data.user}
	<Dropdown
		class="navbar-expand-sm"
		style={isVisisble ? '' : 'display:none'}>
		<DropdownToggle nav>
			<Avatar
				eid={$page.data.user.eid}
				uname={$page.data.user.username}
				style={avatarStyle}
				bind:this={theAvatar} />
			{label}
		</DropdownToggle>
		<DropdownMenu>
			<Container style="width:300px; text-align:center;">
				<Row cols="1">
					<Col style="text-align:center;">
						{#if $page.data.user}
							<Avatar
								eid={$page.data.user.eid}
								uname={$page.data.user.username}
								style={'avatar80-round10'}
								bind:this={theAvatar2} />
						{:else}
							<div class="w-100 d-flex justify-content-center">
								<div class="kfk-avatar-letter-middle img-thumbnail">ME</div>
							</div>
						{/if}
					</Col>
					{#if $page.data.user}
						<Col class="fw-bold mt-2">
							{$page.data.user.nickname}
							<br />
							{$page.data.user.eid}
						</Col>
					{/if}
					<Col>
						{tenantName}
						<i
							class="bi bi-qr-code p-3 fs-1"
							style="cursor:pointer"
              role="none"
							on:keydown={() => {}}
							on:keyup={() => {}}
							on:keypress={() => {}}
							on:click={generateJoinQrCode} />
					</Col>
					<Col>{DEPLOY_MODE}</Col>
				</Row>
				<InputGroup>
					<InputGroupText>
						<i class="bi-translate" />
					</InputGroupText>
					<LocaleSwitcher />
				</InputGroup>
			</Container>
			<DropdownItem divider />
			<DropdownItem
				class="text-center"
				on:click={(e) => {
					goto('/settings');
				}}>
				{$_('navmenu.settings')}
			</DropdownItem>
			<DropdownItem
				class="text-center"
				on:click={(e) => {
					window.open('https://cnshsliu.github.io/mtcdocs/', '_yarknodedoc');
				}}>
				{$_('navmenu.doc')}
			</DropdownItem>
			<DropdownItem
				class="text-center"
				on:click={() => {
					showConfirmModal = true;
				}}>
				{$_('navmenu.switch_tenant')}
			</DropdownItem>
			<DropdownItem divider />
			<DropdownItem
				class="text-center"
				on:click={logout}>
				<Icon name="door-open" />
				{$_('account.signout')}
			</DropdownItem>
		</DropdownMenu>
	</Dropdown>
{/if}
<div class="test">
	<Modal
		isOpen={showConfirmModal}
		toggle={turn}
		{fullscreen}>
		<ModalHeader {toggle}>{$_('navmenu.switch_tenant')}</ModalHeader>
		<ModalBody>
			<InputGroup>
				<InputGroupText>{$_('button.tenant')}</InputGroupText>
				<Input
					type="select"
					on:change={switchTenant}>
					{#each tenantList as t}
						<option value={t.id}>{t.name}</option>
					{/each}
				</Input>
			</InputGroup>
		</ModalBody>
		<ModalFooter>
			<Button
				color="primary"
				on:click={changeTenant}>
				{$_('button.okay')}
			</Button>
			<Button
				color="secondary"
				on:click={turn}>
				{$_('button.cancel')}
			</Button>
		</ModalFooter>
	</Modal>
</div>

<style>
</style>
