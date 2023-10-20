<script lang="ts">
	import { _ } from '$lib/i18n';
	import { page } from '$app/stores';
</script>

<div class="toparea">
	<div class="container px-4 px-md-3">
		<div class="row align-items-lg-center">
			<div class="col-8 mx-auto col-md-4 order-md-2 col-lg-5">
				<img
					alt="mtc"
					src="/svg/yarknode.svg"
					width="600"
					height="533"
					class="img-fluid mb-3 mb-md-0" />
			</div>
			<div class="col-md-8 order-md-1 col-lg-7 text-center text-md-start">
				<h1 class="mb-3">
					{@html $_('home.slogan')}
				</h1>
				<p class="lead mb-2">
					{@html $_('home.introduction')}
				</p>

				{#if !$page.data.user}
					<div class="container">
						<div class="row">
							<a
								href="/register"
								class="btn btn-lg btn-outline-primary mb-3">
								{$_('account.signup')}
							</a>
						</div>
						<div class="row d-flex justify-content-center">
							{$_('home.ifyouhaveaccount')}
							<a
								href="/login"
								class="btn btn-lg btn-outline-primary mb-3">
								{$_('account.signin')}
							</a>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.toparea {
		padding: 3rem 0;
		background: linear-gradient(145deg, rgba(255, 255, 255, 0.5), rgba(255, 155, 25, 0.8));
		/* background: linear-gradient(145deg, rgba(255, 255, 255, 0.5), #2726ff66); */
	}
</style>
