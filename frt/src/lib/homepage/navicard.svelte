<script lang="ts">
	import { _ } from '$lib/i18n';
	import { goto } from '$app/navigation';
	import { Container, Row, Col, InputGroup, Input, InputGroupText, Button } from 'sveltestrap';
	import { page } from '$app/stores';
	//import KShares from '../kshares/page.svelte';
	let homecardmouseover = -1;
	let homeCards = [
		{ title: $_('homecard.work.title'), body: $_('homecard.work.body'), target: '/work' },
		{
			title: $_('homecard.template.title'),
			body: $_('homecard.template.body'),
			target: '/template',
		},
		{
			title: $_('homecard.flexible.title'),
			body: $_('homecard.flexible.body'),
			target: '/flexible',
		},
		{
			title: $_('homecard.workflow.title'),
			body: $_('homecard.workflow.body'),
			target: '/workflow',
		},
		{ title: $_('homecard.discuss.title'), body: $_('homecard.discuss.body'), target: '/discuss' },
		//{ title: $_('homecard.help.title'), body: $_('homecard.help.body'), target: '/docs' },
		{
			title: $_('homecard.myfile.title'),
			body: $_('homecard.myfile.body'),
			target: '/settings/files',
		},
	];
</script>

<div class="container px-4 px-md-3">
	<div class="row row-cols-2 row-cols-sm-2 row-cols-md-3 row-cols-lg-6 d-flex">
		{#each homeCards as homecard, index}
			<div class="col-sm mt-5 d-flex align-items-stretch homecard flex-grow-1">
				<div
					class={'card text-center text-dark w-100 ' +
						(homecardmouseover === index ? 'bg-info' : 'bg-light')}
					on:focus={() => (homecardmouseover = index)}
					on:mouseover={(_) => {
						homecardmouseover = index;
					}}
					on:mouseout={() => (homecardmouseover = -1)}
					on:blur={() => (homecardmouseover = -1)}
          role="none"
					on:keydown={null}
					on:click={() => goto(homecard.target)}>
					<div class="card-header  bg-success bg-opacity-10 bg-gradient">
						<div class="col fw-bolder fs-4">
							{homecard.title}
						</div>
					</div>
					<div class="card-body">
						{homecard.body}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.function {
		border: 1px solid #ccc;
		border-radius: 5px;
		margin: 0.5rem;
		width: 10rem;
		height: 6.18rem;
	}
</style>
