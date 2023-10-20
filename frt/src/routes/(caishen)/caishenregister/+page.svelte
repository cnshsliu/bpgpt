<script lang="ts">
	import { _ } from '$lib/i18n';
	import * as api from '$lib/api';
	import { page } from '$app/stores';
	import LocaleSwitcher from '$lib/LocaleSwitcher.svelte';
	import { Container, Row, Col } from 'sveltestrap';
	import type { EmpResponse, registerParam } from '$lib/types';
	import { goto } from '$app/navigation';
	import { post, getUrlQuery } from '$lib/utils';
	import { setFadeMessage } from '$lib/Notifier';

	let username: string = '';
	let account: string = '';
	let email: string = '';
	let code: string = '';
	let password: string = '';
	let password2: string = '';
	let errMsg = '';
	let currentStep = 'step0';

	const validation = {
		account: /^[a-zA-Z][a-zA-Z0-9_]{2,28}[a-zA-Z0-9]$/,
		email: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/,
		username: /^[a-zA-Z\u4e00-\u9fa5][a-zA-Z0-9. \-_\u4e00-\u9fa5]{0,28}[a-zA-Z0-9\u4e00-\u9fa5]$/,
		nickname: /^[a-zA-Z\u4e00-\u9fa5][a-zA-Z0-9. \-_\u4e00-\u9fa5]{0,28}[a-zA-Z0-9\u4e00-\u9fa5]$/,
		password: /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,20}$/,
		notify: /[esw]{0,3}/,
	};
	let usernameTips = '';
	let accountTips = '';
	let regSuccess = false;
	async function submit(event: Event) {
		event.preventDefault();
		if (password !== password2) {
			setFadeMessage('Passwords are not equal');
			return;
		}
		const params: registerParam = {
			username,
			account,
			password,
			// joincode: $page.data.joincode
		};
		$page.data.joincode ? (params.joincode = $page.data.joincode) : '';

		const response: EmpResponse = (await post(`auth/register`, params)) as unknown as EmpResponse;

		if (response.error) {
			console.log(response);
			if (response.error === 'MongoServerError') {
				if (response.message?.indexOf('duplicate key')) {
					response.message = $_('register.duplicate');
				} else {
					response.message = $_('register.dberror');
				}
			}
			setFadeMessage(response.message ?? '');
			errMsg = response.message ?? '';
		}
		if (errMsg == 'fetch failed') {
			errMsg = $_('server.FETCH_FAILED');
		}

		if (response.account) {
			regSuccess = true;
		}
	}
	let emailCheckingMsgs = '';
	let emailCssClasses: string = '';
	let passwordCheckingMsgs = '';
	let password2CheckingMsgs = '';
	let passwordCssClasses: string = '';
	let password2CssClasses: string = '';
	let enableSigninButton = false;
	const onInputPassword = function () {
		if (password.match(validation.password)) {
			passwordCssClasses = 'valid';
			passwordCheckingMsgs = '';
			if (password === password2) {
				password2CheckingMsgs = '';
				enableSigninButton = true;
			} else {
				password2CheckingMsgs = $_('setting.personal.password2notsame');
				enableSigninButton = false;
			}
		} else {
			if (password.length < 6) {
				passwordCssClasses = 'invalid';
				passwordCheckingMsgs = $_('setting.personal.passwordtooshort');
				enableSigninButton = false;
			} else if (password.length > 20) {
				passwordCssClasses = 'invalid';
				passwordCheckingMsgs = $_('setting.personal.passwordtoolong');
				enableSigninButton = false;
			} else {
				passwordCssClasses = 'is-invalid';
				passwordCheckingMsgs = $_('setting.personal.passwordhint');
				enableSigninButton = false;
			}
		}
	};
	const onInputEmail = function () {
		if (email.match(validation.email)) {
			emailCssClasses = 'valid';
			emailCheckingMsgs = '';
			enableSigninButton = true;
		} else {
			emailCssClasses = 'invalid';
			emailCheckingMsgs = '请输入一个正确的邮箱地址';
			enableSigninButton = false;
		}
	};
	const onInputPassword2 = function () {
		if (password2 !== password) {
			password2CssClasses = 'is-invalid';
			password2CheckingMsgs = $_('setting.personal.password2notsame');
			enableSigninButton = false;
		} else {
			if (password.match(validation.password)) {
				passwordCssClasses = 'valid';
				password2CssClasses = 'valid';
				passwordCheckingMsgs = '';
				password2CheckingMsgs = '';
				enableSigninButton = true;
			} else {
				passwordCssClasses = 'is-invalid';
				passwordCheckingMsgs = $_('setting.personal.passwordhint');
				enableSigninButton = false;
			}
		}
	};

	const checkFreeReg = async function () {
		console.log('Checking freereg', account);
		// let ret = await api.post('check/freereg', { email: email });
		// if (ret.error) {
		// 	if (ret.error === 'NO_FREE_REG') {
		// 		errMsg = email.substring(email.indexOf('@') + 1) + $_('account.nofreereg');
		// 	} else {
		// 		errMsg = ret.message as string;
		// 	}
		// }
		if (validation.account.test(account)) {
			accountTips = '';
			let ret = await api.post('account/check/availability', { account: account });
			console.log(ret);
			if (ret.error) {
				console.log(ret.error);
				if (ret.error === 'NO_FREE_REG') {
					errMsg = account.substring(account.indexOf('@') + 1) + $_('account.nofreereg');
				} else if (ret.error === 'ACCOUNT_OCCUPIED') {
					errMsg = $_('account.occupied', {
						values: { account: account.substring(account.indexOf('@') + 1) },
					});
				} else {
					errMsg = ret.message as string;
				}
			}
		} else {
			account == '' ? (accountTips = '') : (accountTips = $_('setting.personal.accountFormatTip'));
		}
	};
	const checkNameReg = async function () {
		console.log('Checking name', username);
		validation.username.test(username) || username == ''
			? (usernameTips = '')
			: (usernameTips = $_('setting.personal.usernameFormatTip'));
	};
	const accountInputting = function () {
		errMsg = '';
	};

	const toLogin = () => {
		let joincode = getUrlQuery('joincode');
		let tenantid = getUrlQuery('tenantid');
		let loginPath = '/login';
		if ($page.data.url.hostname.indexOf('lkh.ai') > -1) {
			loginPath = '/caishenlogin';
		}
		if (joincode && tenantid) {
			goto(`${loginPath}?joincode=${joincode}&tenantid=${tenantid}`);
		} else {
			goto(`${loginPath}`);
		}
	};

	function sendCodeToEmail() {
		if (email.match(validation.email)) {
			api.post('auth/sendcode', { email: email }).then((res) => {
				if (res.error) {
					emailCheckingMsgs = res.message;
				} else {
					console.log(res);
					emailCheckingMsgs = '验证码已发送到邮箱，请查收';
					currentStep = 'inputCode';
				}
			});
		} else {
			emailCheckingMsgs = '请输入正确的邮箱地址';
		}
	}
	let msgs = { code: '' };
	function verifyCode() {
		if (code.trim().length === 6) {
			api.post('auth/verifycode', { email: email, code: code.trim() }).then((res) => {
				if (res.error) {
					msgs.code = res.message;
				} else {
					if (res === 'MATCH') {
						msgs.code = '验证码正确';
						currentStep = 'step_account';
					} else {
						msgs.code = '验证码不正确';
						currentStep = 'inputCode_1';
					}
				}
			});
		} else {
			msgs.code = '请输入正确格式的验证码';
		}
	}
</script>

<svelte:head>
	<title>Sign up • HyperFlow</title>
</svelte:head>

<div
	class="container align-self-center"
	style="max-width: 400px;">
	<Row cols="1">
		<Col>
			<h1 class="text-center">{$_('account.signup')}</h1>
		</Col>
		<Col>
			<p
				class="text-center kfk-link"
				on:keydown={() => {}}
				on:keyup={() => {}}
				on:keypress={() => {}}
				on:click={toLogin}>
				<span class="a">{$_('account.haveAnAccount')}</span>
			</p>
		</Col>
		{#if currentStep === 'step0'}
			<Col>
				<div class="form-floating">
					<input
						class="form-control form-control-lg mt-2"
						id="input-email"
						type="text"
						required
						name="email"
						placeholder="Email"
						bind:value={email}
						on:input={(e) => {
							e.preventDefault();
							onInputEmail();
						}} />
					<label for="input-email">{$_('account.yourEmail')}</label>
					{emailCheckingMsgs}
				</div>
				<button
					class="w-100 btn btn-lg btn-primary pull-xs-right mt-3"
					on:click|preventDefault={sendCodeToEmail}>
					{$_('account.send_code_to_email')}
				</button>
			</Col>
		{:else if currentStep === 'inputCode' || currentStep === 'inputCode_1'}
			<Col>
				<div class="form-floating">
					<input
						class="form-control form-control-lg mt-2"
						id="input-code"
						type="text"
						required
						name="code"
						placeholder="code"
						bind:value={code} />
					<label for="input-code">{$_('account.yourcode')}</label>
					{msgs.code}
				</div>
				<button
					class="w-100 btn btn-lg btn-primary pull-xs-right mt-3"
					on:click|preventDefault={verifyCode}>
					{$_('account.verify_code')}
				</button>
				{#if currentStep === 'inputCode_1'}
					<a
						href={'#'}
						on:click|preventDefault={() => {
							currentStep = 'step0';
						}}>
						{$_('account.modify_email')}
					</a>
				{/if}
			</Col>
		{/if}
		{#if currentStep === 'step_account'}
			{#if regSuccess === false}
				<Col>
					<form on:submit|preventDefault={submit}>
						<div class="form-floating">
							<input
								class="form-control form-control-lg mt-2"
								id="input-account"
								type="text"
								required
								name="account"
								placeholder="Account"
								bind:value={account}
								on:change={checkFreeReg}
								on:blur={checkFreeReg}
								on:input={accountInputting} />
							<label for="input-account">{$_('account.yourAccount')}</label>
							{accountTips}
						</div>
						{#if errMsg === ''}
							<div class="form-floating">
								<input
									class="form-control form-control-lg mt-2"
									type="text"
									id="input-username"
									required
									placeholder="Your display name"
									on:change={checkNameReg}
									on:blur={checkNameReg}
									bind:value={username} />
								<label for="input-username">{$_('account.yourDisplayName')}</label>
								{usernameTips}
							</div>
							<div class="form-floating">
								<input
									class="form-control form-control-lg mt-2"
									type="password"
									id="input-password"
									name="new-password"
									required
									placeholder="Password"
									autocomplete="new-password"
									bind:value={password}
									on:input={(e) => {
										e.preventDefault();
										onInputPassword();
									}} />
								<label for="input-password">{$_('account.choosePassword')}</label>
								{passwordCheckingMsgs}
							</div>
							<!-- svelte-ignore missing-declaration -->
							<div class="form-floating">
								<input
									class="form-control form-control-lg mt-2"
									type="password"
									id="input-password-repeat"
									required
									placeholder="Password Repeat"
									autocomplete="new-password"
									bind:value={password2}
									on:input={(e) => {
										e.preventDefault();
										onInputPassword2();
									}} />
								<label for="input-password-repeat">{$_('account.verifyPassword')}</label>
								{password2CheckingMsgs}
							</div>
							<button
								class="w-100 btn btn-lg btn-primary pull-xs-right mt-3"
								disabled={enableSigninButton === false}>
								{$_('account.signup')}
							</button>
						{:else}
							<div class="mt-3">
								{errMsg}
								<a
									href={'#'}
									class="btn btn-primary"
									on:click={(e) => {
										e.preventDefault();
										errMsg = '';
									}}>
									{$_('register.dismiss')}
								</a>
							</div>
						{/if}
					</form>
				</Col>
			{/if}
			{#if regSuccess}
				<Col class="text-center">
					<div class="mt-3">你的账户：{account}</div>
					<div class="mt-3">你的名称：{username}</div>
					<div class="mt-3">{$_('register.success')}</div>
					<button
						class="btn btn-primary mt-3 w-100"
						on:click|preventDefault={toLogin}>
						{$_('register.loginnow')}
					</button>
				</Col>
			{/if}
		{/if}
		<div
			class="mt-5"
			style="max-width: 400px;">
			<div class="input-group">
				<div class="input-group-text">
					<i class="bi-translate" />
				</div>
				<LocaleSwitcher />
			</div>
		</div>
	</Row>
</div>

<style>
	.a {
		cursor: pointer;
	}
</style>
