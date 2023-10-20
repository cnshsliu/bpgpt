<script lang="ts">
	import { _ } from '$lib/i18n';
</script>

<div class="pricearea">
	<div class="container masthead-followup px-4 px-md-3 border-top border-5 border-primary">
		<section class="row mt-5 pb-md-4 align-items-stretch">
			<div class="col-12 text-center fs-1 mb-3">{$_('home.price.title')}</div>
			<div class="col-12 col-md-6 col-lg-3 pb-3">
				<div class="card h-100">
					<div class="card-body">
						<h5 class="card-title">{$_('home.price.tiers.free.title')}</h5>
						<div class="card-subtitle mb-2 text-primary">
							<span class="fs-6">
								{$_('home.price.tiers.free.unit')}
							</span>
							<span class="fs-3">{$_('home.price.tiers.free.price')}</span>
							<span class="fs-6">/{$_('home.price.tiers.free.per')}</span>
						</div>
						<hr />
						<p class="fs-6 mt-3">{@html $_('home.price.tiers.free.for')}</p>
						<a
							href="/template"
							class="btn btn-lg btn-outline-primary mb-3">
							{$_('home.price.tiers.free.btn')}
						</a>
					</div>
				</div>
			</div>
			<div class="col-12 col-md-6 col-lg-3 pb-3">
				<div class="card h-100">
					<div class="card-body">
						<h5 class="card-title">{$_('home.price.tiers.tier1.title')}</h5>
						<div class="card-subtitle mb-2 text-primary">
							<span class="fs-6">{$_('home.price.tiers.tier1.unit')}</span>
							<span class="fs-3">{$_('home.price.tiers.tier1.price')}</span>
							<span class="fs-6">/{$_('home.price.tiers.tier1.per')}</span>
						</div>
						<hr />
						<p class="fs-6 mt-3">{@html $_('home.price.tiers.tier1.for')}</p>
						<a
							href="/template"
							class="btn btn-lg btn-outline-primary mb-3">
							{$_('home.price.tiers.tier1.btn')}
						</a>
					</div>
				</div>
			</div>
			<div class="col-12 col-md-6 col-lg-3 pb-3">
				<div class="card h-100">
					<div class="card-body">
						<h5 class="card-title">{$_('home.price.tiers.tier2.title')}</h5>
						<div class="card-subtitle mb-2 text-primary">
							<span class="fs-6">{$_('home.price.tiers.tier2.unit')}</span>
							<span class="fs-3">{$_('home.price.tiers.tier2.price')}</span>
							<span class="fs-6">/{$_('home.price.tiers.tier2.per')}</span>
						</div>
						<hr />
						<p class="fs-6 mt-3">{@html $_('home.price.tiers.tier2.for')}</p>
						<a
							href="/template"
							class="btn btn-lg btn-outline-primary mb-3">
							{$_('home.price.tiers.tier2.btn')}
						</a>
					</div>
				</div>
			</div>
			<div class="col-12 col-md-6 col-lg-3 pb-3">
				<div class="card h-100">
					<div class="card-body">
						<h5 class="card-title">{$_('home.price.tiers.tier3.title')}</h5>
						<div class="card-subtitle mb-2 text-primary">
							<span class="fs-6">{$_('home.price.tiers.tier3.unit')}</span>
							<span class="fs-3">{$_('home.price.tiers.tier3.price')}</span>
							<span class="fs-6">/{$_('home.price.tiers.tier3.per')}</span>
						</div>
						<hr />
						<p class="fs-6 mt-3">{@html $_('home.price.tiers.tier3.for')}</p>
						<a
							href="/template"
							class="btn btn-lg btn-outline-primary mb-3">
							{$_('home.price.tiers.tier3.btn')}
						</a>
					</div>
				</div>
			</div>
			<div class="col-12 pb-3">
				<div class="card h-100">
					<div class="card-body">
						<h5 class="card-title">{$_('home.privatedeploy.title')}</h5>
						<p>
							{$_('home.privatedeploy.content')}
						</p>
						<a
							href="/template"
							class="btn btn-lg btn-outline-primary mb-3">
							{$_('home.privatedeploy.btn')}
						</a>
					</div>
				</div>
			</div>
		</section>

		<section class="row my-5 pb-md-4 align-items-center">
			<div class="col-12">
				<div class="d-inline-block mb-2 text-white bg-info">
					<i
						class="bi-piggy-bank mx-2"
						style="font-size: 2rem;" />
				</div>
				<span class="display-5 fw-normal ms-3">Referral Program</span>
				<p class="lead fw-normal">
					Join our referral program to get 10% of paied tier subscription for 3 years, or 5% of
					private deployment order you refer to us.
				</p>
				<p>
					Send your referrer code to your known friends, once they register their account on
					metatocome.com, they could provid your referrer code to us, within 3 years, at the end of
					each subscription period, we will reward 10% of the subscription order value to you.
				</p>
				<p>
					If it's a private deployment, you will get your 5% order value reward right after the
					client pay.
				</p>
				<a
					href="/referer"
					class="btn btn-lg btn-outline-primary mb-3">
					Get your referrer code
				</a>
			</div>
		</section>
	</div>
</div>

<style>
	.pricearea {
		padding: 3rem 0;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0), #0000ff13);
		/* background: linear-gradient(145deg, rgba(255, 255, 255, 0.5), #2726ff66); */
	}
</style>
