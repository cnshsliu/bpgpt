<script lang="ts">
	import Contact from '$lib/homepage/contact.svelte';
</script>

<body>
	<div
		class="contactus text-center"
		style="padding-top: 200px;">
		&nbsp;
	</div>

	<Contact />
</body>

<style>
	.contactus {
		height: 300px;
		background-size: 220%;
	}
	body {
		background: linear-gradient(rgba(255, 55, 255, 0.8), rgba(255, 155, 25, 0.8)),
			url('/svg/yarknode.svg') no-repeat top;
	}
</style>
