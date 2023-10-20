<script lang="ts">
	import { Icon } from 'sveltestrap';
	export let icon: string;
	export let ani: string;
</script>

<div class={'iconDiv' + ' ' + ani}><Icon name={icon} /></div>
