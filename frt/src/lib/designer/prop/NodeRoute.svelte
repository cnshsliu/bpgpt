<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import {
		Row,
		Col,
		Card,
		CardHeader,
		CardTitle,
		CardBody,
		Dropdown,
		DropdownToggle,
		DropdownMenu,
		DropdownItem,
		Icon,
		Input,
		NavLink,
		Button,
		InputGroup,
		InputGroupText,
	} from 'sveltestrap';
	import AniIcon from '$lib/AniIcon.svelte';
	import { _ } from '$lib/i18n';
	import * as utils from '$lib/utils';
	import { createEventDispatcher, setContext, getContext } from 'svelte';
	const dispatch = createEventDispatcher();
	export let jq: any;
	export let KFK: any;
	export let readonly: boolean;

	//TODO: readonly

	const prop: any = getContext('theProp');

	let overredFromNodeIndex = -1;
	let overredToNodeIndex = -1;
	let thisNodeId = prop.id;

	let newFromId: string = '';
	let newToId: string = '';
	let newFromOption: string = '';
	let newToOption: string = '';
	let theNode = jq(`#${thisNodeId}`);
	let allNodes = KFK.JC3.find('.kfknode');
	let canLinkFromNodes: any[] = [];
	let canLinkToNodes: any[] = [];
	let linksToThisNode: any[] = [];
	let linksFromThisNode: any[] = [];
	let freejumpable: string[] = [];
	let freejumpable_selected = 0;

	const refreshData = () => {
		canLinkToNodes = [];
		canLinkFromNodes = [];
		linksToThisNode = KFK.tpl.find(`.link[to="${thisNodeId}"]`);
		linksFromThisNode = KFK.tpl.find(`.link[from="${thisNodeId}"]`);

		for (let i = 0; i < allNodes.length; i++) {
			let tmpId = jq(allNodes[i]).attr('id');
			if (tmpId !== thisNodeId) {
				if (
					tmpId !== 'start' &&
					KFK.tpl.find(`.link[from="${thisNodeId}"][to="${tmpId}"]`).length == 0 &&
					KFK.tpl.find(`.link[to="${thisNodeId}"][from="${tmpId}"]`).length == 0
				) {
					canLinkToNodes.push(jq(allNodes[i]));
				}
				if (
					tmpId !== 'end' &&
					KFK.tpl.find(`.link[from="${tmpId}"][to="${thisNodeId}"]`).length == 0 &&
					KFK.tpl.find(`.link[to="${tmpId}"][from="${thisNodeId}"]`).length == 0
				) {
					canLinkFromNodes.push(jq(allNodes[i]));
				}
			}
		}

		refreshFreeJumpable();
	};

	const refreshFreeJumpable = () => {
		freejumpable = [];
		if (!prop.freejump.trim()) return;

		let re = new RegExp(prop.freejump.trim());
		for (let i = 0; i < allNodes.length; i++) {
			let tmpId = jq(allNodes[i]).attr('id');
			if (tmpId === thisNodeId) {
				continue;
			}
			let aNodeText = jq(allNodes[i]).find('p').text().trim();
			if (aNodeText.match(re)) {
				freejumpable.push(aNodeText);
			}
		}
	};

	refreshData();

	const deleteOneLink = async (jLink: any) => {
		const connect_id = `connect_${jLink.attr('from')}_${jLink.attr('to')}`;
		await KFK.removeConnectById(connect_id);
		refreshData();
	};

	const reverseOneLink = async (jLink: any) => {
		if (jLink.attr('from') === 'start' || jLink.attr('to') === 'end') return;
		const caseValue = jLink.attr('case');
		const fromNode = jq(`#${jLink.attr('from')}`);
		const toNode = jq(`#${jLink.attr('to')}`);
		await deleteOneLink(jLink);
		const new_connect_id = await KFK.buildConnectionBetween(toNode, fromNode);
		await KFK.redrawLinkLines(toNode, 'connect');
		if (caseValue && caseValue.trim()) {
			await KFK.setConnectText(jq(`.${new_connect_id}`), caseValue.trim());
			await KFK.redrawLinkLines(toNode, 'connect');
		}
		refreshData();
	};

	const addOneFrom = async () => {
		if (!newFromId) return;
		const newFrom = jq(`#${newFromId}`);
		const connect_id = KFK.buildConnectionBetween(newFrom, theNode);
		await KFK.redrawLinkLines(newFrom, 'connect');
		if (newFromId !== 'start') {
			await KFK.setConnectText(jq(`.${connect_id}`), newFromOption.trim());
			await KFK.redrawLinkLines(newFrom, 'connect');
		}
		refreshData();
	};
	const addOneTo = async () => {
		if (!newToId) return;
		const newTo = jq(`#${newToId}`);
		const connect_id = KFK.buildConnectionBetween(theNode, newTo);
		await KFK.redrawLinkLines(theNode, 'connect');
		if (newToId !== 'end') {
			await KFK.setConnectText(jq(`.${connect_id}`), newToOption.trim());
			await KFK.redrawLinkLines(theNode, 'connect');
		}
		refreshData();
	};

	const onOptionChanged = async (e: Event, link: any) => {
		let changedOption = (e.target as HTMLInputElement)?.value;
		if (!changedOption.trim()) return;
		await KFK.setConnectText(
			jq(`.connect_${jq(link).attr('from')}_${thisNodeId}`),
			changedOption.trim(),
		);
		await KFK.redrawLinkLines(jq(`#${jq(link).attr('from')}`), 'connect');
		refreshData();
	};
</script>

<Card>
	<CardHeader>
		<CardTitle>{$_('prop.action.route.from')}:</CardTitle>
	</CardHeader>
	<CardBody>
		<table class="w-100">
			{#each linksToThisNode as link, index}
				<tr class={overredFromNodeIndex === index ? 'bg-success bg-opacity-25' : ''}>
					<td>
						{index + 1}: {jq(`#${jq(link).attr('from')}`)
							.find('p')
							.text()
							.trim()}
					</td>
					<td>
						{#if jq(link).attr('from') === 'start'}
							&nbsp;
						{:else}
							<input
								disabled={readonly}
								type="text"
								value={jq(`.connect_${jq(link).attr('from')}_${thisNodeId}_text`)
									.find('tspan')
									.text()}
								on:blur={async (e) => {
									e.preventDefault();
									onOptionChanged(e, link);
								}} />
						{/if}
					</td>
					<td class="text-end">
						{#if !readonly}
							{#if jq(link).attr('from') !== 'start'}
								<a
									href={void 0}
									on:click={async (e) => {
										e.preventDefault();
										await reverseOneLink(jq(link));
									}}
									on:mouseover={(e) => {
										e.preventDefault();
										overredFromNodeIndex = index;
									}}
									on:mouseout={(e) => {
										e.preventDefault();
										overredFromNodeIndex = -1;
									}}
									on:focus={(e) => {
										e.preventDefault();
										overredFromNodeIndex = index;
									}}
									on:blur={(e) => {
										e.preventDefault();
										overredFromNodeIndex = -1;
									}}
									class="m-0 p-0 kfk-link">
									<AniIcon
										icon="arrow-left-right"
										ani="aniShake" />
								</a>
							{/if}
							<a
								href={void 0}
								on:click={async (e) => {
									e.preventDefault();
									await deleteOneLink(jq(link));
								}}
								on:mouseover={(e) => {
									e.preventDefault();
									overredFromNodeIndex = index;
								}}
								on:mouseout={(e) => {
									e.preventDefault();
									overredFromNodeIndex = -1;
								}}
								on:focus={(e) => {
									e.preventDefault();
									overredFromNodeIndex = index;
								}}
								on:blur={(e) => {
									e.preventDefault();
									overredFromNodeIndex = -1;
								}}
								class="m-0 ms-3 p-0 kfk-link">
								<AniIcon
									icon="x-circle"
									ani="aniShake" />
							</a>
						{/if}
					</td>
				</tr>
			{/each}
			{#if !readonly}
				<tr>
					<td>
						<select
							disabled={readonly}
							class="form-control"
							bind:value={newFromId}
							on:change={async (e) => {
								e.preventDefault();
							}}>
							<option value={''}>{$_('prop.action.route.pickone')}</option>
							{#each canLinkFromNodes as jqNode}
								<option value={jqNode.attr('id')}>
									{jqNode.find('p').text().trim()}
								</option>
							{/each}
						</select>
					</td>
					<td>
						<Input
							type="text"
							placeholder={$_('prop.action.route.option')}
							bind:value={newFromOption} />
					</td>
					<td class="text-end">
						{#if newFromId}
							<a
								href={void 0}
								on:click={async (e) => {
									e.preventDefault();
									await addOneFrom();
								}}
								class="m-0 p-0 kfk-link">
								<AniIcon
									icon="plus-circle-fill"
									ani="aniShake" />
							</a>
						{/if}
					</td>
				</tr>
			{/if}
		</table>
	</CardBody>
</Card>
<Card>
	<CardHeader>
		<CardTitle>{$_('prop.action.route.to')}:</CardTitle>
	</CardHeader>
	<CardBody>
		<table class="w-100">
			{#each linksFromThisNode as link, index}
				<tr class={overredToNodeIndex === index ? 'bg-success bg-opacity-25' : ''}>
					<td>
						{index + 1}: {jq(`#${jq(link).attr('to')}`)
							.find('p')
							.text()
							.trim()}
					</td>
					<td>
						{#if jq(link).attr('to') === 'end'}
							&nbsp;
						{:else}
							<Input
								disabled={readonly}
								type="text"
								placeholder={$_('prop.action.route.option')}
								value={jq(`.connect_${thisNodeId}_${jq(link).attr('to')}_text`)
									.find('tspan')
									.text()}
								on:blur={async (e) => {
									e.preventDefault();
									onOptionChanged(e, link);
								}} />
						{/if}
					</td>
					<td class="text-end">
						{#if !readonly}
							{#if jq(link).attr('to') !== 'end'}
								<a
									href={void 0}
									on:click={async (e) => {
										e.preventDefault();
										await reverseOneLink(jq(link));
									}}
									on:mouseover={(e) => {
										e.preventDefault();
										overredToNodeIndex = index;
									}}
									on:mouseout={(e) => {
										e.preventDefault();
										overredToNodeIndex = -1;
									}}
									on:focus={(e) => {
										e.preventDefault();
										overredToNodeIndex = index;
									}}
									on:blur={(e) => {
										e.preventDefault();
										overredToNodeIndex = -1;
									}}
									class="m-0 p-0 kfk-link">
									<AniIcon
										icon="arrow-left-right"
										ani="aniShake" />
								</a>
							{/if}
							<a
								href={void 0}
								on:click={async (e) => {
									e.preventDefault();
									await deleteOneLink(jq(link));
								}}
								on:mouseover={(e) => {
									e.preventDefault();
									overredToNodeIndex = index;
								}}
								on:mouseout={(e) => {
									e.preventDefault();
									overredToNodeIndex = -1;
								}}
								on:focus={(e) => {
									e.preventDefault();
									overredToNodeIndex = index;
								}}
								on:blur={(e) => {
									e.preventDefault();
									overredToNodeIndex = -1;
								}}
								class="m-0 ms-3  p-0 kfk-link">
								<AniIcon
									icon="x-circle"
									ani="aniShake" />
							</a>
						{/if}
					</td>
				</tr>
			{/each}
			{#if !readonly}
				<tr>
					<td>
						<select
							class="form-control"
							bind:value={newToId}
							on:change={async (e) => {
								e.preventDefault();
							}}>
							<option value={''}>{$_('prop.action.route.pickone')}</option>
							{#each canLinkToNodes as jqNode}
								<option value={jqNode.attr('id')}>
									{jqNode.find('p').text().trim()}
								</option>
							{/each}
						</select>
					</td>
					<td>
						<Input
							type="text"
							placeholder={$_('prop.action.route.option')}
							bind:value={newToOption} />
					</td>
					<td class="text-end">
						{#if newToId}
							<a
								href={void 0}
								on:click={async (e) => {
									e.preventDefault();
									await addOneTo();
								}}
								class="m-0 p-0 kfk-link">
								<AniIcon
									icon="plus-circle-fill"
									ani="aniShake" />
							</a>
						{/if}
					</td>
				</tr>
			{/if}
		</table>
	</CardBody>
</Card>
<Col class="mt-1">
	<InputGroup size="sm">
		<InputGroupText>
			{$_('prop.action.route.freejump')}
		</InputGroupText>
		<Input
			id="input_freejump"
			class="ms-3"
			bind:value={prop.freejump}
			disabled={readonly}
			on:change={async (e) => {
				e.preventDefault();
				refreshFreeJumpable();
			}} />
		<Dropdown>
			<DropdownToggle caret>
				{$_('prop.action.route.freejumpable', { values: { tot: freejumpable.length } })}
			</DropdownToggle>
			<DropdownMenu>
				{#each freejumpable as fjable, index}
					<DropdownItem>{fjable}</DropdownItem>
				{/each}
			</DropdownMenu>
		</Dropdown>
	</InputGroup>
</Col>
