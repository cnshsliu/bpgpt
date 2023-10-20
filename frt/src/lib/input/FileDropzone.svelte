<script lang="ts">
	import Dropzone from 'svelte-file-dropzone/Dropzone.svelte';

	export let preview: boolean = true;
	export let previewClass: string = 'preview';
	export let multiple: boolean = true;
	export let maxSize: number = Infinity;
	export let minSize: number = 0;
	export let containerClasses: string = '';
	export let containerStyles: string = '';

	let enlarged: number = -1;
	let files = {
		accepted: [] as File[],
		rejected: [] as File[],
		imgsrcs: [] as any[],
	};

	function getBase64(image: File, index: number, existingNumber: number) {
		const reader = new FileReader();
		reader.readAsDataURL(image);
		reader.onload = (e) => {
			files.imgsrcs[existingNumber + index] = e.target?.result;
			console.log(files.imgsrcs[existingNumber + index]);
			files.imgsrcs = files.imgsrcs;
		};
	}

	function handleFilesSelect(e: CustomEvent) {
		const { acceptedFiles, fileRejections } = e.detail;
		files.accepted = [...files.accepted, ...acceptedFiles];
		files.rejected = [...files.rejected, ...fileRejections];
		if (preview) {
			let imgNumber = files.imgsrcs.length;
			files.imgsrcs = [...files.imgsrcs, ...Array(acceptedFiles.length).fill(undefined)];
			acceptedFiles.map((f: File, idx: number) => {
				getBase64(f, idx, imgNumber);
			});
		}
	}

	function upload() {
		const formData = new FormData();
		formData.append('damName', value);
		formData.append('dataFile', files[0]);
		const upload = fetch('http://localhost:8080/file', {
			method: 'POST',
			body: formData,
		})
			.then((response) => response.json())
			.then((result) => {
				console.log('Success:', result);
			})
			.catch((error) => {
				console.error('Error:', error);
			});
	}

	const clickName = (i: number) => {
		enlarged = enlarged === i ? -1 : i;
	};
	const clickPreview = (i: number) => {
		enlarged = enlarged === i ? -1 : i;
	};
	const deleteFile = (i: number) => {
		files.accepted.splice(i, 1);
		files.accepted = files.accepted;
	};

	const svgSource = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16"> 
<path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/> 
</svg>`;
	const deleteSvg = `data:image/svg+xml;base64,${btoa(svgSource)}`;
</script>

<Dropzone
	on:drop={handleFilesSelect}
	{multiple}
	{minSize}
	{maxSize}
	{containerClasses}
	{containerStyles} />
<div
	class="clickable"
	role="none"
	on:keydown={undefined}
	on:click={upload}>
	Upload
</div>
<ol>
	{#each files.accepted as item, index}
		<li>
			{#if preview}
				<a
					href={'#'}
					on:click={() => {
						clickPreview(index);
					}}>
					<img
						class={previewClass}
						src={files.imgsrcs[index]}
						alt="" />
				</a>
			{/if}
			<a
				href={'#'}
				class="kfk-link"
				on:click={() => {
					clickName(index);
				}}>
				{item.name}
			</a>
			<a
				href={'#'}
				class="kfk-link"
				on:click={() => {
					deleteFile(index);
				}}>
				<img
					src={deleteSvg}
					alt="" />
			</a>
			{#if enlarged === index}
				<div style="max-width:100%;">
					<a
						href={'#'}
						class="max-width: 100%;"
						on:click={() => {
							enlarged = -1;
						}}>
						<img
							style="max-width: 100%;"
							src={files.imgsrcs[index]}
							alt="" />
					</a>
				</div>
			{/if}
		</li>
	{/each}
</ol>

<style>
	.preview {
		width: 24px;
		height: 24px;
	}
</style>
