"use strict";
import { MtcCredentials } from "../../lib/EmpTypes.js";
import { Request, ResponseToolkit } from "@hapi/hapi";
import replyHelper from "../../lib/ReplyHelpers.js";
import DelegateEngine from "../../lib/DelegateEngine.js";
import Cache from "../../lib/Cache.js";
import MongoSession from "../../lib/MongoSession.js";

async function Delegate(req: Request, h: ResponseToolkit) {
	return replyHelper.buildResponse(
		h,
		await MongoSession.noTransaction(async () => {
			const PLD = req.payload as any;
			const CRED = req.auth.credentials as MtcCredentials;

			let tenant = CRED.tenant._id;
			let myEid = CRED.employee.eid;
			await DelegateEngine.delegate(tenant, myEid, PLD.delegatee, PLD.begindate, PLD.enddate);
			let latestETag = await Cache.resetETag("ETAG:DELEGATION:" + myEid);
			return replyHelper.buildReturnWithEtag(
				await DelegateEngine.delegationFromMe(tenant, myEid),
				latestETag,
			);
		}),
	);
}

async function UnDelegate(req: Request, h: ResponseToolkit) {
	return replyHelper.buildResponse(
		h,
		await MongoSession.noTransaction(async () => {
			const PLD = req.payload as any;
			const CRED = req.auth.credentials as MtcCredentials;
			let tenant = CRED.tenant._id;
			let myEid = CRED.employee.eid;
			await DelegateEngine.undelegate(tenant, myEid, PLD.ids);
			let latestETag = await Cache.resetETag("ETAG:DELEGATION:" + myEid);
			return replyHelper.buildReturnWithEtag(
				await DelegateEngine.delegationFromMe(tenant, myEid),
				latestETag,
			);
		}),
	);
}

async function DelegationFromMe(req: Request, h: ResponseToolkit) {
	return replyHelper.buildResponse(
		h,
		await MongoSession.noTransaction(async () => {
			const CRED = req.auth.credentials as MtcCredentials;
			let tenant = CRED.tenant._id;
			let myEid = CRED.employee.eid;
			let ifNoneMatch = req.headers["if-none-match"];
			let latestETag = Cache.getETag("ETAG:DELEGATION:" + myEid);
			if (ifNoneMatch && latestETag && ifNoneMatch === latestETag) {
				return replyHelper.build304([], latestETag);
			}
			let res = await DelegateEngine.delegationFromMe(tenant, myEid);
			return replyHelper.buildReturnWithEtag(res, latestETag);
		}),
	);
}

async function DelegationFromMeToday(req: Request, h: ResponseToolkit) {
	return replyHelper.buildResponse(
		h,
		await MongoSession.noTransaction(async () => {
			const CRED = req.auth.credentials as MtcCredentials;
			let tenant = CRED.tenant._id;
			let myEid = CRED.employee.eid;
			let ifNoneMatch = req.headers["if-none-match"];
			let latestETag = Cache.getETag("ETAG:DELEGATION:" + myEid);
			if (ifNoneMatch && latestETag && ifNoneMatch === latestETag) {
				return replyHelper.build304([], latestETag);
			}
			return replyHelper.buildReturnWithEtag(
				await DelegateEngine.delegationFromMeToday(tenant, myEid),
				latestETag,
			);
		}),
	);
}

async function DelegationFromMeOnDate(req: Request, h: ResponseToolkit) {
	return replyHelper.buildResponse(
		h,
		await MongoSession.noTransaction(async () => {
			const PLD = req.payload as any;
			const CRED = req.auth.credentials as MtcCredentials;
			let tenant = CRED.tenant._id;
			let myEid = CRED.employee.eid;
			let ifNoneMatch = req.headers["if-none-match"];
			let latestETag = Cache.getETag("ETAG:DELEGATION:" + myEid);
			if (ifNoneMatch && latestETag && ifNoneMatch === latestETag) {
				return replyHelper.build304([], latestETag);
			}
			return replyHelper.buildReturnWithEtag(
				await DelegateEngine.delegationFromMeOnDate(tenant, myEid, PLD.onDate),
				latestETag,
			);
		}),
	);
}

async function DelegationToMe(req: Request, h: ResponseToolkit) {
	return replyHelper.buildResponse(
		h,
		await MongoSession.noTransaction(async () => {
			const CRED = req.auth.credentials as MtcCredentials;
			let tenant = CRED.tenant._id;
			let myEid = CRED.employee.eid;
			let ifNoneMatch = req.headers["if-none-match"];
			let latestETag = Cache.getETag("ETAG:DELEGATION:" + myEid);
			if (ifNoneMatch && latestETag && ifNoneMatch === latestETag) {
				return replyHelper.build304([], latestETag);
			}
			return replyHelper.buildReturnWithEtag(
				await DelegateEngine.delegationToMe(tenant, myEid),
				latestETag,
			);
		}),
	);
}

async function DelegationToMeToday(req: Request, h: ResponseToolkit) {
	return replyHelper.buildResponse(
		h,
		await MongoSession.noTransaction(async () => {
			const CRED = req.auth.credentials as MtcCredentials;
			let tenant = CRED.tenant._id;
			let myEid = CRED.employee.eid;
			let ifNoneMatch = req.headers["if-none-match"];
			let latestETag = Cache.getETag("ETAG:DELEGATION:" + myEid);
			if (ifNoneMatch && latestETag && ifNoneMatch === latestETag) {
				return replyHelper.build304([], latestETag);
			}
			const ret = replyHelper.buildReturnWithEtag(
				await DelegateEngine.delegationToMeToday(tenant, myEid),
				latestETag,
			);
			return ret;
		}),
	);
}

async function DelegationToMeOnDate(req: Request, h: ResponseToolkit) {
	return replyHelper.buildResponse(
		h,
		await MongoSession.noTransaction(async () => {
			const PLD = req.payload as any;
			const CRED = req.auth.credentials as MtcCredentials;
			let tenant = CRED.tenant._id;
			let myEid = CRED.employee.eid;
			let ifNoneMatch = req.headers["if-none-match"];
			let latestETag = Cache.getETag("ETAG:DELEGATION:" + myEid);
			if (ifNoneMatch && latestETag && ifNoneMatch === latestETag) {
				return replyHelper.build304([], latestETag);
			}
			return replyHelper.buildReturnWithEtag(
				await DelegateEngine.delegationToMeOnDate(tenant, myEid, PLD.onDate),
				latestETag,
			);
		}),
	);
}

export default {
	Delegate,
	UnDelegate,
	DelegationFromMe,
	DelegationFromMeToday,
	DelegationFromMeOnDate,
	DelegationToMe,
	DelegationToMeToday,
	DelegationToMeOnDate,
};
