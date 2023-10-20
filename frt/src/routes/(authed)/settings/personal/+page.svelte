<script lang="ts">
	import { pageName } from '$lib/Stores';
	import { onMount } from 'svelte';
	import { API_SERVER } from '$lib/Env';
	import { Button, Container, Row, Col, InputGroup, InputGroupText, Input } from 'sveltestrap';
	import Avatar from '$lib/display/Avatar.svelte';
	import { goto } from '$app/navigation';
	import Signature from '$lib/Signature.svelte';
	import { mtcSession } from '$lib/Stores';
	import { debugOption } from '$lib/mtcLocalStores';
	import { page } from '$app/stores';
	import { setFadeMessage } from '$lib/Notifier';
	import { _ } from '$lib/i18n';
	import type { EmpResponse } from '$lib/types';
	import { invalidateAll } from '$app/navigation';
	import { post } from '$lib/utils';
	import * as api from '$lib/api';
	import type { PageData } from './$types';
	let uploadedFiles: any[] = [];
	let joinorgwithcode = '';

	export let data: PageData;
	export let errors: any;
	let signaturVal: any;
	let { user } = data;
	let notifyMode = { email: false, sms: false, wecom: false };
	let notifyString = '';

	let tips = { account: '', username: '', nickname: '' };

	const onNotifyModeChange = () => {
		notifyString =
			(notifyMode.email ? 'e' : '') + (notifyMode.sms ? 's' : '') + (notifyMode.wecom ? 'w' : '');
	};
	const onUserChange = () => {
		notifyMode = {
			email: user.notify.indexOf('e') >= 0 ? true : false,
			sms: user.notify.indexOf('s') >= 0 ? true : false,
			wecom: user.notify.indexOf('w') >= 0 ? true : false,
		};
		signaturVal = user.signature.startsWith('PIC:') ? '' : user.signature;
		onNotifyModeChange();
	};
	$: ({ user } = data);
	$: user && onUserChange();
	$: user && console.log('hello');

	let my_old_password = '';
	let in_progress = false;

	let enableChangePasswordButton = false;

	in_progress = true;
	const setPersonal = async function (value: any) {
		in_progress = true;
		tips = { account: '', username: '', nickname: '' };
		let payload: Record<string, any> = {
			value: value,
		};
		if (value.action === 'setNotify') {
			payload = {
				value: { notify: notifyString },
			};
		}
		const response = (await post(`/auth/update`, payload)) as unknown as EmpResponse;

		if (response.error) {
			if (
				response.error === 'Bad Request' &&
				response.message &&
				response.message.indexOf('value.password') > -1 &&
				response.message.indexOf('fails to match') > -1
			) {
				setFadeMessage($_('setting.personal.newpassword_wrong'));
				enableChangePasswordButton = false;
			} else if (response.error === 'wrong_password') {
				setFadeMessage($_('setting.personal.old_password_wrong'));
			} else if (response.message) {
				let msg = response.message;
				if (['nickname', 'pattern'].every((sub) => msg.includes(sub))) {
					tips.nickname = $_('setting.personal.nicknameFormatTip');
					setFadeMessage($_('setting.personal.nicknameFormatError'));
				} else if (['username', 'pattern'].every((sub) => msg.includes(sub))) {
					tips.username = $_('setting.personal.usernameFormatTip');
					setFadeMessage($_('setting.personal.usernameFormatError'));
				}
			}
		} else {
			//eslint-disable-next-line
			if (response.user) {
				user = response.user;
				console.log(user);
				setFadeMessage('修改用户信息成功', 'success');
				await invalidateAll();
			} else {
				setFadeMessage('错误', 'danger');
			}
		}

		in_progress = false;
	};

	const removeSignature = async function () {
		let ret = await api.post('account/remove/signature', {}, $page.data.token);
	};

	async function setUserSignature() {
		let ret = await api.post(
			'account/set/signature',
			{ pondfiles: uploadedFiles },
			$page.data.token,
		);
	}

	let webhook_setting = {
		wecombot_key: '',
	};

	let avatarInput: any;
	let signatureInput: any;
	let theAvatar: any;
	let theSignature: any;

	let newPasswordCheckingMsgs = '';
	let newPasswordCssClasses: string = 'form-control';
	const pwdReg = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,20}$/;
	const onInputNewPassword = function () {
		if ($page.data.user.password.match(pwdReg)) {
			newPasswordCssClasses = 'form-control valid';
			newPasswordCheckingMsgs = '';
			enableChangePasswordButton = true;
		} else if ($page.data.user.password.length < 6) {
			newPasswordCssClasses = 'form-control is-invalid';
			newPasswordCheckingMsgs = $_('setting.personal.passwordtooshort');
			enableChangePasswordButton = false;
		} else if ($page.data.user.password.length > 20) {
			newPasswordCheckingMsgs = $_('setting.personal.passwordtoolong');
			enableChangePasswordButton = false;
		} else {
			newPasswordCssClasses = 'form-control is-invalid';
			newPasswordCheckingMsgs = $_('setting.personal.passwordhint');
			enableChangePasswordButton = false;
		}
	};
	async function uploadAvatar(e: Event) {
		e.preventDefault();
		const formData = new FormData();
		const fileInput = <HTMLInputElement>e.target;
		if (fileInput.files === null) return;
		console.log(fileInput.files);
		formData.append('avatar', fileInput.files[0]);
		try {
			await fetch(`${API_SERVER}/employee/upload/avatar`, {
				method: 'POST',
				headers: {
					Authorization: $page.data.user.sessionToken,
				},
				body: formData,
			})
				.then((response) => response.json())
				.then(async (result) => {
					if (result.error) {
						setFadeMessage(result.message, 'warning');
					} else {
						setTimeout(async () => {
							theAvatar.refresh();
							//这个数字变化时，NavMenu.svelte中会检测到，然后更新菜单栏中的Avatar
							let acf = $mtcSession.avatarChangedFlag;
							$mtcSession.avatarChangedFlag = acf ? acf + 1 : 1;
							console.log($mtcSession.avatarChangedFlag);
						}, 1);
					}
				})
				.catch((error) => {
					console.error('Error:', error);
					setFadeMessage(error.message, 'warning');
				});
		} catch (err: any) {
			console.error('Error:', err);
			setFadeMessage(err.message, 'warning');
		}
	}

	async function uploadSignature(e: Event) {
		e.preventDefault();
		const formData = new FormData();
		const fileInput = <HTMLInputElement>e.target;
		if (fileInput.files === null) return;
		console.log(fileInput.files);
		formData.append('signature', fileInput.files[0]);
		try {
			await fetch(`${API_SERVER}/employee/signature/upload`, {
				method: 'POST',
				headers: {
					Authorization: $page.data.user.sessionToken,
				},
				body: formData,
			})
				.then((response) => response.json())
				.then(async (result) => {
					if (result.error) {
						setFadeMessage(result.message, 'warning');
					} else {
						setTimeout(async () => {
							theSignature.refresh();

							const response = (await post(`/auth/refresh`, {})) as unknown as EmpResponse;

							if (response.user) {
								console.log(response.user);
								invalidateAll();
							}
						}, 1);
					}
				})
				.catch((error) => {
					console.error('Error:', error);
					setFadeMessage(error.message, 'warning');
				});
		} catch (err: any) {
			console.error('Error:', err);
			setFadeMessage(err.message, 'warning');
		}
	}

	const joinOrgWithCode = async function () {
		let res = await api.post(
			'tnt/join',
			{ joincode: joinorgwithcode },
			$page.data.user.sessionToken,
		);
		if (res.error) setFadeMessage(res.message, 'warning');
	};
	onMount(() => {
		$pageName = $_('setting.tab.personal');
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
					{$_('setting.personal.nav')}
				</li>
			</ol>
		</nav>
	</Row>
	{#if errors?.description}
		<p class="error">{errors.description}</p>
	{/if}
	<form>
		<Row cols="1">
			<Col class="w-100 text-center fs-3">
				{$page.data.user.account}
				<br />
				{$page.data.user.group}
			</Col>
			<Col class="d-flex justify-content-center mt-2">
				<div>
					<Avatar
						eid={$page.data.user.eid}
						uname={$page.data.user.username}
						style={'avatar40'}
						bind:this={theAvatar} />
				</div>
			</Col>
			<Col class="d-flex justify-content-center mt-2">
				<!-- Input class="form-control" name="file" type="file" bind:files={avatarFiles} / -->
				<img
					class="upload"
					src="/images/camera_upload.png"
					alt=""
          role="none"
					on:keydown={() => {}}
					on:keyup={() => {}}
					on:keypress={() => {}}
					on:click={() => {
						avatarInput.click();
					}} />
			</Col>
			<Col class="d-flex justify-content-center">
				<div
					class="chan"
          role="none"
					on:keydown={() => {}}
					on:keyup={() => {}}
					on:keypress={() => {}}
					on:click={() => {
						avatarInput.click();
					}}>
					{$_('setting.personal.chooseavatar')}
				</div>
				<input
					style="display:none;"
					name="file"
					type="file"
					accept=".jpg, .jpeg, .png"
					on:change={async (e) => await uploadAvatar(e)}
					bind:this={avatarInput} />
			</Col>
		</Row>
		<Row
			cols="1"
			class="mt-3">
			<Col>
				<InputGroup class="mb-1">
					<InputGroupText>{$_('setting.personal.signature')}</InputGroupText>
					{#if $page.data.user.signature && $page.data.user.signature.startsWith('http')}
						<img
							alt="signature"
							src={`${$page.data.user.signature}`}
							class="kfk-signature" />
					{:else}
						<div class="kfk-textsignature">
							<Signature
								signature={user.signature}
								cn={user.username}
								eid={user.eid}
								bind:this={theSignature} />
						</div>
					{/if}
					<Input
						bind:value={signaturVal}
						placeholder="use public accessible image url or plain text" />

					<div>
						<div
							class="upload-btn"
          role="none"
							on:keydown={() => {}}
							on:keyup={() => {}}
							on:keypress={() => {}}
							on:click={async (e) => {
								signatureInput.click();
							}}>
							{$_('setting.personal.upload')}
						</div>
						<input
							style="display:none;"
							name="file"
							type="file"
							accept=".jpg, .jpeg, .png"
							on:change={async (e) => await uploadSignature(e)}
							bind:this={signatureInput} />
					</div>
					<Button
						on:click={async (e) => {
							e.preventDefault();
							await setPersonal({ signature: signaturVal });
						}}>
						{$_('setting.set')}
					</Button>
				</InputGroup>
			</Col>
			<Col>
				<InputGroup class="mb-1">
					<InputGroupText>{$_('setting.personal.cn')}</InputGroupText>
					<input
						class="form-control"
						type="text"
						autocomplete="username"
						placeholder="Username"
						bind:value={user.username} />
					<Button
						on:click={async (e) => {
							e.preventDefault();
							await setPersonal({ username: user.username, account: user.account });
						}}>
						{$_('setting.set')}
					</Button>
				</InputGroup>
			</Col>
			{#if tips.username}
				<Col>{tips.username}</Col>
			{/if}

			<Col>
				<InputGroup class="mb-1">
					<InputGroupText>{$_('setting.personal.currentpassword')}</InputGroupText>
					<input
						class="form-control"
						type="password"
						placeholder="Old Password"
						autocomplete="current-password"
						bind:value={my_old_password} />
					<InputGroupText>{$_('setting.personal.newpassword')}</InputGroupText>
					<input
						class={newPasswordCssClasses}
						type="password"
						autocomplete="new-password"
						placeholder="New Password"
						bind:value={user.password}
						on:input={(e) => {
							e.preventDefault();
							onInputNewPassword();
						}}
						aria-describedby={'validationNewPasswordFeedback'} />
					<Button
						disabled={enableChangePasswordButton === false}
						on:click={async (e) => {
							e.preventDefault();
							await setPersonal({
								oldpassword: my_old_password,
								password: $page.data.user.password,
							});
						}}>
						{$_('setting.set')}
					</Button>
				</InputGroup>
			</Col>
			{#if newPasswordCssClasses === 'form-control is-invalid'}
				<Col class="d-flex justify-content-end">
					<div class="me-5">
						<div class="me-5">
							{newPasswordCheckingMsgs}
						</div>
					</div>
				</Col>
			{/if}
			<Col class="mt-5 text-center fs-3">
				{$_('setting.personal.currentTenant', { values: { tenant: user.tenant.name } })}
			</Col>
			<Col>
				<InputGroup class="mb-1">
					<InputGroupText>{$_('setting.personal.nickname')}</InputGroupText>
					<input
						class="form-control"
						type="text"
						autocomplete="nickname"
						placeholder="Username"
						bind:value={user.nickname} />
					<Button
						on:click={async (e) => {
							e.preventDefault();
							await setPersonal({ nickname: user.nickname, eid: user.eid });
						}}>
						{$_('setting.set')}
					</Button>
				</InputGroup>
			</Col>
			{#if tips.nickname}
				<Col>{tips.nickname}</Col>
			{/if}
			<Col>
				<InputGroup class="mb-1">
					<InputGroupText>{$_('setting.personal.sendmail')}</InputGroupText> &nbsp;&nbsp;
					<span class="form-control">
						<div class="fc-l">
							<Input
								type="checkbox"
								id="check_email"
								bind:checked={notifyMode.email} />
							{$_('setting.personal.email')}
						</div>
						<div class="fc-l">
							<Input
								type="checkbox"
								id="check_sms"
								bind:checked={notifyMode.sms} />
							{$_('setting.personal.sms')}
						</div>
						<div class="fc-l">
							<Input
								type="checkbox"
								id="check_wecom"
								bind:checked={notifyMode.wecom} />
							{$_('setting.personal.wecom')}
						</div>
					</span>
					<Button
						on:click={async (e) => {
							e.preventDefault();
							onNotifyModeChange();
							await setPersonal({ action: 'setNotify' });
						}}>
						{$_('setting.set')}
					</Button>
				</InputGroup>
			</Col>
			<!-- Col>
				<InputGroup class="mb-1">
					<InputGroupText>{$_('setting.personal.joincode')}</InputGroupText>
					<Input
						type="text"
						bind:value={joinorgwithcode}
						placeholder="join code"
						autocomplete="off"
					/>
					<Button
						on:click={async (e) => {
							e.preventDefault();
							await joinOrgWithCode();
						}}
					>
						{$_('setting.set')}
					</Button>
				</InputGroup>
			</Col -->
			<Col class="mt-5 text-center fs-3">
				{$_('setting.personal.currentMenuGroup', { values: { mg: user.mg } })}
			</Col>
		</Row>
	</form>
</Container>
{#if $debugOption === 'yes'}
	<pre><code>
			{$page.data.user.sessionToken}
</code></pre>
{/if}

<style>
	.upload {
		display: flex;
		height: 40px;
		width: 40px;
		cursor: pointer;
	}
	.chan {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-flow: column;
	}
	.fc-l {
		display: inline-flex;
		flex-direction: row;
		width: auto;
		margin: 0 10px;
	}
	.upload-btn {
		height: 100%;
		width: auto;
		padding: 0 16px;
		border: 1px solid #999;
		border-radius: 3px;
		display: flex;
		align-items: center;
	}
</style>
