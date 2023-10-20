<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from '$lib/i18n';
	import { page } from '$app/stores';
	import * as empApi from '$lib/api';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	export let objid: string = 'todid123'; //normally, objid = todoid of current todo,  but can be any string represent another objject.
	export let hasSubmitButton: boolean = false;
	export let hasSignature: boolean = false;
	export let signature: string = '';
	let hasOld: boolean = false;
	let threshold = 200;
	let signarea_display = 'signarea_display_big';
	let points = 0;

	const isValidSignature = (sig: string) => {
		if (sig.startsWith('data:image/png;base64')) {
			return true;
		} else {
			return false;
		}
	};

	onMount(async () => {
		const drawingDiv = document.getElementById('signarea') as HTMLDivElement;
		const rect = drawingDiv.getBoundingClientRect();
		canvas = document.getElementById('signatureCanvas') as HTMLCanvasElement;
		canvas.width = rect.width;
		canvas.height = rect.height;
		ctx = canvas.getContext('2d');
		if (ctx) ctx.lineWidth = 4;
		let drawing = false;
		signature = canvas.toDataURL('image/png');

		// Handle touch events
		canvas.addEventListener('touchstart', onTouchStart);
		canvas.addEventListener('touchmove', onTouchMove);
		canvas.addEventListener('touchend', onTouchEnd);

		// Handle mouse events
		canvas.addEventListener('mousedown', onMouseDown);
		canvas.addEventListener('mousemove', onMouseMove);
		canvas.addEventListener('mouseup', onMouseUp);

		function onTouchStart(e: TouchEvent) {
			if (!ctx) {
				return;
			}
			drawing = true;
			points = 0;
			const touch = e.touches[0];
			const x = touch.clientX - rect.left;
			const y = touch.clientY - rect.top;
			ctx.moveTo(x, y);
		}

		function onTouchMove(e: TouchEvent) {
			if (!ctx || !drawing) {
				return;
			}
			e.preventDefault();
			const touch = e.touches[0];
			const x = touch.clientX - rect.left;
			const y = touch.clientY - rect.top;
			ctx.lineTo(x, y);
			ctx.stroke();
			signature = canvas.toDataURL('image/png');
			points++;
			if (points > threshold) {
				hasSignature = true;
			}
		}

		function onTouchEnd() {
			drawing = false;
			if (points > threshold) {
				hasSignature = true;
				points = 0;
			}
			ctx?.beginPath();
		}

		function onMouseDown(e: MouseEvent) {
			if (!ctx) {
				return;
			}
			drawing = true;
			ctx.moveTo(e.offsetX, e.offsetY);
			canvas.addEventListener('mousemove', onMouseMove);
		}

		function onMouseMove(e: MouseEvent) {
			if (!ctx || !drawing) {
				return;
			}
			ctx.lineTo(e.offsetX, e.offsetY);
			ctx.stroke();
			signature = canvas.toDataURL('image/png');
			points++;
			if (points > threshold) {
				hasSignature = true;
			}
		}

		function onMouseUp() {
			canvas.removeEventListener('mousemove', onMouseMove);
			drawing = false;
			if (points > threshold) {
				hasSignature = true;
				points = 0;
			}
			ctx?.beginPath();
		}

		//使用“notexist”， 强制在开始时不加载签名
		//只有当用户选择“使用上次签名”时，才会加载签名
		await useLastSignagure('default');
	});
	const clearCanvasDrawing = () => {
		if (!ctx) {
			return;
		}
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	};

	const clearCanvas = () => {
		clearCanvasDrawing();
		signature = canvas.toDataURL('image/png');
		hasSignature = false;
	};
	const resetSignature = () => {
		signarea_display = 'signarea_display_big';
		clearCanvas();
	};

	const saveSignagure = async () => {
		signature = canvas.toDataURL('image/png');
		await empApi.post(
			'signature/save',
			{ signature: signature, objid: objid },
			$page.data.user.sessionToken,
		);
		hasSignature = true;
	};
	const useLastSignagure = async (objid: string) => {
		const ret = await empApi.post('signature/load', { objid: objid }, $page.data.user.sessionToken);
		if (isValidSignature(ret)) {
			signature = ret;
			hasSignature = true;
			hasOld = true;
			signarea_display = 'signarea_display_none';
		} else {
			hasSignature = false;
			hasOld = false;
			signarea_display = 'signarea_display_big';
		}
	};
</script>

<div class="container m-1 p-0 border border-1">
	{$_('sign.title')}
	<div class="row justify-content-center">
		<div
			id="signarea"
			class={signarea_display}>
			<canvas id="signatureCanvas" />
		</div>
	</div>
	<div class="row">
		<div class="col d-flex justify-content-center">
			<div
				id="buttons"
				class="buttons mt-1">
				<img
					id="signaturePreviewer"
					src={signature}
					alt="mysignature" />
				<button
					class="btn btn-primary"
					id="clearButton"
					on:click={resetSignature}>
					{$_('sign.reset')}
				</button>
				<button
					class="btn btn-primary"
					disabled={hasSignature}
					id="submitButton"
					on:click={() => {
						useLastSignagure('default');
					}}>
					{$_('sign.uselast')}
				</button>
				{#if hasSubmitButton}
					<button
						class="btn btn-primary"
						id="submitButton"
						on:click={saveSignagure}>
						Submit
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	#buttons {
		bottom: 0;
		right: 0;
	}
	#signaturePreviewer {
		border: 1px solid black;
		width: 120px;
		height: 40px;
	}
	@media (max-width: 768px) {
		#signarea {
			width: 100%;
		}
	}
	.signarea_display_big {
		border: 1px solid black;
		width: 600px;
		height: 200px;
	}
	.signarea_display_none {
		border: 0px solid black;
		width: 6px;
		height: 2px;
	}
</style>
