<svelte:options accessors={true} />

<script lang="ts">
	import { toast } from '$lib/Toast';
	import { createEventDispatcher } from 'svelte';
	let dispatch = createEventDispatcher();

	let jieduContent: string = '';
	let expanded: boolean = false;
	let selected: boolean = false;
	export let srObject: any = {};
	const jiedu = (text: string) => {
		jieduContent = text;
	};
	const combinePdf = () => {};

	let contentUrl: string = '';

	const prepareContentUrl = (obj: any) => {
		let html = obj.content;
		const base = obj.site === 'wx' ? `<base href="https://mp.weixin.qq.com/" />` : ``;

		html =
			`<html><head><meta charset="UTF-8">${base}</head><body class="mybody">` +
			html +
			`<style>
img {max-width: 100%}
.mybody {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
}
</style></body></html>`;

		var blob = new Blob([html], { type: 'text/html; charset=utf-8' });
		if (blob) {
			let url = URL.createObjectURL(blob);
			return url;
		} else {
			return '';
		}
	};

	const showOriginalUrl = async (obj: any) => {
		window.open(obj.url, '_blank');
	};

	const showHtml = async (obj: any) => {
		var a = document.createElement('a');
		const url = prepareContentUrl(obj);
		if (url) {
			a.href = url;
			a.textContent = 'Open HTML';
			a.target = '_blank';
			a.click();
		} else {
			console.log('blob is null');
		}
	};

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			toast('内容已拷贝到系统剪贴板', 'Success', 'success');
		} catch (err) {
			console.error('Failed to copy text: ', err);
		}
	};

	const deleteUrl = async (obj: any) => {
		try {
			const ret = await fetch('http://localhost:6008/caishen/deleteSearchResult', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: obj.url }),
			});
			toast('内容已删除', 'Success', 'success');
		} catch (err) {
			console.error('Failed to copy text: ', err);
		}
	};

	export function getSelected() {
		return selected;
	}
	export function getObject() {
		return srObject;
	}
	export function getExpanded() {
		return expanded;
	}
	export function setExpanded(flag: boolean) {
		expanded = flag;
	}
</script>

<div
	class="m-3 p-2 border border-1 rounded"
	class:selected>
	<div class="row">
		<div class="col">
			<div
				class="srContent collapsed"
				class:expanded
				on:keydown={null}
				on:click={() => {
					if (expanded === false) {
						dispatch('expand');
						//prepare conent url
						contentUrl = prepareContentUrl(srObject);
						if (contentUrl) expanded = true;
					} else {
						expanded = false;
					}
				}}>
				{#if expanded}
					<iframe
						id="iframe"
						src={contentUrl}
						title="content"
						frameborder="0">
					</iframe>
					<button
						id="closeBtn"
						on:keydown={null}
						on:click|preventDefault={(e) => {
							e.stopPropagation();
							expanded = false;
						}}
						class="btn btn-primary btn-small">
						Close
					</button>
					<button
						id="openBtn"
						on:keydown={null}
						on:click={(e) => {
							e.stopPropagation();
							window.open(contentUrl, '_blank');
						}}
						class="btn btn-primary btn-small">
						Open in New Tab
					</button>
				{:else}
					{srObject.textContent}
				{/if}
			</div>
		</div>
		<div class="col-auto">
			<a
				href={'#'}
				on:click|preventDefault={() => {
					// showHtml(srObject);
					showOriginalUrl(srObject);
				}}
				target="_blank"
				class="kfk-link">
				<i class="bi bi-send"></i>
			</a>
			<br />
			<a
				href={'#'}
				on:keydown={null}
				on:click|preventDefault={() => {
					selected = !selected;
				}}
				target="_blank"
				class="kfk-link">
				{#if selected}
					<i class="bi bi-check-circle"></i>
				{:else}
					<i class="bi bi-circle"></i>
				{/if}
			</a>
			<br />
			<a
				href={'#'}
				on:keydown={null}
				on:click|preventDefault={() => {
					if (selected) {
						dispatch('copyall');
					} else {
						copyToClipboard(srObject.textContent);
					}
				}}
				class="kfk-link">
				<i class="bi bi-clipboard"></i>
			</a>
			<br />
			<a
				href={'#'}
				on:click|preventDefault|stopPropagation={() => {
					dispatch('makePdf');
				}}
				target="_blank"
				class="kfk-link">
				<i class="bi bi-book"></i>
			</a>
			<br />
			<a
				href={'#'}
				target="_blank"
				on:click|preventDefault|stopPropagation={async () => {
					await deleteUrl(srObject);
					dispatch('destroy');
				}}
				class="kfk-link">
				<i class="bi bi-trash"></i>
			</a>
		</div>
	</div>
	{#if jieduContent !== ''}
		{jieduContent}
	{/if}
</div>

<style>
	.collapsed {
		max-height: 6em;
		overflow: hidden;
	}
	.expanded {
		max-height: none;
		overflow: show;
	}
	.srContent {
		position: relative;
	}
	#iframe {
		width: 100%;
		min-height: 500px;
		border: 2px solid lightblue; /* Light blue border */
		border-radius: 10px;
		padding: 0px;
		overflow: hidden;
	}
	#closeBtn {
		position: absolute;
		top: 50px;
		right: 10px;
	}

	#openBtn {
		position: absolute;
		top: 10px;
		right: 10px;
	}
</style>
