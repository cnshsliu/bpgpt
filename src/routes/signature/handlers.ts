"use strict";
import Parser from "../../lib/Parser.js";
import MongoSession from "../../lib/MongoSession.js";
import IdGenerator from "../../lib/IdGenerator.js";
import Engine from "../../lib/Engine.js";
import replyHelper from "../../lib/ReplyHelpers.js";
import { Request, ResponseToolkit } from "@hapi/hapi";
import { Template } from "../../database/models/Template.js";
import { Workflow } from "../../database/models/Workflow.js";
import Cache from "../../lib/Cache.js";
import { Signature, SignatureType } from "../../database/models/Signature.js";
import EmpError from "src/lib/EmpError";

interface stepType {
	stepId: string;
	instruction: string[];
	goto: string;
	show: string;
}
interface BrainType {
	name: string;
	autostop?: number; //if > 0, then the process will be canceled if the latest task is staled for this minutes.
	cells: string;
}

export default {
	SaveSignature: async (req: Request, h: ResponseToolkit) => {
		return h.response(
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;

				const tenant_id = CRED.tenant._id;

				const sig = await Signature.findOneAndUpdate(
					{
						tenant: tenant_id,
						eid: CRED.employee.eid,
						objid: PLD.objid,
					},
					{
						$set: {
							signature: PLD.signature,
						},
					},
					{ upsert: true, new: true },
				);

				await Signature.findOneAndUpdate(
					{
						tenant: tenant_id,
						eid: CRED.employee.eid,
						objid: "default",
					},
					{
						$set: {
							signature: PLD.signature,
						},
					},
					{ upsert: true, new: true },
				);

				return { id: sig._id };
			}),
		);
	},
	LoadSignature: async (req: Request, h: ResponseToolkit) => {
		return h.response(
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;

				const tenant_id = CRED.tenant._id;

				const sig = await Signature.findOne({
					tenant: tenant_id,
					eid: CRED.employee.eid,
					objid: PLD.objid,
				});

				return sig && sig.signature ? sig.signature : "Not found";
			}),
		);
	},
};
