<script lang="ts">
	import { goto } from '$app/navigation';
	import { createEventDispatcher } from 'svelte';
	let dispatch = createEventDispatcher();
</script>

<div>
	看起来你还没有登录，
	<a
		href={'#'}
		on:click|preventDefault={() => {
			goto('/caishenlogin');
		}}
		class="btn btn-primary btn-sm">
		请登录
	</a>
	，如果还没有帐号，
	<a
		href={'#'}
		on:click|preventDefault={() => {
			// dispatch('showHelp');
			goto('/caishenregister');
		}}
		class="kfk-a">
		可注册一个新账号
	</a>
</div>
