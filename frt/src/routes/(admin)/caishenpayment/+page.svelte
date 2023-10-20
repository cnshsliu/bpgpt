<script lang="ts">
	import * as empAPI from '$lib/api';
	import { page } from '$app/stores';
	let account = '';
	let days = 30;
	let key = '';
	let keyType = 'month';
	let res = '';

	$: days = keyType === 'month' ? 30 : keyType === 'season' ? 90 : 365;

	const doUpdate = () => {
		key = key.trim();
		console.log($page.data.user.sessionToken);
		empAPI
			.post(
				'/caishen/buycard',
				{
					account: account,
					days,
				},
				$page.data.user.sessionToken,
			)
			.then((r) => {
				console.log(r.error);
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
				value={'month'}
				checked={true} />
			<label
				class="form-check-label"
				for="shareitRadios-0">
				Month
			</label>
		</div>
		<div class="form-check">
			<input
				class="form-check-input"
				type="radio"
				name="shareitRadios"
				id={`shareitRadios-0`}
				bind:group={keyType}
				value={'season'}
				checked={true} />
			<label
				class="form-check-label"
				for="shareitRadios-0">
				Season
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
			value={'year'}
			checked={false} />
		<label
			class="form-check-label"
			for="shareitRadios-1">
			Year
		</label>
	</div>
	Days:
	<input
		type="text"
		bind:value={days} />

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
