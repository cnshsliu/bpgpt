<script lang="ts">
	import { _ } from '$lib/i18n';
	import { Container, Row, Col } from 'sveltestrap';
	import { page } from '$app/stores';
	import { setFadeMessage } from '$lib/Notifier';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/Toast';
	import { post, getUrlQuery } from '$lib/utils';
	import type { EmpResponse } from '$lib/types';
	import { Input, Card, NavLink } from 'sveltestrap';
	import { onMount } from 'svelte';

	let old_password: string = '';
	let new_password: string = '';
	let login_wait: number = -1;
	let errResponse: any = { error: '', message: '' };
	let isUserValid: string = '';
	let isPwdValid: string = '';
	let in_progress = false;

	onMount(async () => {});

	const setPersonal = async function (value: any) {
		in_progress = true;
		let payload: Record<string, any> = {
			value: value,
		};
		const response = (await post(`/auth/update`, payload)) as unknown as EmpResponse;

		console.log(response.error, response.message);
		if (response.error) {
			if (
				response.error === 'Bad Request' &&
				response.message &&
				response.message.indexOf('length must be at least 6') > -1
			) {
				setFadeMessage($_('setting.personal.newpassword_wrong'));
			} else if (['wrong_password', '原密码不正确'].indexOf(response.error) >= 0) {
				setFadeMessage($_('setting.personal.old_password_wrong'));
			}
		} else {
			setFadeMessage('修改成功, 请返回');
		}

		in_progress = false;
	};
</script>

<svelte:head>
	<title>Change Password</title>
</svelte:head>

<div
	class="container align-self-center"
	style="max-width: 400px;">
	<Row cols="1">
		<Col>
			<h1 class="text-center mt-5">修改密码</h1>
		</Col>
		<Col>
			<div class="login-box">
				<div class="form-floating flex-fill">
					<Input
						class={'form-control form-control-lg mt-4 ' + isUserValid}
						id="input-old-password"
						name="old_password"
						required
						type="password"
						placeholder="原密码"
						bind:value={old_password} />
					<label for="input-old-password">原密码</label>
					<div
						id="validationServerUsernameFeedback"
						class="invalid-feedback">
						{#if errResponse.error && errResponse.message}
							{errResponse.message}
						{/if}
					</div>
				</div>
				<div class="form-floating flex-fill has-validation">
					<Input
						class={'form-control form-control-lg mt-3 ' + isPwdValid}
						id="input-password"
						type="password"
						required
						placeholder="新密码"
						autocomplete="current-password"
						bind:value={new_password} />
					<label for="input-password">新密码</label>
				</div>
				<div class="w-100 d-flex justify-content-end">
					<button
						class="w-100 btn btn-lg btn-primary pull-xs-right mt-5"
						type="submit"
						on:click={async (e) => {
							e.preventDefault();
							await setPersonal({
								oldpassword: old_password,
								password: new_password,
							});
						}}>
						提交修改
					</button>
				</div>
			</div>
		</Col>
	</Row>
	<div class="mx-auto text-center">
		<br />
		<a
			href="/"
			class="kfk-a">
			返回
		</a>
	</div>
</div>

<style>
	.login-box {
		max-width: 400px;
		/* height: 300px; */
		box-shadow: rgb(204, 204, 204) 2px 2px 9px;
		position: relative;
		border-width: 1px;
		border-style: solid;
		border-color: rgb(236, 236, 236);
		border-image: initial;
		border-radius: 4px;
		margin: 20px auto;
		padding: 20px;
		background: #fff;
	}
</style>
