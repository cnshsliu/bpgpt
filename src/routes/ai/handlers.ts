"use strict";
import { ResponseToolkit } from "@hapi/hapi";
import replyHelper from "../../lib/ReplyHelpers.js";
import MongoSession from "../../lib/MongoSession.js";
import { HttpsProxyAgent } from "https-proxy-agent";
const regex = /"delta":\{"content":"(.*?)"\}/;
import { MtcCredentials } from "../../lib/EmpTypes";
import OpenAI from "openai";
const openai = new OpenAI();

let proxyAgent = undefined;
if (process.env.http_proxy) {
	proxyAgent = new HttpsProxyAgent(process.env.http_proxy);
} else if (process.env.https_proxy) {
	proxyAgent = new HttpsProxyAgent(process.env.https_proxy);
} else {
	proxyAgent = undefined;
}

console.log("ChatGPT API via proxy:", process.env.http_proxy ?? process.env.https_proxy);

import { Agent } from "https";
import fetch, { RequestInit as NodeFetchRequestInit } from "node-fetch";
interface RequestInit extends NodeFetchRequestInit {
	agent?: Agent;
	json?: boolean;
}
let myOpenAIAPIKey = "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";

const askChatGPT = async (messages: any) => {
	const body = { model: "gpt-3.5-turbo", messages: messages, stream: false };
	const requestInit: RequestInit = {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${myOpenAIAPIKey}`,
		},
		body: JSON.stringify(body),
		agent: proxyAgent,
		json: true,
	};
	try {
		const response = await fetch("https://api.openai.com/v1/chat/completions", requestInit);
		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const answer: any = await response.json();
		return answer.choices[0].message.content;
	} catch (e) {
		console.error(e);
		return e.message;
	}
};

export default {
	AskAi: async (req: any, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as MtcCredentials;
				const result = await askChatGPT([
					{ role: "system", content: "您是一位诗人" },
					{ role: "user", content: "请写三句中文诗" },
				]);
				console.log(result);
				return result;
			}),
		);
	},

	CheckAskAi: async (req: any, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as MtcCredentials;
				return "[[Done]]";
			}),
		);
	},
};
