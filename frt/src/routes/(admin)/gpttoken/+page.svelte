<script lang="ts">
	import * as empAPI from '$lib/api';
	import { page } from '$app/stores';
	let account = '';
	let days = 1;
	let key = '';
	let keyType = 'chatgpt_api_key';
	let res = '';

	const doUpdate = () => {
		key = key.trim();
		empAPI
			.post(
				'/caishen/setKey',
				{
					account: account,
					key: key,
					keyType: keyType,
				},
				$page.data.user.sessionToken,
			)
			.then((r) => {
				res = r;
				console.log(res);
			});
	};
</script>

<div class="container">
	Account: <input
		type="text"
		bind:value={account} />
	<div>
		Type:
		<div class="form-check">
			<input
				class="form-check-input"
				type="radio"
				name="shareitRadios"
				id={`shareitRadios-0`}
				bind:group={keyType}
				value={'chatgpt_api_key'}
				checked={true} />
			<label
				class="form-check-label"
				for="shareitRadios-0">
				chatgpt_api_key
			</label>
		</div>
	</div>
	<div class="form-check">
		<input
			class="form-check-input"
			type="radio"
			name="shareitRadios"
			id={`shareitRadios-1`}
			bind:group={keyType}
			value={'chatglm_api_key'}
			checked={false} />
		<label
			class="form-check-label"
			for="shareitRadios-1">
			chatglm_api_key
		</label>
	</div>
	API Key:
	<input
		type="text"
		class="w-100"
		bind:value={key} />
	Days:
	<input
		type="text"
		bind:value={days} />
	<button
		class="btn btn-primary"
		on:click={() => {
			key = 'GIVE_TMP_CHATGPT_API_KEY_' + Number(days) * 24 * 60 * 60;
		}}>
		Set days
	</button>

	<div>
		<button
			class="btn btn-primary"
			on:click={() => {
				doUpdate();
			}}>
			Confirm update
		</button>
	</div>
	{res}
</div>
