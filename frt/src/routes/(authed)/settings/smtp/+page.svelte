<script lang="ts">
	import { pageName } from '$lib/Stores';
	import { Container, Row, Col, Button, InputGroup, InputGroupText, Input } from 'sveltestrap';
	import { _ } from '$lib/i18n';
	import * as api from '$lib/api';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { User, Org, SmtpDef } from '$lib/types';
	import { onMount } from 'svelte';
	import { setFadeMessage } from '$lib/Notifier';

	let password_for_admin = '';
	let smtpDef: SmtpDef = {
		host: 'smtp.myorg.com',
		port: 465,
		secure: true,
		username: '',
		password: '',
		from: '',
	};

	const saveSmtpSetting = async () => {
		let ret = (await api.post(
			'tnt/set/smtp',
			{
				smtp: smtpDef,
			},
			$page.data.user.sessionToken,
		)) as unknown as SmtpDef;
		if (ret.error) {
			if (ret.error && ret.error === 'NO_BRUTE') {
				setFadeMessage($_('error.NO_BRUTE'), 'warning');
			} else {
				setFadeMessage(ret.message, 'warning');
			}
		} else {
			setFadeMessage("Orgnazation's SMTP setting has been saved", 'success');
		}
	};

	onMount(async () => {
		$pageName = $_('setting.tab.smtp');
		let ret = await api.post('tnt/get/smtp', {}, $page.data.user.sessionToken);
		if (ret.error && ret.error === 'NO_BRUTE') {
			setFadeMessage($_('error.NO_BRUTE'), 'warning');
		}
		if (ret && ret.host) {
			smtpDef = ret;
		}
		console.log(ret);
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
					{$_('setting.smtp.nav')}
				</li>
			</ol>
		</nav>
	</Row>
	{#if $page.data.user.group !== 'ADMIN'}
		<div class="w-100 text-center fs-3">Email setting is managed by org admin</div>
	{:else}
		<Row cols="1">
			<!-- Col class="d-flex justify-content-end mt-2">
				<InputGroup class="mb-1">
					<InputGroupText>{$_('setting.adminpwd')}</InputGroupText>
					<Input
						type="password"
						bind:value={password_for_admin}
						placeholder={$_('setting.adminpwd_ph')}
					/>
				</InputGroup>
			</Col -->
			<Col class="d-flex justify-content-end mt-2">
				<InputGroupText>{$_('setting.smtp.server')}</InputGroupText>
				<InputGroup class="mb-1">
					<Input
						id="smtp_host"
						type="text"
						bind:value={smtpDef.host}
						placeholder="" />
				</InputGroup>
			</Col>
			<Col class="d-flex justify-content-end mt-2">
				<InputGroupText>{$_('setting.smtp.port')}</InputGroupText>
				<InputGroup class="mb-1">
					<Input
						id="smtp_port"
						type="number"
						bind:value={smtpDef.port}
						placeholder="" />
				</InputGroup>
			</Col>
			<Col class="d-flex justify-content-end mt-2">
				<InputGroupText>{$_('setting.smtp.secure')}</InputGroupText>
				<InputGroup class="mb-1">
					<Input
						id="smtp_secure"
						type="checkbox"
						checked={smtpDef.secure} />
				</InputGroup>
			</Col>
			<Col class="d-flex justify-content-end mt-2">
				<InputGroupText>{$_('setting.smtp.user')}</InputGroupText>
				<InputGroup class="mb-1">
					<Input
						id="smtp_username"
						type="text"
						bind:value={smtpDef.username}
						placeholder={$_('setting.smtp.user_ph')} />
				</InputGroup>
			</Col>
			<Col class="d-flex justify-content-end mt-2">
				<InputGroupText>{$_('setting.smtp.pwd')}</InputGroupText>
				<InputGroup class="mb-1">
					<Input
						id="smtp_password"
						type="password"
						bind:value={smtpDef.password}
						placeholder={$_('setting.smtp.pwd_ph')} />
				</InputGroup>
			</Col>
			<Col class="d-flex justify-content-end mt-2">
				<InputGroupText>{$_('setting.smtp.from')}</InputGroupText>
				<InputGroup class="mb-1">
					<Input
						id="smtp_from"
						type="text"
						bind:value={smtpDef.from}
						placeholder={$_('setting.smtp.from_ph')} />
				</InputGroup>
			</Col>
			<Col class="d-flex justify-content-end mt-2">
				<Button
					on:click={async (e) => {
						e.preventDefault();
						await saveSmtpSetting();
					}}>
					{$_('setting.set')}
				</Button>
			</Col>
		</Row>
	{/if}
</Container>
