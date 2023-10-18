import Joi from "joi";
import Handlers from "./handlers.js";

const internals = {
	endpoints: [
		{
			method: "POST",
			path: "/kshare/able",
			handler: Handlers.KsAble,
			config: {
				description: "Able to share or not",
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
			path: "/kstpls",
			handler: Handlers.KsTplSearch,
			config: {
				description: "KsTpl search",
				tags: ["api"],
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						q: Joi.string().required().allow(""),
						tags: Joi.array().items(Joi.string()),
						author: Joi.string().optional().allow(""),
					},
					validator: Joi,
				},
			},
		},

		{
			method: "POST",
			path: "/kstpl/scan",
			handler: Handlers.KsTplScan,
			config: {
				description: " description",
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
			path: "/kstpl/updateone",
			handler: Handlers.KsTplUpdateOne,
			config: {
				description: " description",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						ksid: Joi.string().required().trim(),
						name: Joi.string().required().trim(),
						desc: Joi.string().required().trim(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/kstpl/addtag",
			handler: Handlers.KsTplAddTag,
			config: {
				description: " description",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						ksid: Joi.string().required().trim(),
						tag: Joi.string().required().trim(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/kstpl/deltag",
			handler: Handlers.KsTplDelTag,
			config: {
				description: " description",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						ksid: Joi.string().required().trim(),
						tag: Joi.string().required().trim(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/kstpl/removeone",
			handler: Handlers.KsTplRemoveOne,
			config: {
				description: " description",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						ksid: Joi.string().required(),
						withFile: Joi.boolean().optional().default(false),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/kstpl/clearcache",
			handler: Handlers.KsTplClearCache,
			config: {
				description: " description",
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
			path: "/kstpl/pickone",
			handler: Handlers.KsTplPickOne,
			config: {
				description: " description",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						ksid: Joi.string().required(),
						pickto: Joi.string().required(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/ksconfig/get",
			handler: Handlers.KsConfigGet,
			config: {
				description: " description",
				tags: ["api"],
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
			path: "/ksconfig/set",
			handler: Handlers.KsConfigSet,
			config: {
				description: " description",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						ksconfig: {
							scenarios: Joi.array().items(Joi.string()),
							industries: Joi.array().items(Joi.string()),
						},
					},
					validator: Joi,
				},
			},
		},

		{
			method: "POST",
			path: "/kshare/shareTemplate",
			handler: Handlers.KshareTemplate,
			config: {
				description: " description",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						tplid: Joi.string().required(),
						name: Joi.string().required(),
						desc: Joi.string().required(),
						price: Joi.number().required(),
						tags: Joi.array().items(Joi.string()),
					},
					validator: Joi,
				},
			},
		},

		{
			method: "POST",
			path: "/kstpl/preparedesign",
			handler: Handlers.KsTplPrepareDesign,
			config: {
				description: " description",
				tags: ["api"],
				auth: "token",
				validate: {
					headers: Joi.object({
						Authorization: Joi.string(),
					}).unknown(),
					payload: {
						ksid: Joi.string().required(),
					},
					validator: Joi,
				},
			},
		},
	],
};

export default internals;
