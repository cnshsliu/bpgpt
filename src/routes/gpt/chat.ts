import { MozillaReadabilityTransformer } from "langchain/document_transformers/mozilla_readability";
import { PuppeteerWebBaseLoader } from "langchain/document_loaders/web/puppeteer";

import { Agent } from "https";
import fetch, { RequestInit as NodeFetchRequestInit } from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { mockReader } from "./mock.js";
import { GptLog } from "../../database/models/GptLog.js";
import type { advisoryType } from "./context.js";
import { redisClient } from "../../database/redis.js";
import { getScenarioById, positions, DEFAULT_ADVISORY, commonSystem } from "./context.js";
import { Tiktoken } from "@dqbd/tiktoken/lite";
import cl100k_base from "@dqbd/tiktoken/encoders/cl100k_base.json" assert { type: "json" };
import {
	getAdvisorSystem,
	getAdvisorName,
	getAdvisorAssistant as getAdvisorIntroduction,
} from "./advisor.js";

const TiktokenEncoding = new Tiktoken(
	cl100k_base.bpe_ranks,
	cl100k_base.special_tokens,
	cl100k_base.pat_str,
);
const tokens = TiktokenEncoding.encode("大家好");
console.log(tokens);

export type scenarioType = {
	groupid: string;
	scenid: string;
	content: {
		caishen: string[];
		desc: string;
		icon: string;
		note?: string;
		json?: string;
		characteristics?: string;
		assistant?: string;
		system?: string;
		msg: string | string[];
		actor?: string;
		model?: string;
	};
};

export type summaryInfoType = {
	summaryAtIndex: number;
	summaryContent: string;
};

export const SUMMARIZER_TEMPLATE = `请将以下内容逐步概括所提供的对话内容，并将新的概括添加到之前的概括中，形成新的概括。

EXAMPLE
Current summary:
Human询问AI对人工智能的看法。AI认为人工智能是一种积极的力量。

New lines of conversation:
Human：为什么你认为人工智能是一种积极的力量？
AI：因为人工智能将帮助人类发挥他们的潜能。

New summary:
Human询问AI对人工智能的看法。AI认为人工智能是一种积极的力量，因为它将帮助人类发挥他们的潜能。
END OF EXAMPLE

Current summary:
{summary}

New lines of conversation:
{new_lines}

New summary:`;

interface RequestInit extends NodeFetchRequestInit {
	agent?: Agent;
	json?: boolean;
}

let proxyAgent = undefined;
if (process.env.http_proxy) {
	proxyAgent = new HttpsProxyAgent(process.env.http_proxy);
} else if (process.env.https_proxy) {
	proxyAgent = new HttpsProxyAgent(process.env.https_proxy);
} else {
	proxyAgent = undefined;
}

console.log("ChatGPT API via proxy:", process.env.http_proxy ?? process.env.https_proxy);

const findKnownIcon = (text: string) => {
	for (let i = 0; i < DEFAULT_ADVISORY.length; i++) {
		if (text.indexOf(DEFAULT_ADVISORY[i].name) >= 0) {
			return DEFAULT_ADVISORY[i];
		}
	}
	return null;
};

function shuffle(array: Array<any>) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]]; // Swap elements
	}
	return array;
}

const startWith = [
	"我{name}说几句",
	"我说说我的看法",
	"我的考虑如下",
	"这个问题我觉得是这样",
	"okay, 说一下我的看法",
	"很好的问题，我是这么看的",
];

function getRandomElement(arr: string[]) {
	const randomIndex = Math.floor(Math.random() * arr.length);
	console.log("========Random index", randomIndex);
	return arr[randomIndex];
}

const regex_url_in_string = /{([^}]+)}/g;

export class Chat {
	private apiUrl: string;

	constructor() {
		this.apiUrl = "https://api.openai.com/v1/chat/completions";
	}

	private getHistoryTextLimitByToken = (history: string[], limit: number) => {
		let tmp = 0 - history.length;
		let historyText = "";
		for (let i = -1; i >= 0 - history.length; ) {
			historyText = history.slice(i).join("");
			const tokens = TiktokenEncoding.encode(historyText);
			if (tokens.length > limit) {
				tmp = i + 1;
				break;
			}
			i = i - 1;
		}
		return history.slice(tmp).join("");
	};

	public getHistoryFromRedis = async function (
		myOpenAIAPIKey: string,
		clientid: string,
	): Promise<{ summary: string; history: string }> {
		//从redis取出历史记录数组
		let cacheKey = "gpt_history_" + clientid;
		let history = [];
		let historyString = await redisClient.get(cacheKey);
		if (historyString) {
			history = JSON.parse(historyString);
		}

		//取后1000个Token
		let ret = this.getHistoryTextLimitByToken(history, 1000);
		//如果记录数大于30条，就要做一次summary，历史记录替换为summary
		if (history.length > 30) {
			let summary = await this.makeSummary(
				myOpenAIAPIKey,
				clientid,
				this.getHistoryTextLimitByToken(history, 2000),
			);
			await redisClient.set(cacheKey, JSON.stringify([summary]));
		}
		return ret;
	};

	private getDocumentsFromUrl = async (url: string, headless: boolean | "new" = "new") => {
		const loader = new PuppeteerWebBaseLoader(url, {
			launchOptions: {
				headless: headless,
			},
		});

		const docs = await loader.load();
		const transformer = new MozillaReadabilityTransformer();
		const newDocuments = await transformer.transformDocuments(docs);
		return newDocuments;
	};

	private getDocumentContentFromUrl = async (url: string): Promise<string> => {
		const docs = await this.getDocumentsFromUrl(url);
		let ret = "";
		for (let d = 0; d < docs.length; d++) {
			ret += docs[d].pageContent;
		}
		return ret;
	};

	private replaceUrlsWithContent = async (inputStr: string): Promise<string> => {
		const promises = [];
		const replacedStr = inputStr.replace(regex_url_in_string, (match, str) => {
			// Check if str is a valid URL
			try {
				new URL(str); // This will throw an error if str is not a valid URL
			} catch {
				return match; // Return the original string if it's not a valid URL
			}

			// If str is a valid URL, fetch its content
			const promise = this.getDocumentContentFromUrl(str);
			promises.push(promise);
			return "{}"; // Temporary placeholder
		});

		// Wait for all HTTP requests to complete and replace the placeholders with actual content
		const contents = await Promise.all(promises);
		let index = 0;
		return replacedStr.replace(/{}/g, () => contents[index++]);
	};

	private async generatePrompt(
		PLD: any,
		test: boolean = false,
		history_assistant: string,
		myAdvisory: advisoryType[],
	): Promise<any> {
		// const answerLanguage = process.env.LANGUAGE ? `Answer me in ${process.env.LANGUAGE},` : '';
		if (test) {
			return [
				[
					{ role: "system", content: "您是一位诗人" },
					{ role: "user", content: "请写三句中文诗" },
				],
			];
		}

		let pure = false;
		if (PLD.userMsg.indexOf("+pure") > -1) {
			pure = true;
			PLD.userMsg = PLD.userMsg.replace("+pure", "");
		}

		const a_scenario: scenarioType = (await getScenarioById(PLD.scenid)) as any as scenarioType;

		if (a_scenario.content.json) {
			let prompts = [];
			try {
				PLD.userMsg = PLD.userMsg.replace(/"/g, '\\"');
				PLD.userMsg = PLD.userMsg.replace(/`/g, "\\`");
				const jsonString = a_scenario.content.json
					.replace(/{usermsg}/gi, PLD.userMsg)
					.replace(/{industry}/gi, PLD.industry)
					.replace(/{bizmodel}/gi, PLD.bizmodel)
					.replace(/{human}/gi, PLD.name);
				console.log("jsonString", jsonString);
				prompts.push(JSON.parse(jsonString));
			} catch (e) {
				console.warn("JSON parse error", e);
				prompts.push([
					{ role: "system", content: "您是一位诗人" },
					{ role: "user", content: "根据错误信息" + e.message + ",请写三句中文诗" },
				]);
			}
			return prompts;
		}

		a_scenario.content.assistant = a_scenario.content.assistant ?? "";
		if (a_scenario.content.assistant !== "") {
			a_scenario.content.assistant = a_scenario.content.assistant.replace(
				/{startasyou}/gi,
				`你就是{name}, 你不仅仅是AI助手。回答时请以'${getRandomElement(
					startWith,
				)}'开头，你可以自己决定如何开头`,
			);
			let match = a_scenario.content.assistant.match(/(\{extra.+:.+\})/gi);
			if (match) {
				match.map((x) => {
					let tmp = x.match(/\{(extra.+?):.+\}/i);
					if (tmp) {
						let key = tmp[1];
						a_scenario.content.assistant = a_scenario.content.assistant.replace(x, PLD.extras[key]);
					}
				});
				a_scenario.content.assistant = await this.replaceUrlsWithContent(
					a_scenario.content.assistant,
				);
				console.log("====================");
				console.log(a_scenario.content.assistant);
				console.log("====================");
			}
		}
		if (a_scenario.content.assistant.match(/.*{usermsg}.*/gi)) {
			a_scenario.content.assistant = a_scenario.content.assistant.replace(
				/{userMsg}/gi,
				PLD.userMsg,
			);
			PLD.userMsg = "";
		}

		const answerLanguage: string = "请用中文回答";
		let my_industry = "";
		let my_position = "";
		try {
			my_industry = PLD.industry;
		} catch (e) {}
		try {
			my_position = positions[Number(PLD.position)];
		} catch (e) {}
		const humanIs = `跟你说话的Human的名字是${PLD.name}，Human的组织是${PLD.company}，Human的行业是${my_industry}，Human的职位是${my_position}，${answerLanguage}`;

		let actors = [];
		let reshuffle = false;
		let isAPlay = false;

		a_scenario.content.actor = a_scenario.content.actor ?? "";
		if (a_scenario.content.actor.match(new RegExp("shuffle", "i"))) {
			reshuffle = true;
			a_scenario.content.actor = a_scenario.content.actor.replace(new RegExp("shuffle", "i"), "");
			if (a_scenario.content.actor.trim() === "") {
				a_scenario.content.actor = "all";
			}
		}

		let actorSpecified = findKnownIcon(PLD.userMsg);
		if (actorSpecified) {
			actors = [actorSpecified.icon];
		} else if (a_scenario.content.actor.trim() === "") {
			actors.push(PLD.advisor ? PLD.advisor : "tycoon");
		} else if (a_scenario.content.actor.match(new RegExp("all", "i"))) {
			actors = myAdvisory.map((a) => a.icon);
			if (reshuffle) {
				actors = shuffle(actors);
			}
			isAPlay = true;
		} else if (a_scenario.content.actor.match(/rand(\d+)/i)) {
			let match = a_scenario.content.actor.match(/rand(\d+)/i);
			if (match && match[1]) {
				let num = Number(match[1]);
				actors = myAdvisory.map((a) => a.icon);
				if (reshuffle) {
					actors = shuffle(actors);
				}
				actors = actors.slice(0, num);
				isAPlay = true;
			} else {
				actors.push(PLD.advisor ? PLD.advisor : "tycoon");
			}
			isAPlay = true;
		} else {
			actors = a_scenario.content.actor.split(/[,|，| ]/).filter((x) => x.length > 0);
			isAPlay = true;
		}

		if (isAPlay) {
			console.log("Play with", actors);
		}

		let prompts = [];
		for (
			let scenMsgIndex = 0;
			scenMsgIndex < (PLD.askNumber === 0 ? a_scenario.content.msg.length : 1);
			scenMsgIndex++
		) {
			let userMsgAlreadyIncluded = false;
			if (a_scenario.content.msg[scenMsgIndex].match(/{usermsg}/gi)) {
				userMsgAlreadyIncluded = true;
			}
			if (a_scenario.content.assistant.match(/{usermsg}/gi)) {
				userMsgAlreadyIncluded = true;
			}
			let msg = a_scenario.content.msg[scenMsgIndex]
				.replace(/{usermsg}/gi, PLD.userMsg)
				.replace(/{industry}/gi, PLD.industry)
				.replace(/{bizmodel}/gi, PLD.bizmodel)
				.replace(/{human}/gi, PLD.name);

			for (let actorIndex = 0; actorIndex < actors.length; actorIndex++) {
				console.log(
					"====>SceneMsgIndex: ",
					scenMsgIndex,
					"actorIndex: ",
					actorIndex,
					"actor",
					actors[actorIndex],
				);
				let scenMsg = msg.replace(/{name}/gi, getAdvisorName(actors[actorIndex]));
				//useSystems, 在扮演情况下，对应到每个扮演对象
				let scenario_system = a_scenario.content.system;
				scenario_system = scenario_system.replace(/{human}/gi, PLD.name);
				scenario_system = scenario_system.replace(/{name}/gi, getAdvisorName(actors[actorIndex]));
				let aPrompt = [
					{
						role: "system",
						//角色扮演要求 + 通用要求  + 场景中要求
						content:
							PLD.askNumber === 0 && scenMsgIndex === 0
								? getAdvisorSystem(actors[actorIndex]) + "," + commonSystem + "\n" + scenario_system
								: getAdvisorSystem(actors[actorIndex]) +
								  "," +
								  commonSystem +
								  "\n" +
								  scenario_system,
					},
				];
				aPrompt.push({ role: "actor", content: getAdvisorName(actors[actorIndex]) });
				aPrompt.push({ role: "assistant", content: history_assistant ?? "" });
				aPrompt.push({ role: "assistant", content: humanIs });
				if (a_scenario.content.characteristics?.trim().length > 0) {
					aPrompt.push({
						role: "assistant",
						content: a_scenario.content.characteristics
							.trim()
							.replace(/{human}/gi, PLD.name)
							.replace(/{name}/gi, getAdvisorName(actors[actorIndex]))
							.replace(/{industry}/gi, PLD.industry),
					});
				} else {
					aPrompt.push({
						role: "assistant",
						content: getAdvisorIntroduction(actors[actorIndex])
							.replace(/{human}/gi, PLD.name)
							.replace(/{name}/gi, getAdvisorName(actors[actorIndex]))
							.replace(/{industry}/gi, PLD.industry),
					});
				}
				aPrompt.push({
					role: "assistant",
					content: a_scenario.content.assistant
						.replace(/{human}/gi, PLD.name)
						.replace(/{name}/gi, getAdvisorName(actors[actorIndex]))
						.replace(/{industry}/gi, PLD.industry)
						.replace(/{bizmodel}/gi, PLD.bizmodel),
				});
				//去掉那些content内容为空的prompt message
				aPrompt = aPrompt.filter((x) => {
					return x.content.trim().length > 0;
				});
				if (PLD.askNumber === 0) {
					//如果是多个msg组织的数组中的第一个，则需要添加场景定义中message
					prompts.push([
						...aPrompt,
						{
							role: "user",
							content: userMsgAlreadyIncluded ? scenMsg : [scenMsg, PLD.userMsg].join(" "),
						},
					]);
				} else {
					//接下去的问答中，仅使用用户的提问内容
					if (PLD.userMsg.trim().length > 0) {
						prompts.push([...aPrompt, { role: "user", content: PLD.userMsg }]);
					} else {
						prompts.push([...aPrompt, { role: "user", content: scenMsg }]);
					}
				}
			}
		}

		if (pure) {
			prompts = prompts.map((x) => {
				return x.filter((y: { role: string }) => {
					return y.role === "user";
				});
			});
			console.log(JSON.stringify(prompts));
		}

		return prompts;
	}

	getHistoryFromDatabaseAsString = async function (
		user: any,
		PLD: any,
		myOpenAIAPIKey: string,
		makeNewSummary: boolean = false,
	): Promise<string> {
		console.log("bsid", PLD.bsid);
		const thisBsQaLog: any = await GptLog.findOne(
			{
				tenant: user.tenant._id,
				uid: user._id,
				bsid: PLD.bsid,
				deleted: false,
			},
			{ qas: 1, _id: 0 },
		).lean();
		if (thisBsQaLog === null) {
			await redisClient.del("gpt_summary_" + PLD.clientid);
		}
		let historyString = "";
		let logString = "";

		let summaryInfo: summaryInfoType = { summaryAtIndex: 0, summaryContent: "" };
		let summaryInfoString = await redisClient.get("gpt_summary_" + PLD.clientid);
		if (summaryInfoString) {
			summaryInfo = JSON.parse(summaryInfoString);
		}
		if (thisBsQaLog) {
			let pairs = thisBsQaLog.qas.map((x: { question: string; answer: string }) => {
				return `Human问: """${x.question}"""\nAI答:"""${x.answer}"""`;
			});
			// logString = pairs.slice(summaryInfo.summaryAtIndex).join("\n");
			for (let i = 0; i <= 10; i++) {
				logString = pairs.slice(Math.floor((pairs.length * i) / 10)).join("\n");
				if (TiktokenEncoding.encode(logString).length < 4000 / 3) {
					break;
				}
			}
		} else {
			logString = "";
		}
		// console.log("summaryAtIndex", summaryInfo.summaryAtIndex);
		// console.log("summaryContent", summaryInfo.summaryContent);
		console.log("logString", logString.length);
		historyString = "用户(Human)和你(AI)之间的问答历史是:\n" + logString;

		// historyString = summaryInfo.summaryContent + "\n" + logString;

		// if (makeNewSummary) {
		// 	let newSummary: string = await this.makeSummary(
		// 		myOpenAIAPIKey,
		// 		PLD.clientid,
		// 		historyString,
		// 		thisBsQaLog.qas.length,
		// 	);
		// 	historyString = newSummary;
		// }

		return historyString;
	};

	regex = /"delta":\{"content":"(.*?)"\}/;
	public caishenSay = async (
		user: any,
		myOpenAIAPIKey: string,
		promptsToProcess: any,
		PLD: any,
		test: boolean = false,
		history_assistant: string = "",
		myAdvisory: advisoryType[],
		recursiveDepth: number,
		mock: boolean = false,
	) => {
		if (history_assistant === null) {
			history_assistant = await this.getHistoryFromDatabaseAsString(
				user,
				PLD,
				myOpenAIAPIKey,
				false,
			);
		}
		let prompts =
			promptsToProcess ?? (await this.generatePrompt(PLD, test, history_assistant, myAdvisory));
		let controller = new AbortController();

		let messages = prompts[0]; //只使用第一个prompts
		// console.log(messages);
		let playActorName = "";
		let actorIndex = messages.findIndex((x) => x.role === "actor");
		if (actorIndex > -1) {
			playActorName = messages[actorIndex].content;
			messages.splice(actorIndex, 1);
		}

		let currentIcon = "";
		for (let i = 0; i < messages.length; i++) {
			if (messages[i].role === "system") {
				let match = messages[i].content.match(/<icon>(.*)<\/icon>/);
				if (match) {
					currentIcon = match[1];
					messages[i].content = messages[i].content.replace(/<icon>(.*)<\/icon>/, "");
					break;
				}
			}
		}

		let messageTokens = TiktokenEncoding.encode(JSON.stringify(messages));
		// console.log(
		// 	"askNumber",
		// 	PLD.askNumber,
		// 	"messageTokens.length",
		// 	messageTokens.length,
		// 	"history assistant",
		// 	history_assistant.length,
		// 	JSON.stringify(messages).indexOf(history_assistant) > -1 ? "included" : "NOT included",
		// );
		if (messageTokens.length > 16000) {
			// let new_history_assistant = await this.getHistoryFromDatabaseAsString(
			// 	user,
			// 	PLD,
			// 	myOpenAIAPIKey,
			// 	true,
			// );
			let new_history_assistant = history_assistant.slice(
				Math.floor((history_assistant.length * 2) / 3),
			);
			if (recursiveDepth > 2) {
				console.log("Recursive depth exceeded");
				throw new Error("Recursive depth exceeded");
			}
			return await this.caishenSay(
				user,
				myOpenAIAPIKey,
				promptsToProcess,
				PLD,
				test,
				new_history_assistant,
				myAdvisory,
				recursiveDepth + 1,
				mock,
			);
		}
		//TODO: check messages TOKEN limit here
		const theScenario: scenarioType = (await getScenarioById(PLD.scenid)) as any as scenarioType;
		const body = {
			model: theScenario.content.model ?? "gpt-3.5-turbo",
			// messages: [{ role: "user", content: "写三句中文诗" }],
			messages: messages,
			stream: true,
		};
		console.log(">>>>Use model:", body);
		console.log(messages);

		const requestInit: RequestInit = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${myOpenAIAPIKey}`,
			},
			body: JSON.stringify(body),
			agent: proxyAgent,
			json: true,
			signal: controller.signal,
		};

		function getRandomInt(min: number, max: number) {
			min = Math.ceil(min);
			max = Math.floor(max);
			return Math.floor(Math.random() * (max - min + 1)) + min;
		}

		let reader = null;
		if (mock) {
			reader = mockReader(getRandomInt(1, 2));
		} else {
			try {
				const response = await fetch(this.apiUrl, requestInit);
				reader = response.body;
			} catch (e) {
				console.error(e);
			}
		}
		prompts.shift();
		return {
			currentIcon,
			playActorName,
			messages,
			reader: reader,
			nextPrompts: prompts,
			controller,
		};
	};

	public getSummaryFromRedis = async (clientid: string) => {
		return await redisClient.get("gpt_summary_" + clientid);
	};
	public setSummaryToRedis = async (clientid: string, summary: string) => {
		await redisClient.set("gpt_summary_" + clientid, summary);
	};

	public delSummary = async (clientid: string) => {
		redisClient.del("gpt_summary_" + clientid).then(() => {
			console.log("Summary gpt_summary_" + clientid + " cleared");
		});
	};

	public makeSummary = async (
		myOpenAIAPIKey: string,
		clientid: string,
		new_lines: string,
		summaryAtIndex: number,
	): Promise<string> => {
		let summaryInfo: summaryInfoType = null;
		let old_summary = "";
		let tmp = await redisClient.get("gpt_summary_" + clientid);
		if (tmp) {
			summaryInfo = JSON.parse(tmp);
			old_summary = summaryInfo.summaryContent;
		}
		const prompt = SUMMARIZER_TEMPLATE.replace("{summary}", old_summary).replace(
			"{new_lines}",
			new_lines,
		);
		console.log("summary_prompt", prompt);
		let summaryContent = await this.summarizeText(myOpenAIAPIKey, prompt);
		const redisCache = { summaryAtIndex, summaryContent };
		console.log("redisCache", redisCache);
		await redisClient.set("gpt_summary_" + clientid, JSON.stringify(redisCache));
		return summaryContent;
	};

	public summarizeText = async (myOpenAIAPIKey: string, text: string) => {
		let controller = new AbortController();
		const body = {
			model: "gpt-3.5-turbo-16k",
			messages: [
				{
					role: "user",
					content: text,
				},
			],
			max_tokens: 1024,
			stream: false,
		};
		const requestInit: RequestInit = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${myOpenAIAPIKey}`,
			},
			body: JSON.stringify(body),
			agent: proxyAgent,
			signal: controller.signal,
		};
		const response = await fetch(this.apiUrl, requestInit);

		const result: any = await response.json();
		let summary = "";
		try {
			if (result.error) {
				console.log(result.error.message);
				summary = "";
			} else {
				summary = result.choices[0].message.content;
			}
		} catch (e) {}

		if (summary.trim() === "") {
			console.warn("摘要返回长度为0， 一定有错误发生， 请查看前述错误信息");
		}
		return summary;
	};
}
