<script lang="ts">
	import { _ } from '$lib/i18n';
	import { Card, CardHeader, CardBody, Row, Col } from 'sveltestrap';
	import TimeTool from '$lib/TimeTool';

	export let editlogfor: string;
	export let editlogs: any;
</script>

<Card class="card ms-0 border-3 border-primary">
	<CardHeader>
		<Row>
			<div class="col fs-5 fw-bold">
				{$_('template.editlog.title')}
			</div>
			<div class="col col-auto">
				<div
					class="btn btn-primary"
					color="primary"
					on:click|preventDefault={(e) => {
						e.preventDefault();
						editlogfor = '';
					}}
          role="none"
					on:keydown={() => {}}
					on:keyup={() => {}}
					on:keypress={() => {}}>
					{$_('button.closeeditlog')}
				</div>
			</div>
		</Row>
	</CardHeader>
	<CardBody>
		{#each editlogs as elog}
			<Row>
				<Col>
					{TimeTool.format(elog.updatedAt, 'YYYY-MM-DD HH:mm:ss')}
				</Col><Col>
					{elog.editorName}
				</Col>
				<Col>{elog.editor}</Col>
			</Row>
		{/each}
	</CardBody>
</Card>
