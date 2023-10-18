import Joi from "joi";
import suuid from "short-uuid";
import Handlers from "./handlers.js";

import EmpError from "../../lib/EmpError.js";
const internals = {
	endpoints: [
		{
			method: "POST",
			path: "/caishen/ws",
			handler: Handlers.AskGpt3Ws,
			config: {
				payload: { output: "data", parse: true, allow: "application/json" },
				plugins: { websocket: true },
			},
		},
		{
			method: "GET",
			path: "/caishen/getContext",
			handler: Handlers.GetContext,
			config: {
				description: "Get context of Caishen",
				tags: ["api"],
			},
		},
		{
			method: "POST",
			path: "/caishen/getGptLog",
			handler: Handlers.GetGptLog,
			config: {
				description: "Get chatgpt log",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/caishen/getTasks",
			handler: Handlers.GetTasks,
			config: {
				description: "Get user tasks",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: { instance: Joi.boolean().required() },
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/caishen/getOneInstanceTask",
			handler: Handlers.GetOneInstanceTask,
			config: {
				description: "Get one instance task",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/caishen/restoreGptLogItem",
			handler: Handlers.RestoreGptLogItem,
			config: {
				description: "Get chatgpt log item",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						bsid: Joi.string(),
						clientid: Joi.string(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/caishen/delGptLog",
			handler: Handlers.DelGptLog,
			config: {
				description: "Del chatgpt log",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						bsids: Joi.array().items(Joi.string()),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/caishen/setMyKey",
			handler: Handlers.SetMyKey,
			config: {
				description: "Set My API key",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						key: Joi.string(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/caishen/setKey",
			handler: Handlers.SetKey,
			config: {
				description: "Set API key for account",
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						key: Joi.string(),
						keyType: Joi.string(),
						account: Joi.string(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/caishen/shareit",
			handler: Handlers.ShareIt,
			config: {
				description: "Share QA",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						question: Joi.string(),
						answers: Joi.array().items(Joi.string()),
						images: Joi.array().items(Joi.string()),
						period: Joi.string(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "GET",
			path: "/caishen/cs/{sharekey}",
			handler: Handlers.GetShareIt,
			config: {
				description: "Read Share QA",
				tags: ["api"],
				validate: {
					params: {
						sharekey: Joi.string().required(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/caishen/bs/groups/get",
			handler: Handlers.GetBsGroups,
			config: {
				description: "Get Bs Groups",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/caishen/bs/groups/set",
			handler: Handlers.SetBsGroups,
			config: {
				description: "Set Bs Groups",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						groups: Joi.array().items({
							id: Joi.string(),
							desc: Joi.string(),
						}),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/caishen/bs/scenario/set",
			handler: Handlers.SetBsScenario,
			config: {
				description: "Set Bs Scenario",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						scen: Joi.object(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/caishen/bs/scenarios/get",
			handler: Handlers.GetBsScenarios,
			config: {
				description: "Get Bs Scenarios",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						groupid: Joi.string(),
					},
					validator: Joi,
				},
			},
		},

		{
			method: "POST",
			path: "/caishen/bs/search",
			handler: Handlers.SearchBsScenarios,
			config: {
				description: "Get Bs Scenarios",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						q: Joi.string(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/caishen/bs/searchwords",
			handler: Handlers.GetMySearchWords,
			config: {
				description: "Get Bs Search Words",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/caishen/bs/use",
			handler: Handlers.UseScen,
			config: {
				description: "Use a scen",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: { scenid: Joi.string() },
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/caishen/bs/used",
			handler: Handlers.ScenUsed,
			config: {
				description: "what scens were used",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {},
					validator: Joi,
				},
			},
		},

		{
			method: "POST",
			path: "/auth/sendcode",
			handler: Handlers.AuthSendCode,
			config: {
				description: "Send code to email",
				tags: ["api"],
				validate: {
					payload: {
						email: Joi.string(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/auth/verifycode",
			handler: Handlers.AuthVerifyCode,
			config: {
				description: "Verify code",
				tags: ["api"],
				validate: {
					payload: {
						email: Joi.string(),
						code: Joi.string(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/caishen/buycard",
			handler: Handlers.BuyCard,
			config: {
				description: "Buy Card",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						account: Joi.string().trim(),
						days: Joi.number(),
					},
					validator: Joi,
				},
			},
		},
	],
};

export default internals;
