import { Types } from "mongoose";
import Cache from "./Cache.js";
import TimeZone from "./timezone.js";
import Delegation from "../database/models/Delegation.js";
import { Employee } from "../database/models/Employee.js";
import EmpError from "./EmpError.js";
const delegate = async function (
	tenant: string | Types.ObjectId,
	delegator: string,
	delegatee: string,
	begindate: string,
	enddate: string,
) {
	if (delegator === delegatee) {
		throw new EmpError(
			"DELEGATE_FAILED_SAME_USER",
			`${delegator} and ${delegatee} are the same one`,
		);
	}
	let employees = await Employee.find(
		{ tenant: tenant, eid: { $in: [delegator, delegatee] } },
		{ _id: 0, eid: 1 },
	);
	if (employees.length !== 2) {
		throw new EmpError(
			"DELEGATE_FAILED_NOT_SAME_ORG",
			`${delegator} and ${delegatee} are not in the same org`,
		);
	}
	let tz = await Cache.getOrgTimeZone(tenant);
	let tzdiff = TimeZone.getDiff(tz);
	let dateBegin = new Date(begindate + (begindate.includes("T00:") ? "" : "T00:00:00") + tzdiff);
	let dateEnd = new Date(enddate + (enddate.includes("T00:") ? "" : "T00:00:00") + tzdiff);
	dateEnd.setDate(dateEnd.getDate() + 1);
	//TODO: 找到重叠的委托及被委托，重复则不允许
	if (
		(await Delegation.countDocuments({
			//我发出去的，有没有时间区间重叠的
			tenant: tenant,
			delegator: delegator,
			begindate: { $lt: dateEnd },
			enddate: { $gt: dateBegin },
		})) +
			(await Delegation.countDocuments({
				// 我收到的，有没有时间区间重叠的
				tenant: tenant,
				delegatee: delegator,
				begindate: { $lt: dateEnd },
				enddate: { $gt: dateBegin },
			})) >
		0
	) {
		throw new EmpError("DELEGATE_FAILED_OVERLAP", `There are overlapped delegation`);
	}
	let obj = new Delegation({
		tenant: tenant,
		delegator: delegator,
		delegatee: delegatee,
		begindate: dateBegin,
		enddate: dateEnd,
	});
	obj = await obj.save();
};

const delegationFromMe = async function (tenant: string | Types.ObjectId, delegator_eid: string) {
	return delegationFromMeOnDate(tenant, delegator_eid);
};
const delegationFromMeToday = async function (
	tenant: string | Types.ObjectId,
	delegator_eid: string,
) {
	return delegationFromMeOnDate(tenant, delegator_eid, new Date());
};
const delegationFromMeOnDate = async function (
	tenant: string | Types.ObjectId,
	delegator_eid: string,
	onDate = null,
) {
	let filter = { tenant: tenant, delegator: delegator_eid };
	if (onDate) {
		filter["begindate"] = { $lte: onDate };
		filter["enddate"] = { $gte: onDate };
	}
	let ret = await Delegation.find(
		filter,
		{ _id: 1, delegator: 1, delegatee: 1, begindate: 1, enddate: 1 },
		{
			sort: {
				begindate: 1,
			},
		},
	);
	return ret;
};
const undelegate = async function (
	tenant: string | Types.ObjectId,
	delegator_eid: string,
	ids: string[],
) {
	let filter = { tenant: tenant, delegator: delegator_eid, _id: { $in: ids } };
	await Delegation.deleteMany(filter);
};
const delegationToMe = async function (tenant: string | Types.ObjectId, delegatee_eid: string) {
	return delegationToMeOnDate(tenant, delegatee_eid, null);
};
const delegationToMeToday = async function (
	tenant: string | Types.ObjectId,
	delegatee_eid: string,
) {
	return delegationToMeOnDate(tenant, delegatee_eid, new Date());
};
const delegationToMeOnDate = async function (
	tenant: string | Types.ObjectId,
	delegatee_eid: string,
	onDate: any,
) {
	let filter = { tenant: tenant, delegatee: delegatee_eid };
	if (onDate) {
		filter["begindate"] = { $lte: onDate };
		filter["enddate"] = { $gte: onDate };
	}

	let ret = await Delegation.find(
		filter,
		{ _id: 1, delegator: 1, delegatee: 1, begindate: 1, enddate: 1 },
		{
			sort: {
				begindate: 1,
			},
		},
	);
	return ret;
};

export default {
	undelegate,
	delegationToMeOnDate,
	delegationToMeToday,
	delegationToMe,
	delegationFromMeOnDate,
	delegationFromMeToday,
	delegationFromMe,
	delegate,
};
