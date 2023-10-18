const input = `针对您的培训材料内容，以下是我为您提供的吸引力更强的课程题目及5个备选题目：
主题题目：
"超越未来：XX行业引领者的ChatGPT实战手册"
备选题目：
2. "AI浪潮：XX行业如何借助ChatGPT掀起技术革命"
"ChatGPT深度解析：XX行业的人工智能转型与实践"
"从基础到应用：XX行业的ChatGPT一站式培训"
"ChatGPT在XX行业：应用、策略与未来的机遇"
"人工智能时代：XX行业的ChatGPT技术导航"
这些标题旨在突出ChatGPT在XX行业中的核心价值和实际应用，同时具有一定的吸引力和专业性，以帮助您更好地通过销售渠道推广该课程。
`.repeat(10);
export async function* mockReader(timeoutBetween: number = 500) {
	const chunkSize = 1;
	for (let i = 0; i < input.length; i += chunkSize) {
		// Split string into chunks of size chunkSize
		const chunk = `{"delta":{"content":"${input.substr(i, chunkSize)}"}}`;
		// Wait for 200 milliseconds before yielding the next chunk
		await new Promise((resolve) => setTimeout(resolve, timeoutBetween));
		yield chunk;
	}
}
