import Joi from "joi";
import Handlers from "./handlers.js";

const internals = {
	endpoints: [
		{
			method: "GET",
			path: "/files/mine/viewer/{serverId}",
			handler: Handlers.ViewMyFile,
			config: {
				auth: "token",
			},
		},
		{
			method: "POST",
			path: "/files/mine/delete",
			handler: Handlers.DeleteMyFile,
			config: {
				description: "List my files",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						serverId: Joi.string().required(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/files/mine",
			handler: Handlers.MyFiles,
			config: {
				description: "List my files",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						q: Joi.string().optional().allow(""),
						wf: Joi.string().optional().allow(""),
					},
					validator: Joi,
				},
			},
		},
	],
};

export default internals;
