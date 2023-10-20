<script lang="ts">
	export let instruct: string;
	export let speakDone: boolean;
	let text = '';
	let showed = 0;

	function getRandomInt(max: number): number {
		return Math.floor(Math.random() * max) + 1;
	}

	const speak = () => {
		speakDone = false;
		showed = 0;
		text = '';
		let interval = setInterval(() => {
			let tmp = getRandomInt(100);
			//the next line make Yana 输出节奏不平稳的效果
			// if (tmp < 30) return;
			if (showed < instruct.length) {
				// let howmany = getRandomInt(3);
				let howmany = 1;
				text = text + instruct.substring(showed, showed + howmany);
				showed = showed + howmany;
			} else {
				speakDone = true;
				clearInterval(interval);
			}
		}, 50); //控制yana输出的速度， 100为最佳
	};

	$: instruct && speak();
</script>

{text}
<span class="blink-cursor" />
