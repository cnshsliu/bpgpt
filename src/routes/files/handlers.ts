import Mongoose from "mongoose";
import EmpError from "../../lib/EmpError.js";
import { Request, ResponseToolkit } from "@hapi/hapi";
import replyHelper from "../../lib/ReplyHelpers.js";
import { Workflow } from "../../database/models/Workflow.js";
import { PondFile } from "../../database/models/PondFile.js";
import fs from "fs";
import path from "path";
import Tools from "../../tools/tools.js";

let getWf = async (tenant, file, wfid = "") => {
	let matchFilter: any = {
		tenant: new Mongoose.Types.ObjectId(tenant),
		"attachments.serverId": file,
	};
	if (wfid) {
		matchFilter = { tenant: new Mongoose.Types.ObjectId(tenant), wfid: wfid };
	}
	let wf = await Workflow.aggregate([
		{ $match: matchFilter },
		{ $project: { _id: 0, doc: 0 } },
		{ $unwind: "$attachments" },
		{ $match: { "attachments.serverId": file } },
	]);
	return wf;
};

async function MyFiles(req: Request, h: ResponseToolkit) {
	const PLD = req.payload as any;
	const CRED = req.auth.credentials as any;
	let tenant = CRED.tenant._id;
	let q = PLD.q;
	let wf = PLD.wf;
	let regex = new RegExp(`.*${q}.*`);
	try {
		let userPath = path.join(Tools.getTenantFolders(tenant).attachment, CRED.employee.eid);
		if (!fs.existsSync(userPath)) fs.mkdirSync(userPath, { mode: 0o700, recursive: true });
		let files = fs.readdirSync(userPath);
		let ret = [];
		for (let i = 0; i < files.length; i++) {
			let file = files[i];
			let pondfile = await PondFile.findOne({
				tenant: tenant,
				serverId: file,
			});
			if (!q) {
				let awf = await getWf(tenant, file, wf);
				if (!wf || (wf && awf[0])) ret.push({ serverId: file, pondfile: pondfile, wf: awf[0] });
			} else {
				if (pondfile && pondfile.realName.match(regex)) {
					let awf = await getWf(tenant, file, wf);
					if (!wf || (wf && awf[0])) ret.push({ serverId: file, pondfile: pondfile, wf: awf[0] });
				}
			}
		}
		return h.response(ret);
	} catch (err) {
		console.log(err);
		return h.response(replyHelper.constructErrorResponse(err)).code(500);
	}
}

async function ViewMyFile(req: Request, h: ResponseToolkit) {
	try {
		const PLD = req.payload as any;
		const CRED = req.auth.credentials as any;
		let tenant = CRED.tenant._id;
		let myEid = CRED.employee.eid;
		let serverId = PLD.serverId;

		let aFile = await PondFile.findOne({ tenant: tenant, author: myEid, serverId: serverId });
		let pondServerFile = Tools.getPondServerFile(tenant, myEid, serverId);
		var readStream = fs.createReadStream(pondServerFile.fullPath);
		return h
			.response(readStream)
			.header("cache-control", "no-cache")
			.header("Pragma", "no-cache")
			.header("Access-Control-Allow-Origin", "*")
			.header("Content-Type", aFile ? aFile.contentType : "application/octet-stream")
			.header(
				"Content-Disposition",
				`attachment;filename="${encodeURIComponent(aFile ? aFile.realName : serverId)}"`,
			);
	} catch (err) {
		console.error(err);
		return h.response(replyHelper.constructErrorResponse(err)).code(500);
	}
}

async function DeleteMyFile(req: Request, h: ResponseToolkit) {
	try {
		const PLD = req.payload as any;
		const CRED = req.auth.credentials as any;
		let tenant = CRED.tenant._id;
		let myEid = CRED.employee.eid;
		let serverId = PLD.serverId;
		let wf = await Workflow.aggregate([
			{ $match: { tenant: tenant, "attachments.serverId": serverId } },
			{ $project: { _id: 0, doc: 0 } },
			{ $unwind: "$attachments" },
			{ $match: { "attachments.serverId": serverId } },
		]);
		if (wf[0]) {
			throw new EmpError("CANNOT_DELETE", "File is used in workflow");
		}

		let pondServerFile = Tools.getPondServerFile(tenant, myEid, serverId);
		fs.unlinkSync(pondServerFile.fullPath);
		await PondFile.deleteOne({ tenant: tenant, author: myEid, serverId: serverId });
		return h.response({ success: true });
	} catch (err) {
		console.error(err);
		return h.response(replyHelper.constructErrorResponse(err)).code(500);
	}
}

export default {
	MyFiles,
	ViewMyFile,
	DeleteMyFile,
};
