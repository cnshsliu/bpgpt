"use strict";
import MongoSession from "../../lib/MongoSession.js";
import Engine from "../../lib/Engine.js";
import { Request, ResponseToolkit } from "@hapi/hapi";
import { shortId } from "../../lib/IdGenerator.js";
import { Template } from "../../database/models/Template.js";
import Cache from "../../lib/Cache.js";
import KsTpl from "../../database/models/KsTpl.js";
import EmpError from "../../lib/EmpError.js";

export default {
	TryById: async (req: Request, h: ResponseToolkit) => {
		return h.response(
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				// const CRED = req.auth.credentials as any;

				let kstpl = await KsTpl.findOne({ ksid: PLD.tryid }, { doc: 0 }).lean();
				if (!kstpl) throw new EmpError("ERR_KS_TEMPLATE_NOT_FOUND", "KSTPL not found");

				return kstpl;
			}),
		);
	},

	StartTryByKsId: async (req: Request, h: ResponseToolkit) => {
		return h.response(
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;

				let kstpl = await KsTpl.findOne({ ksid: PLD.tryid }, { doc: 1 }).lean();
				if (!kstpl) throw new EmpError("ERR_KS_TEMPLATE_NOT_FOUND", "KSTPL not found");
				let author = CRED.employee.eid;
				const newTemplate = new Template({
					tenant: CRED.tenant._id,
					tplid: shortId(),
					author: author,
					authorName: await Cache.getEmployeeName(CRED.tenant._id, author, "TemplateImport"),
					ins: false,
					doc: kstpl["doc"],
					ksid: PLD.tryid,
					searchable: false,
				});
				await newTemplate.save();
				await Cache.resetETag(`ETAG:TEMPLATES:${CRED.tenant._id}`);

				let wfid = shortId();
				debugger;
				let wfDoc = await Engine.startWorkflow({
					rehearsal: false,
					tenant: CRED.tenant._id,
					tplid: newTemplate.tplid,
					starter: CRED.employee,
					pbostatus: "__init__",
					wfid: wfid,
					wftitle: PLD.wftitle,
					runmode: "standalone",
				});
				await Engine.resetTodosETagByWfId(CRED.tenant._id, wfid);
				await Cache.resetETag(`ETAG:WORKFLOWS:${CRED.tenant._id}`);
				return wfDoc;
			}),
		);
	},
};
