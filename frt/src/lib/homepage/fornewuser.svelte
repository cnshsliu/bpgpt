<script lang="ts">
	import { _ } from '$lib/i18n';
	import { Accordion, AccordionItem, Nav, NavItem, NavLink } from 'sveltestrap';
</script>

<div class="container mt-5">
	<div class="row row-cols-1 text-center">
		<h1>{$_('home.title.fornewuser')}</h1>
	</div>
	<Accordion>
		<div class="row row-cols-1">
			<div class="col">
				<AccordionItem>
					<h4
						class="m-0"
						slot="header">
						{$_('home.faq.q1')}
					</h4>
					{$_('home.faq.a1')}
				</AccordionItem>
			</div>
			<div class="col">
				<AccordionItem>
					<h4
						class="m-0"
						slot="header">
						{$_('home.faq.q1')}
					</h4>
					{$_('home.faq.a1')}
				</AccordionItem>
			</div>
			<div class="col">
				<AccordionItem>
					<h4
						class="m-0"
						slot="header">
						{$_('home.faq.q1')}
					</h4>
					{$_('home.faq.a1')}
				</AccordionItem>
			</div>
			<div class="col">
				<AccordionItem>
					<h4
						class="m-0"
						slot="header">
						{$_('home.faq.q1')}
					</h4>
					{$_('home.faq.a1')}
				</AccordionItem>
			</div>
		</div>
	</Accordion>
</div>
