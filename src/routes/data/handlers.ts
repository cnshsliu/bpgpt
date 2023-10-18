"use strict";
import MongoSession from "../../lib/MongoSession.js";
import replyHelper from "../../lib/ReplyHelpers.js";
import { Request, ResponseToolkit } from "@hapi/hapi";
import { Data } from "../../database/models/Data.js";

export default {
	SetData: async (req: Request, h: ResponseToolkit) => {
		return h.response(
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const { context, key, data } = PLD;
				if (!context.tenant) return "tenant is missing";
				if (!key) return "key is missing";
				await new Data({ tenant: context.tenant, context, key: key, data: data }).save();
			}),
		);
	},

	GetData: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				const { query } = PLD;
				if (!query.key) return "query.key is required but misssing";
				console.log(JSON.stringify(query, null, 2));
				return await Data.find(query);
			}),
		);
	},
};
