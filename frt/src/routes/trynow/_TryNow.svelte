<script lang="ts">
	import { _ } from '$lib/i18n';
	import { whereAfterLogin } from '$lib/Stores';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	let user = $page.data.user;
	export let tryid: string;
	export let what: Record<string, string | number | boolean>;
</script>

<div class="mt-3 fs-3 fw-bold">
	{$_('evaluate.youwill')}
</div>
<div
	class="card w-100 my-3"
	style="width: 18rem;">
	<div class="card-body">
		<h5 class="card-title">{what.name}</h5>
		<h6 class="card-subtitle mb-2 text-muted">{what.tags}</h6>
		<p class="card-text">{what.desc}</p>
		{#if user}
			<a
				href={`/trynow/${tryid}/start`}
				class="card-link kfk-link">
				{$_('evaluate.start', { values: { account: user.eid } })}
			</a>
		{:else}
			<!-- Seems that you have not logged in, would you like to create a new account or use a exiting -->
			<!-- account or try annonymsly? -->
			<div class="fs-4 fw-bold">{$_('evaluate.account.prompt')}</div>
			<ul>
				<li>
					<a
						class="nodecoration kfk-link"
						href={'#'}
						on:click={() => {
							//在用户成功登录以后，转向到(authed)页面组中的trynow
							$whereAfterLogin = `/trynow/${tryid}`;
							goto('/login');
						}}>
						{$_('evaluate.account.login')}
					</a>
				</li>
				<li>
					<a
						class="nodecoration kfk-link"
						href={'#'}
						on:click={() => {
							//在用户注册并成功登录以后，转向到(authed)页面组中的trynow
							$whereAfterLogin = `/trynow/${tryid}`;
							goto('/register');
						}}>
						{$_('evaluate.account.register')}
						<!-- I dont' have a account, and i'd like to register new one before try -->
					</a>
				</li>
				<li>
					<a
						class="nodecoration kfk-link"
						href={'#'}
						on:click={() => {
							//在用户注册并成功登录以后，转向到(authed)页面组中的trynow
							$whereAfterLogin = `/trynow/${tryid}`;
							goto('/withDemoAccount');
						}}>
						{$_('evaluate.account.demo')}
						<!-- If you are in hurry, Try under a demo account on-click. However, your data during try will -->
						<!-- not be kept, Strongly suggest you to register a new account. -->
					</a>
				</li>
			</ul>
		{/if}
	</div>
</div>
