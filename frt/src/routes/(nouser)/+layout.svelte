<script lang="ts">
	// import type { LayoutData } from './$types';
	import { _ } from '$lib/i18n';
	import { onMount } from 'svelte';

	// export let data: LayoutData;
	let slide = 0;

	let quotes = [
		{
			subject: $_('quote.subject.1'),
			picture: '/images/quote/production.jpg',
			name: $_('quote.name.1'),
			quote: $_('quote.quote.1'),
			avatar: '/images/avatar/quote_user_1.png',
		},
		{
			subject: $_('quote.subject.2'),
			picture: '/images/quote/sunset_factory.jpg',
			name: $_('quote.name.2'),
			quote: $_('quote.quote.2'),
			avatar: '/images/avatar/quote_user_2.png',
		},
		{
			subject: $_('quote.subject.3'),
			picture: 'https://picsum.photos/id/893/1000/400',
			name: $_('quote.name.3'),
			quote: $_('quote.quote.3'),
			avatar: '/images/avatar/quote_user_3.png',
		},
		// 623 , 668  741 742 744
	];
	onMount(() => {
		//取到走马灯对象
import('bootstrap').then(({ Carousel }) => {
		const myCarouselElement = document.querySelector('#myCarousel');
		if (myCarouselElement) {
			//侦测滑动事件， 将当前slide的序号放到slide变量中
			//这个变量，将用于控制不同slide的底色class
			myCarouselElement.addEventListener('slide.bs.carousel', (event) => {
				slide = event.to;
			});
			//驱动走马灯的自动滚动
			const carousel = new Carousel(myCarouselElement, {
				interval: 3000,
				touch: true,
			});
			carousel.cycle();
		}

    }).catch((error) => {
  console.error('Error while dynamically importing Carousel:', error);
});
	});

	let coldef = [4, 8];
</script>

<!-- h-100 整个控件全高,分为左右两栏 -->
<div
	class="row row-cols-2 m-0 p-0"
	style="height:100vh;">
	<!-- 左侧栏： 子tag全部居中，使用leftbackground设置 圆圈quote 底图 -->
	<!-- 背景颜色，根据slide的顺序在primary，success，warning之间切换 -->
	<div
		class={`col col-${coldef[0]} m-0 p-0 h-100 d-flex align-items-center leftbackground`}
		class:style1={slide === 0}
		class:style2={slide === 1}
		class:style3={slide === 2}>
		<div
			id="myCarousel"
			class="carousel slide"
			data-bs-ride="carousel">
			<!-- 三个短横线slide选择按钮 -->
			<div class="carousel-indicators">
				{#each [0, 1, 2] as a, index}
					<button
						type="button"
						data-bs-target="#myCarousel"
						data-bs-slide-to={a}
						class={index === 0 ? 'active' : 'no'}
						aria-current={index === 0 ? 'true' : 'false'}
						aria-label={`Slide ${index + 1}`} />
				{/each}
			</div>
			<!-- 这里是走马灯内部内容，pb-5用于控制 三个短横线与主体内容的举例 -->
			<div class="carousel-inner pb-5">
				{#each quotes as quote, index}
					<!-- 第一个slide文字class为text-light -->
					<!-- 第二个slide文字class为text-subtle -->
					<!-- 第三个为缺省黑色 -->
					<div
						class="carousel-item"
						class:active={index === 0}>
						<div class="fs-1 w-100 text-center mt-1 mb-2">
							{quote.subject}
						</div>
						<img
							src={quote.picture}
							width="100%"
							class="d-block w-100 quote-picture"
							alt="" />
						<div class="fs-5 w-100 text-center fw-light fst-italic mt-5">
							{@html quote.quote}
						</div>
						<div class="mt-5 w-100 text-center avatar-block">
							<img
								src={quote.avatar}
								class="quote-avatar"
								alt="" />
							<br />
							<div class="mt-2">{quote.name}</div>
						</div>
						<div class="fs-4 w-100 text-center mt-2">&nbsp;</div>
					</div>
				{/each}
			</div>
			<!-- <button -->
			<!-- 	class="carousel-control-prev" -->
			<!-- 	type="button" -->
			<!-- 	data-bs-target="#myCarousel" -->
			<!-- 	data-bs-slide="prev"> -->
			<!-- 	<span -->
			<!-- 		class="carousel-control-prev-icon" -->
			<!-- 		aria-hidden="true" /> -->
			<!-- 	<span class="visually-hidden">Previous</span> -->
			<!-- </button> -->
			<!-- <button -->
			<!-- 	class="carousel-control-next" -->
			<!-- 	type="button" -->
			<!-- 	data-bs-target="#myCarousel" -->
			<!-- 	data-bs-slide="next"> -->
			<!-- 	<span -->
			<!-- 		class="carousel-control-next-icon" -->
			<!-- 		aria-hidden="true" /> -->
			<!-- 	<span class="visually-hidden">Next</span> -->
			<!-- </button> -->
		</div>
	</div>
	<!-- 右侧栏为主体内容， 放置login和register表单 -->
	<div class={`col col-${coldef[1]} m-0 p-0 d-flex`}>
		<slot />
	</div>
</div>

<style>
	.leftbackground {
		background-image: url('/images/quote_white.svg');
		background-repeat: no-repeat;
		background-position: center 2%;
	}
	.quote-avatar {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		border: 5px solid #fff;
	}
	.quote-picture {
		opacity: 0.6;
	}

	.text-subtle {
		color: var(--primary-color);
	}

	.flip1 {
		transform: scaleX(-1);
		-moz-transform: scaleX(-1);
		-webkit-transform: scaleX(-1);
		-ms-transform: scaleX(-1);
	}

	.style1 {
		background: linear-gradient(rgba(255, 255, 255, 0.5), rgba(255, 155, 25, 0.8)),
      url('/svg/yarknode.svg') no-repeat top;
		background-size: 20%;
	}
	.style2 {
		background: linear-gradient(rgba(255, 255, 255, 0.5), rgba(55, 155, 25, 0.8)),
      url('/svg/yarknode.svg') no-repeat top;
		background-size: 20%;
	}
	.style3 {
		background: linear-gradient(rgba(255, 255, 255, 0.5), rgba(55, 155, 255, 0.8)),
      url('/svg/yarknode.svg') no-repeat top;
		background-size: 20%;
	}
</style>
