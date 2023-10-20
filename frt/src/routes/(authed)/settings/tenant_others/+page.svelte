<script lang="ts">
	import {
		Button,
		Container,
		Row,
		Col,
		InputGroup,
		InputGroupText,
		Label,
		Input,
		Card,
		CardBody,
		CardFooter,
		CardHeader,
		CardSubtitle,
		CardText,
		CardTitle,
	} from 'sveltestrap';
	import TimeZone from '$lib/Timezone';
	import TimeTool from '$lib/TimeTool';
	import { page } from '$app/stores';
	import { setFadeMessage } from '$lib/Notifier';
	import { onMount } from 'svelte';
	import TenantMenu from '$lib/tenantMenu.svelte';
	import { _ } from '$lib/i18n';
	import type { User, EmpResponse } from '$lib/types';
	import { post } from '$lib/utils';
	import * as api from '$lib/api';

	let myorg: any = {
		orgname: '',
		orgtheme: '',
		orgtimezone: '',
		orgleveltags: '',
		owner: '',
	};

	let orgname = '';

	async function refreshMyOrg() {
		myorg = await api.post('tnt/my/org', {}, $page.data.user.sessionToken);
		console.log(myorg);
	}

	onMount(async () => {
		try {
			await refreshMyOrg();
		} catch (e) {}
	});
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
						<InputGroup class="mb-1">
							<input
								class="ms-3 form-check-input"
								type="checkbox"
								bind:checked={myorg.allowemptypbo}
								on:change={async (e) => {
									e.preventDefault();

									let ret = await api.post(
										'tnt/set/allowemptypbo',
										{ allow: myorg.allowemptypbo },
										$page.data.user.sessionToken,
									);
									if (ret.error) {
										setFadeMessage(ret.message, 'warning');
									} else {
										if (ret.allowemptypbo) {
											setFadeMessage($_('setting.tenant.allowemptypbo_true'));
										} else {
											setFadeMessage($_('setting.tenant.allowemptypbo_false'));
										}
										console.log(ret.allowemptypbo);
									}
								}} />
							{$_('setting.tenant.allowemptypbo')}
						</InputGroup>
					</CardBody>
				</Card>
			</form>
		{:else}
			{myorg.allowemptypbo ? 'Allow Empty PBO' : 'Empty PBO not allowed'}
		{/if}
	</Container>
</form>
