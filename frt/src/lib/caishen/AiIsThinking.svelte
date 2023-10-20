<script lang="ts">
	export let color: string = 'blue';
</script>

<div class="text-center">
	<div class={'thinking-dot ' + color + '_dot'}></div>
	<div class={'thinking-dot ' + color + '_dot'}></div>
	<div class={'thinking-dot ' + color + '_dot'}></div>
</div>

<style>
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.5;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.3);
		}
	}

	.thinking-dot {
		display: inline-block;
		width: 5px;
		height: 5px;
		background-color: #3498db;
		border-radius: 50%;
		animation: pulse 1.2s infinite;
	}

	.blue_dot {
		background-color: #3498db;
	}

	.white_dot {
		background-color: rgba(255, 255, 255);
	}

	.thinking-dot:nth-child(2) {
		animation-delay: 0.4s;
	}

	.thinking-dot:nth-child(3) {
		animation-delay: 0.8s;
	}
</style>
