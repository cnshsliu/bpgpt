import { Request, ResponseToolkit } from "@hapi/hapi";
import Parser from "../../lib/Parser.js";
import MongoSession from "../../lib/MongoSession.js";
import fs from "fs";
import path from "path";
// import Joi from "joi";
import KsTpl from "../../database/models/KsTpl.js";
import { Site } from "../../database/models/Site.js";
import { Template } from "../../database/models/Template.js";
import { shortId } from "../../lib/IdGenerator.js";
import replyHelper from "../../lib/ReplyHelpers.js";
import Engine from "../../lib/Engine.js";
import EmpError from "../../lib/EmpError.js";
import lodash from "lodash";
import Cache from "../../lib/Cache.js";
import { redisClient } from "../../database/redis.js";

const CheckKsAdminPermission = async (cred: any) => {
	let allowDomains = Parser.splitStringToArray(await Cache.getKsAdminDomain());
	if (cred.employee.group !== "ADMIN" || allowDomains.indexOf(cred.tenant.domain) < 0)
		throw new EmpError(
			"KS_DOMAIN_ADMIN_IS_REQUIRED",
			`Only allowed domain [${await Cache.getKsAdminDomain()}] administrators are allowed for this operation, yours: ${
				cred.tenant.domain
			}, group: ${cred.employee.group}`,
		);
};

export default {
	KsTplRemoveOne: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				await CheckKsAdminPermission(CRED);
				const { ksid, withFile } = PLD;
				await KsTpl.deleteOne({ ksid: ksid });
				if (withFile) {
					fs.rmSync(path.join(process.env.PFD_KSHARE_FOLDER, ksid));
				}
				return "Done";
			}),
		);
	},

	KsTplUpdateOne: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				await CheckKsAdminPermission(CRED);
				const { ksid, name, desc } = PLD;
				return await KsTpl.findOneAndUpdate(
					{ ksid: ksid },
					{
						$set: { name: name, desc: desc },
					},
					{ upsert: false, new: true },
				);
			}),
		);
	},

	KsTplPickOne: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;

				const { ksid, pickto } = PLD;
				if (await Template.findOne({ tenant: tenant_id, tplid: pickto }, { doc: 0 })) {
					throw new EmpError("ALREADY_EXIST", "Template exists, cannot overwrite it");
				}
				let tplid = pickto;
				let author = myEid;
				const newTemplate = new Template({
					tenant: tenant_id,
					tplid: tplid,
					author: author,
					authorName: await Cache.getEmployeeName(tenant_id, author, "TemplateImport"),
					ins: false,
					doc: (await KsTpl.findOne({ ksid: ksid }, { doc: 1 }))["doc"],
					ksid: ksid,
					searchable: true,
				});
				await newTemplate.save();
				await Cache.resetETag(`ETAG:TEMPLATES:${tenant_id}`);

				return { ret: "success", tplid: tplid };
			}),
		);
	},

	KsConfigGet: async (req: Request, h: ResponseToolkit) => {
		try {
			//do nothing to ignore ts warning
			try {
				req.payload["nothing"] = "nothing";
			} catch (e) {}
			return h.response(JSON.parse(await Cache.getKsConfig()));
		} catch (err) {
			console.error(err);
			return h.response(replyHelper.constructErrorResponse(err)).code(500);
		}
	},

	KsConfigSet: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				await CheckKsAdminPermission(CRED);
				const ksconfig = PLD.ksconfig;
				const ksconfigString = JSON.stringify(ksconfig);
				console.log(ksconfigString);
				await Site.findOneAndUpdate(
					{},
					{ $set: { ksconfig: ksconfigString } },
					{ upsert: false, new: true },
				);
				Cache.delKey("KSCONFIG");
				return { ret: "Done" };
			}),
		);
	},

	KsAble: async (req: Request, h: ResponseToolkit) => {
		// const PLD = req.payload as any;
		const CRED = req.auth.credentials as any;
		try {
			try {
				await CheckKsAdminPermission(CRED);
				return h.response({ ksable: true });
			} catch (e) {
				console.log(e);
				return h.response({ ksable: false });
			}
		} catch (err) {
			console.error(err);
			return h.response(replyHelper.constructErrorResponse(err)).code(500);
		}
	},

	KsTplSearch: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				let ret = null;
				if (ret === null) {
					let filter = {};
					if (PLD.q) {
						filter["$or"] = [
							{
								name: { $regex: `.*${PLD.q}.*` },
							},
							{
								desc: { $regex: `.*${PLD.q}.*` },
							},
						];
					}
					//PLD.tags = ["碳中和", "生产"];
					if (PLD.author?.trim()) {
						filter["author"] = new RegExp(".*" + PLD.author + ".*");
					}
					if (PLD.tags.length > 0) {
						filter["tags"] = { $all: PLD.tags };
					}
					ret = await KsTpl.find(filter, { _id: 0, doc: 0, __v: 0 })
						.sort("-_id")
						.limit(1000)
						.lean();
				}
				return replyHelper.buildReturn(ret, replyHelper.headers.nocache);
			}),
		);
	},

	KsTplScan: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const CRED = req.auth.credentials as any;
				await CheckKsAdminPermission(CRED);
				await Cache.removeKey("KSTPLS");
				await redisClient.del("KSTPLS");
				await Engine.scanKShares();
				await Cache.resetETag("ETAG:KSTPLS");
				return "Done";
			}),
		);
	},

	KsTplClearCache: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const CRED = req.auth.credentials as any;
				await CheckKsAdminPermission(CRED);
				await Cache.removeKey("KSTPLS");
				await Cache.resetETag("ETAG:KSTPLS");
				return Cache.getETag("ETAG:KSTPLS");
			}),
		);
	},

	KsTplAddTag: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				await CheckKsAdminPermission(CRED);
				const { ksid, tag } = PLD;
				let tagTextArr = Parser.splitStringToArray(tag);
				//去除空tag
				tagTextArr = tagTextArr.filter((x: string) => {
					return x.trim().length > 0;
				});
				let theTpl = await KsTpl.findOne({ ksid: ksid }, { __v: 0 });
				if (!theTpl) throw new EmpError("NOT_FOUND", "KsTpl not found");
				let existingTags = theTpl.tags;
				let tagsToAdd = lodash.difference(tagTextArr, existingTags);
				if (tagsToAdd.length > 0) {
					theTpl = await KsTpl.findOneAndUpdate(
						{ ksid: ksid },
						{ $addToSet: { tags: { $each: tagsToAdd } } },
						{ upsert: false, new: true },
					);
					await Cache.resetETag(`ETAG:KSTPLS`);
				}
				return theTpl;
			}),
		);
	},

	KsTplPrepareDesign: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;

				await CheckKsAdminPermission(CRED);

				await Template.deleteMany({
					tenant: tenant_id,
					author: myEid,
					tplid: { $regex: /^TMP_KSHARE_/ },
				});
				const { ksid } = PLD;
				const ksharetplid = "TMP_KSHARE_" + ksid.replace(/\//g, "_");
				await Template.findOneAndUpdate(
					{
						tenant: tenant_id,
						tplid: ksharetplid,
					},
					{
						$set: {
							author: myEid,
							authorName: CRED.employee.nickname,
							ins: true,
							doc: (await KsTpl.findOne({ ksid: ksid }, { doc: 1 }))["doc"],
							ksid: ksid,
						},
					},
					{ upsert: true, new: true },
				);
				return ksharetplid;
			}),
		);
	},

	KsTplDelTag: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				await CheckKsAdminPermission(CRED);
				const { ksid, tag } = PLD;
				const theTpl = await KsTpl.findOneAndUpdate(
					{
						ksid: ksid,
					},
					{
						$pull: { tags: tag },
					},
					{ upsert: false, new: true },
				);
				await Cache.resetETag(`ETAG:KSTPLS`);
				return theTpl;
			}),
		);
	},

	KshareTemplate: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				// let myGroup = CRED.employee.group;

				const { tplid, name, desc, tags } = PLD;

				await CheckKsAdminPermission(CRED);
				const newKstpl = new KsTpl({
					author: myEid,
					name: name,
					desc: desc,
					tags: tags,
					ksid: shortId(),
					doc: (await Template.findOne({ tenant: tenant_id, tplid: tplid }, { __v: 0 })).doc,
				});
				await newKstpl.save();
				return { ksable: true };
			}),
		);
	},
};
