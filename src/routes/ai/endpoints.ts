import Joi from "joi";
import suuid from "short-uuid";
import Handlers from "./handlers.js";

import EmpError from "../../lib/EmpError.js";
const internals = {
	endpoints: [
		{
			method: "POST",
			path: "/ai/ask",
			handler: Handlers.AskAi,
			config: {
				description: "ask ai",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						work: Joi.object().required(),
						ai: Joi.object(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/ai/check",
			handler: Handlers.CheckAskAi,
			config: {
				description: "check ask ai",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						aiTicket: Joi.string().required(),
					},
					validator: Joi,
				},
			},
		},
	],
};

export default internals;
