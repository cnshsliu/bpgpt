<script lang="ts">
	import { _ } from '$lib/i18n';
	import { Card, CardHeader, CardBody, Row, Col } from 'sveltestrap';
	import CronBuilder from '$lib/CronBuilder.svelte';
	import PDSResolver from '$lib/input/PDSResolver.svelte';
	import { setFadeMessage } from '$lib/Notifier';
	import { page } from '$app/stores';
	import * as api from '$lib/api';

	export let editCronFor: string;
	export let crons: any;
	export let tpl: any;
	export let cronexpr: string;
	export let cronStarters: string;

	let thePdsResolver: any;

	const addCron = async function (e: Event, tplid: string) {
		e.preventDefault();
		let ret = (await api.post(
			'template/addcron',
			{ tplid: tplid, expr: cronexpr, starters: cronStarters },
			$page.data.token,
		)) as unknown as any;
		if (ret.error) {
			setFadeMessage(ret.message);
		} else crons = ret;
	};

	const deleteCrontab = async function (e: Event, tplid: string, cronId: string) {
		e.preventDefault();
		crons = (await api.post(
			'template/delcron',
			{ id: cronId, tplid: tplid },
			$page.data.token,
		)) as unknown as any[];
	};
</script>

<Card class="card ms-0 border-3 border-primary">
	<CardHeader>
		<!-- svelte-ignore missing-declaration -->
		<Row>
			<div class="col fs-5 fw-bold">
				{$_('template.addcron.title')}
			</div>
			<Col class="col-auto">
				<div
					class="btn btn-primary m-1"
					color="primary"
					on:click={(e) => {
						e.preventDefault();
						editCronFor = '';
					}}
          role="none"
					on:keydown={() => {}}
					on:keyup={() => {}}
					on:keypress={() => {}}>
					{$_('button.closecronsetting')}
				</div>
			</Col>
		</Row>
	</CardHeader>
	<CardBody>
		{#if crons.length > 0}
			<Card class="mt-1">
				<CardHeader>
					<span class="fs-5 fw-bold mt-1">
						{$_('template.addcron.existing')}
					</span>
				</CardHeader>
				<CardBody>
					{#each crons as cron}
						<Row>
							<Col>{cron.starters}</Col><Col>
								<a
									class="kfk-link border border-primary rounded rounded-3"
									rel="external"
									href="https://crontab.guru/#{cron.expr.replace(/ /g, '_')}"
									target="_crontabgenerator">
									{cron.expr}
								</a>
							</Col>
							<Col>
								<div
									class="btn btn-primary btn-sm"
                  role="none"
									on:keydown={() => {}}
									on:click={async (e) => {
										await deleteCrontab(e, cron.tplid, cron._id);
									}}>
									Del
								</div>
							</Col>
						</Row>
					{/each}
				</CardBody>
			</Card>
		{/if}
		<Card class="mt-1">
			<CardHeader>
				<span class="fs-5 fw-bold mt-1">
					{$_('template.addcron.addnew')}
				</span>
			</CardHeader>
			<CardBody>
				{#if $page.data.user.group === 'ADMIN'}
					<Row>
						<!-- 只有管理员可以指定其它用户，普通用户没有这个输入框，只能自己用 -->
						<PDSResolver
							bind:this={thePdsResolver}
							bind:value={cronStarters}
							readonly={false}
							placeholder={$_('template.addcron.cronStarters_placeholder')}
							label={$_('template.addcron.cronStarters')}
							btnText={$_('button.check')} />
					</Row>
				{/if}
				<Row>
					<CronBuilder bind:cronexpr />
				</Row>
				<Row>
					<div
						class="btn btn-primary mt-3"
						color="primary"
            role="none"
						on:keydown={() => {}}
						on:keyup={() => {}}
						on:keypress={() => {}}
						on:click={(e) => {
							addCron(e, tpl.tplid);
						}}>
						{$_('button.addcron')}
					</div>
				</Row>
			</CardBody>
		</Card>
	</CardBody>
</Card>
