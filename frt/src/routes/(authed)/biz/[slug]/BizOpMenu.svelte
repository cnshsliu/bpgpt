<script lang="ts">
	import { _ } from '$lib/i18n';
	export let bizname: string;
</script>

<div>
	<a
		class="kfk-link"
		href="/template/start?tplid={bizname}">
		<i class="bi bi-caret-right-square-fill">{$_('biz.op.startProcess')}</i>
	</a>
	<a
		class="kfk-link ps-3"
		href="/template/{bizname}&read">
		<i class="bi bi-eye-fill">{$_('biz.op.seeDesign')}</i>
	</a>
	<a
		class="kfk-link ps-3"
		href="/template/{bizname}&edit">
		<i class="bi bi-pencil-fill">{$_('biz.op.editDesign')}</i>
	</a>
</div>
