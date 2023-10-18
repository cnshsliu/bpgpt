import Tools from "../tools/tools.js";
import EmpError from "./EmpError.js";
import { Types, ClientSession } from "mongoose";
import OrgChart from "../database/models/OrgChart.js";
import { Employee } from "../database/models/Employee.js";
const OrgChartHelper = {
	FIND_ALL: 3,
	FIND_ALL_UPPER: 2,
	FIND_FIRST_UPPER: 1,
	FIND_IN_OU: 0,
	/**
	 * Get the common name of a eid
	 * for department, eid is "OU-department id"
	 */
	getCN: async function (tenant: string | Types.ObjectId, eid: string) {
		let filter: any = { tenant: tenant, eid: eid };
		let ocEntry = await Employee.findOne(filter, { nickname: 1 });
		return ocEntry ? ocEntry.nickname : "Not found";
	},
	getOuCN: async function (tenant: string | Types.ObjectId, ou: string) {
		let filter: any = { tenant: tenant, ou: ou, eid: "OU---" };
		let theOu = await OrgChart.findOne(filter, { cn: 1 });
		return theOu ? theOu.cn : ou + " Not found";
	},
	getOuFullCN: async function (
		tenant: string | Types.ObjectId,
		ou: string,
		includeRoot: boolean = true,
	) {
		let filter: any = { tenant: tenant, eid: "OU---", ou: "root" };
		let rootOu = await OrgChart.findOne(filter, { ou: 1, cn: 1 });
		if (!rootOu) {
			return "OrgchartNotSet";
		}
		if (ou === "root") {
			return rootOu.cn;
		} else {
			let filter: any = { tenant: tenant, eid: "OU---" };
			let allOus = await OrgChart.find(filter, { ou: 1, cn: 1 });
			let tmpArr = [];
			tmpArr.push(rootOu.cn);
			let m = Tools.chunkString(ou, 5);
			for (let i = 0; i < m.length; i++) {
				let tmpOu = "";
				for (let j = 0; j <= i; j++) {
					tmpOu += m[j];
				}
				for (let k = 0; k < allOus.length; k++) {
					if (allOus[k].ou === tmpOu) {
						tmpArr.push(allOus[k].cn);
					}
				}
			}
			return tmpArr.join("-");
		}
	},

	getStaffOU: async function (tenant: string | Types.ObjectId, eid: string) {
		let filter: any = { tenant: tenant, eid: eid };
		let theStaff = await OrgChart.findOne(filter, { __v: 0 });
		let theOu = null;
		if (theStaff) {
			filter = { tenant: tenant, ou: theStaff.ou, eid: "OU---" };
			theOu = await OrgChart.findOne(filter, { __v: 0 });
		}
		return theOu;
	},

	getStaffOUCode: async function (tenant: string | Types.ObjectId, eid: string) {
		let theStaff = await this.getStaff(tenant, eid);
		if (theStaff && theStaff.ou) return theStaff.ou;
		else return "unknown ou";
	},

	getStaff: async function (tenant: string | Types.ObjectId, eid: string) {
		if (eid.indexOf("@") >= 0)
			throw new EmpError("UPGRADE_REQUIRED", "The second param should be eid, not email");
		let filter: any = { tenant: tenant, eid: eid };
		return await OrgChart.findOne(filter, { __v: 0 });
	},

	/**
	 * Get the position of a ocEntry
	 */
	getPosition: async function (tenant: string | Types.ObjectId, eid: string) {
		let filter: any = { tenant: tenant, eid: eid };
		let ocEntry = await OrgChart.findOne(filter, { position: 1 });
		return ocEntry ? ocEntry.position : "Not found";
	},

	/**
	 * Get all peers, include leaders and staffs
	 */
	getAllPeers: async function (tenant: string | Types.ObjectId, eid: string) {
		let filter: any = { tenant: tenant, eid: eid };
		//找到用户
		let ocEntry = await OrgChart.findOne(filter, { ou: 1 });
		let ret = [];
		if (ocEntry) {
			//找到用户的所有Peers
			filter = { tenant: tenant, ou: ocEntry.ou, eid: { $not: /^OU-/ } };
			ret = await OrgChart.find(filter, { __v: 0 });
		}
		return ret;
	},

	/**
	 *  Get Peers by position name
	 *  the peers is in the same ou
	 */
	getSpecificPeers: async function (
		tenant: string | Types.ObjectId,
		eid: string,
		position: string,
	) {
		let filter: any = { tenant: tenant, eid: eid };
		//找到用户
		let ocEntry = await OrgChart.findOne(filter, { ou: 1 });
		let ret = [];
		if (ocEntry) {
			//找到用户的所有Peers
			filter = { tenant: tenant, ou: ocEntry.ou, position: position };
			ret = await OrgChart.find(filter, { __v: 0 });
		}
		return ret;
	},

	/**
	 *   getUpperOrPeerByPosition: async() Get positions upwards from current usrs's org-level, upper or the same level
	 *
	 */
	getUpperOrPeerByPosition: async function (
		tenant: string | Types.ObjectId,
		referredEid: string,
		positions: string,
		mode: number = OrgChartHelper.FIND_IN_OU,
		ou: string = "",
	) {
		let filter: any = { tenant: tenant, eid: referredEid };
		//找到用户
		if (ou === null || ou === undefined) ou = "";
		let ret = [];
		let posArr = positions
			.split(":")
			.map((x) => x.trim())
			.filter((x) => x.length > 0);

		if (ou === "" && mode !== OrgChartHelper.FIND_ALL) {
			let ocEntry = await OrgChart.findOne(filter, { ou: 1 });
			if (!ocEntry) {
				console.log(`Orgchart Entry ${referredEid} not found`);
				return [];
			}
			ou = ocEntry.ou;
		}
		//找到用户的所有Peers
		let ouCondition = undefined;
		let ouIn = [];
		if (ou !== "root") {
			let tmp = ou;
			//否则就要逐级往上检查各级OU
			while (tmp.length > 0) {
				ouIn.push(tmp);
				if (tmp.length - 5 > 0) tmp = tmp.substring(0, tmp.length - 5);
				else break;
			}
			//一直到root为止
		}
		ouIn.push("root");
		//如果这个人在root里，比如CEO，则只查root  OU
		//============
		if (mode === OrgChartHelper.FIND_IN_OU) {
			ou = ou
				.replace(/\.\*/, "DOT_STAR")
				.replace(/\*/, ".*")
				.replace(/DOT_STAR/, ".*");
			ouCondition = { $regex: `^${ou}` };
		} else if (mode === OrgChartHelper.FIND_FIRST_UPPER) {
			for (let i = 0; i < ouIn.length; i++) {
				ouCondition = ouIn[i];
				let tmpFilter = {
					tenant: tenant,
					ou: ouCondition,
					eid: { $ne: "OU---" },
					position: { $in: posArr },
				};
				ret = await OrgChart.find(tmpFilter, { __v: 0 });
				if (ret && Array.isArray(ret) && ret.length > 0) {
					break;
				}
			}
			return ret;
		} else if (mode === OrgChartHelper.FIND_ALL_UPPER) {
			ouCondition = { $in: ouIn };
		} else if (mode === OrgChartHelper.FIND_ALL) {
			ouCondition = undefined;
		}
		//=============
		//以上代码把从当前用户所在部门到最顶层的部门
		//按自底向上的顺序放在了ouIn数组中
		//=============
		//接下来，mongodb搜索用户，
		filter = {
			tenant: tenant,
			//部门需要在ouIn数组中，也就是从当前用户所在部门开始，自底向上一直到root
			ou: ouCondition,
			//排除部门定义，也就是只包含用户
			eid: { $ne: "OU---" },
			//所搜索的职位
			position: { $in: posArr },
		};
		if (posArr.includes("all") || posArr.includes("All") || posArr.includes("ALL")) {
			delete filter.position;
		}
		if (ouCondition === undefined) {
			delete filter.ou;
		}

		ret = await OrgChart.find(filter, { __v: 0 });
		return ret;
	},

	/**
	 *   getOrgStaff: async() GetStaff by PDS
	 *
	 */
	getOrgStaff: async function (
		tenant: string | Types.ObjectId,
		referredEid: string,
		rdsPart: string,
	) {
		let that = this;
		let ret = [];
		// ouReg1/pos1:pos2&ouReg2/pos3:pos4
		let qstrs = rdsPart.split("&");
		for (let i = 0; i < qstrs.length; i++) {
			let qstr = qstrs[i];
			let findScope = OrgChartHelper.FIND_IN_OU;
			if (qstr.indexOf("///") >= 0) {
				qstr = qstr.replace("///", "/");
				findScope = OrgChartHelper.FIND_ALL_UPPER;
			} else if (qstr.indexOf("//") >= 0) {
				qstr = qstr.replace("//", "/");
				findScope = OrgChartHelper.FIND_FIRST_UPPER;
			}

			if (qstr.indexOf("/") < 0) {
				ret = ret.concat(
					await that.getUpperOrPeerByPosition(
						tenant,
						referredEid,
						qstr,
						OrgChartHelper.FIND_ALL,
						"",
					),
				);
			} else {
				let tmp = qstr.split("/");
				let ouReg = tmp[0].trim();
				if (ouReg === "*") {
					ret = ret.concat(
						await that.getUpperOrPeerByPosition(
							tenant,
							referredEid,
							tmp[1],
							OrgChartHelper.FIND_ALL,
						),
					);
				} else {
					ret = ret.concat(
						await that.getUpperOrPeerByPosition(tenant, referredEid, tmp[1], findScope, ouReg),
					);
				}
			}
		}
		return ret;
	},
};

export default OrgChartHelper;
