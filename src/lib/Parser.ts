import { load as CheerioLoad } from "cheerio";
import { Cheerio, CheerioAPI, Node as CheerioNode } from "cheerio";
import lodash from "lodash";
import Moment from "moment";
import Const from "./Const.js";
import Tools from "../tools/tools.js";
import { Types, ClientSession } from "mongoose";
import EmpError from "./EmpError.js";
import { Employee } from "../database/models/Employee.js";
import { Team, TeamType } from "../database/models/Team.js";
import KVar from "../database/models/KVar.js";
import OrgChart from "../database/models/OrgChart.js";
import OrgChartAdmin from "../database/models/OrgChartAdmin.js";
import { Cell } from "../database/models/Cell.js";
import Cache from "./Cache.js";
import OrgChartHelper from "./OrgChartHelper.js";
import type { DoerInfo, DoersArray } from "./EmpTypes.js";

const Parser = {
	parse: async function (str: string): Promise<CheerioAPI> {
		return CheerioLoad(str);
	},
	/*
 * //field defiition:
 * [typeprefix_]name:value|{ "value": value[, "label": label[, "palceholder":placeholder[, "breakrow": true|false]]]}
            {
            "days":{ "value": 3,"label": "how many days to leave?"},
            "reason":{ "value": "see parent", "label":"what reason for this leave?"},
            "email_var":{ "value": "", "label":"umail var", "breakrow":true},
            "password_var":{ "value": "", "label":"password var", "breakrow":true},
            "url_var":{ "value": "", "label":"url var", "placeholder": "url placeholder"},
            "range_var":{ "value": "", "label":"range var"},
            "number_var":{ "value": "", "label":"number var"},
            "datetime_var":{ "value": "", "label":"datetime var"},
            "date_var":{ "value": "", "label":"date var"},
            "time_var":{ "value": "", "label":"time var"},
            "color_var":{ "value": "", "label":"color var"},
            "search_var":{ "value": "", "label":"search var"},
            "select_var":{ "value": "", "label":"select var"},
            "textarea_var":{ "value": "", "label":"textarea var"},
            "file_var":{ "value": "", "label":"file var"},
            "radio_var":{ "value": "", "label":"radio var"},
            "checkbox_var":{ "value": "", "label":"checkbox var"},
            "days2": 22,
            "reason2": "see parent2",
            "day3": {"value": 32},
            "reason3": "see parent3",
            "reason4": {"value": "see parent4"}
            }
*/

	isEmpty: function (str: string | number): boolean {
		if (str === undefined || str === null) return true;
		if (str === "") return true;
		return false;
	},
	hasValue: function (str: string | number): boolean {
		return Tools.hasValue(str);
	},
	mergeValueFrom: async function (objA: any, objB: any) {
		for (let [name, valueDef] of Object.entries(objA)) {
			valueDef = valueDef;
			if (objB[name]) {
				objA[name]["value"] = objB[name]["value"];
			}
		}
	},
	mergeVars: async function (tenant: string | Types.ObjectId, vars: any, newVars_json: any) {
		try {
			if (newVars_json === null || newVars_json === undefined) {
				newVars_json = {};
			}
			let names = Object.keys(newVars_json);
			for (let k = 0; k < names.length; k++) {
				let name = names[k];
				let valueDef = newVars_json[name];
				if (vars.hasOwnProperty(name) === false) {
					vars[name] = {};
				}
				if (valueDef.hasOwnProperty("value") === false) {
					if (typeof valueDef !== "object") valueDef = { value: valueDef, label: name };
				}
				vars[name] = { ...vars[name], ...valueDef };
				vars[name]["ui"] = ["input", "context"];
				if (name.startsWith("cn_usr_") || name.startsWith("cn_user_")) {
					vars[name]["ui"] = [];
				} else if (name.startsWith("ou_usr_") || name.startsWith("ou_user_")) {
					vars[name]["ui"] = [];
				} else if (name.startsWith("ou_")) {
					vars[name]["display"] = await OrgChartHelper.getOuFullCN(tenant, valueDef.value);
				} else if (name.startsWith("usr_") || name.startsWith("user_")) {
					if (valueDef.value) {
						let theCN = await Cache.getEmployeeName(tenant, valueDef.value);
						vars["cn_" + name] = { ui: [], value: theCN, label: vars[name]["label"] + "CN" };
						//插入display
						vars[name]["display"] = theCN;
						//插入OU
						let userOU = await Cache.getEmployeeOU(tenant, valueDef.value);
						vars["ou_" + name] = {
							ui: ["context"],
							value: userOU,
							label: "OUof_" + vars[name]["label"],
						};
						//插入OU的display
						vars["ou_" + name]["display"] = await OrgChartHelper.getOuFullCN(tenant, userOU);
					}
				}
				if (!vars[name]["label"]) {
					vars[name]["label"] = name;
				}
				if (name.startsWith("tbl_")) {
					vars[name]["breakrow"] = true;
				}
			}
			return vars;
		} catch (error) {
			console.error(error);
			return vars;
		}
	},

	userGetVars: async function (
		tenant: string | Types.ObjectId,
		checkVisiForEid: string,
		wfid: string,
		objid: string,
		doers = [],
		notdoers = [],
		efficient: string,
	) {
		if (typeof wfid !== "string") {
			console.trace("wfid should be a string");
		}
		let retResult = {};
		const mergeBase64Vars = async function (
			tenant: string | Types.ObjectId,
			destVars: any,
			base64_string: string,
		) {
			let code = Parser.base64ToCode(base64_string);
			let jsonVars = {};
			try {
				jsonVars = JSON.parse(code);
			} catch (err) {
				console.log(err);
			}
			destVars = await Parser.mergeVars(tenant, destVars, jsonVars);
			return destVars;
		};
		let filter = {};
		//如果是workflow，则就是查询流程中所有数据，否则，只查询objid这个节点的数据
		if (objid === Const.FOR_WHOLE_PROCESS) {
			filter = { tenant: tenant, wfid: wfid };
		} else {
			filter = { tenant: tenant, wfid: wfid, objid: objid };
		}
		//如果efficient不是any，则添加上yes和no的条件
		if (efficient.toLowerCase() !== "any") {
			filter["eff"] = efficient.toLowerCase();
		}
		//这个 createdAt先后顺序sort非常关键，保障新的覆盖老的
		let kvars = await KVar.find(filter, { __v: 0 }).sort("createdAt");

		for (let i = 0; i < kvars.length; i++) {
			let includeIt = true;
			let doer = kvars[i].doer;
			if (!doer) doer = "EMP";
			// 添加白名单用户的kvar
			if (doers.length > 0) {
				if (doers.indexOf(doer) < 0) includeIt = false;
				else includeIt = true;
			}
			// 去除黑名单用户的kvar
			if (includeIt && notdoers.length > 0) {
				if (notdoers.indexOf(doer) >= 0) includeIt = false;
			}
			if (includeIt) {
				retResult = await mergeBase64Vars(tenant, retResult, kvars[i].content);
			}
		}

		//使visi控制配置发生作用，如果某个变量设置了visi，则只有visi中设置的用户能够看到这些数据
		//如果formWhom不是EMP，而是邮箱，则需要检查visi
		//EMP是用在代表系统， 系统应该都可以看到全部
		//只有当不是EMP时，执行后续检查
		if (checkVisiForEid !== "EMP") {
			//处理kvar的可见行 visi,
			//
			//
			//
			let kvarKeys = Object.keys(retResult);
			for (let k = 0; k < kvarKeys.length; k++) {
				let key = kvarKeys[k];
				let valueDef = retResult[key];

				//如果没有定义，visi，则公开
				let hasVisi = Tools.hasValue(valueDef.visi);
				if (hasVisi) {
					if (checkVisiForEid === Const.VISI_FOR_NOBODY) {
						delete retResult[key];
					} else {
						//检查具体用户是否在visi中
						let tmp = await Parser.getDoer(
							tenant,
							"",
							valueDef.visi, //pds of visi  。 这里的visi可以是@lucas@steve，也可以是[somebody],因为后面带入了 retResult
							checkVisiForEid,
							wfid,
							null, //wfRoot
							null, //wfIO
							retResult, //当前的kvars
						);
						let visiPeople = tmp.map((x) => x.eid);
						if (visiPeople.includes(checkVisiForEid) === false) {
							delete retResult[key];
						}
					}
				} else {
					//去除CSV类控制
					if (key.startsWith("csv_")) {
						//取得csv的fileid
						let fileId = valueDef.value;
						//根据fileID差cell的author
						let cell = await Cell.findOne(
							{ tenant: tenant, serverId: fileId },
							{ _id: 0, author: 1 },
						).lean();
						if (cell) {
							//如果cell的用户不是当前用户，则删除
							if (cell.author !== checkVisiForEid) {
								delete retResult[key];
							}
						}
					}
				}
			}
		}

		let names = Object.keys(retResult);
		for (let k = 0; k < names.length; k++) {
			let name = names[k];
			let valueDef = retResult[name];
			if (Tools.isEmpty(valueDef.type)) {
				valueDef.type = Parser.getVarType(name, valueDef.value);
			}
		}

		//Remove NOT_MINE csv cell

		return retResult;
	},

	getVar: async function (
		tenant: string,
		wfid: string,
		objid: string,
		efficient: string,
		varName: string,
	) {
		let retResult = this.userGetVars(tenant, "EMP", wfid, objid, [], [], efficient);
		let names = Object.keys(retResult);
		let valueDef = null;
		for (let k = 0; k < names.length; k++) {
			let name = names[k];
			if (name === varName) {
				valueDef = retResult[name];
				break;
			}
		}

		return valueDef;
	},

	sysGetTemplateVars: async function (
		tenant: string | Types.ObjectId,
		elem: any,
		wfIO: CheerioAPI,
	) {
		let ret = {};
		const mergeTplVars = async function (elem: any, destVars: any) {
			let base64_string = elem.text();
			let code = Parser.base64ToCode(base64_string);
			let jsonVars = {};
			try {
				jsonVars = JSON.parse(code);
			} catch (err) {
				console.log(err);
			}
			destVars = await Parser.mergeVars(tenant, destVars, jsonVars);
			return destVars;
		};
		if (elem.hasClass("kvars")) {
			ret = await mergeTplVars(elem, ret);
		} else {
			let kvars = elem.find(".kvars");
			for (let i = 0; i < kvars.length; i++) {
				let cheerObj = wfIO(kvars.get(i));
				ret = await mergeTplVars(cheerObj, ret);
			}
		}
		return ret;
	},
	//Get Team define from PDS. a Team definition starts with "T:"
	getTeamInPDS: function (pds: string) {
		let ret = null;
		if (Tools.isEmpty(pds)) {
			return ret;
		}
		let arr = Parser.splitStringToArray(pds);
		for (let i = 0; i < arr.length; i++) {
			if (arr[i].startsWith("T:")) {
				ret = arr[i].substring(2);
			}
		}
		return ret;
	},

	//Get Leader in current OU level
	__getLeaderByPosition: async function (
		tenant: string | Types.ObjectId,
		referredEid: string,
		rdsPart: string,
	) {
		let positions = rdsPart.startsWith("L:") ? rdsPart.substring(2) : rdsPart;
		let leaders = await OrgChartHelper.getUpperOrPeerByPosition(
			tenant,
			referredEid,
			positions,
			OrgChartHelper.FIND_FIRST_UPPER,
		);
		let ret = leaders.map((x) => {
			return { eid: x.eid, cn: x.cn };
		});
		return ret;
	},

	__getPeerByPosition: async function (
		tenant: string | Types.ObjectId,
		eid: string,
		rdsPart: string,
	) {
		const getPeerByPositionFromOrgChart = async function (
			tenant: string | Types.ObjectId,
			eid: string,
			positions: string,
		) {
			let filter: any = { tenant: tenant, eid: eid };
			//找到用户
			let person = await OrgChart.findOne(filter, { ou: 1 });
			let posArr = positions
				.split(":")
				.map((x) => x.trim())
				.filter((x) => x.length > 0);
			let ret = [];
			if (person) {
				//找到用户的所有Peers
				filter = {
					tenant: tenant,
					ou: person.ou,
					eid: { $ne: "OU---" },
					position: { $in: posArr },
				};
				if (posArr.includes("all")) {
					delete filter["position"];
				}
				ret = await OrgChart.find(filter, { __v: 0 });
			}
			return ret;
		};
		let positions = rdsPart.startsWith("P:") ? rdsPart.substring(2) : rdsPart;
		let leaders = await getPeerByPositionFromOrgChart(tenant, eid, positions);
		let ret = leaders.map((x) => {
			return { eid: x.eid, cn: x.cn };
		});
		return ret;
	},

	__getStaffByQuery: async function (
		tenant: string | Types.ObjectId,
		referredEid: string,
		rdsPart: string,
	) {
		let positions = rdsPart.startsWith("Q:") ? rdsPart.substring(2) : rdsPart;
		let staffs = await OrgChartHelper.getOrgStaff(tenant, referredEid, positions);
		let ret = staffs.map((x) => {
			return { eid: x.eid, cn: x.cn };
		});
		return ret;
	},

	__getDoerByTeam: async function (
		tenant: string | Types.ObjectId,
		teamid: string,
		rdsPart: string,
		starter: string,
		wfRoot = null,
		wfIO = null,
	) {
		let ret = [];
		let roles = rdsPart
			.split(":")
			.map((x) => x.trim())
			.filter((x) => x.length > 0);
		for (let i = 0; i < roles.length; i++) {
			ret = ret.concat(
				await Parser.getSingleRoleDoerByTeam(tenant, teamid, roles[i], starter, wfRoot, wfIO),
			);
		}
		return ret;
	},

	/**
	 * Get doer of a single role by team
	 *
	仅在需要解析innerTeam时需要。 一般情况下，是在流程运行过程中使用，比如在SCRIPT节点中设置了innerTeam， 工作流引擎需要解析wfRoot里面的.innerTeam, 并尝试在innerTeam中寻找aRole， 如果找到，直接返回innerTeam的aRole定义，也就是说，innerTeam中的角色定义的优先级是高于teamid中的角色定义的。
	 *
	 */
	getSingleRoleDoerByTeam: async function (
		tenant: string | Types.ObjectId,
		teamid: string,
		aRole: string,
		starter: string,
		wfRoot = null,
		wfIO = null,
	) {
		let ret = [];
		aRole = aRole.trim();
		let doer = starter;
		if (aRole === "STARTER")
			return [{ eid: starter, cn: await Cache.getEmployeeName(tenant, starter) }];

		//没有设Team或者没有设Role，就用starter
		//因为这是从Team中取数据，所以，当Teamid等于NOTSET或者DEFAULT的时候，直接返回stater是合理的
		if (Tools.isEmpty(aRole) || aRole === "DEFAULT") {
			ret = [{ eid: starter, cn: await Cache.getEmployeeName(tenant, starter) }];
			return ret;
		}
		if (wfRoot) {
			//search inner team
			let innerTeamDef = {};
			let allInnerTeam = wfRoot.find(".innerteam");
			for (let i = 0; i < allInnerTeam.length; i++) {
				try {
					innerTeamDef = lodash.assignIn(
						innerTeamDef,
						JSON.parse(Parser.base64ToCode(CheerioLoad(allInnerTeam.get(i)).text())),
					);
				} catch (e) {
					console.log(e);
				}
			}
			//如果在wfRoot的innerteam中找到了这个aRole，就直接使用这个aRole来返回，
			if (innerTeamDef[aRole]) {
				if (innerTeamDef[aRole] !== "" && innerTeamDef[aRole].toLowerCase() !== "noinner") {
					let tmparr = Parser.splitStringToArray(innerTeamDef[aRole]);
					ret = tmparr;
					return ret;
				}
			}
		}
		if (
			Tools.isEmpty(teamid) ||
			Tools.isEmpty(aRole) ||
			teamid === "NOTSET" ||
			aRole === "DEFAULT"
		) {
			return [{ eid: starter, cn: await Cache.getEmployeeName(tenant, starter) }];
		}
		try {
			//找出团队 team
			let filter = { tenant: tenant, teamid: teamid };
			let team = await Team.findOne(filter, { __v: 0 });
			//找出team定义中，角色aRole对应的人
			if (team) {
				let roleParticipant = team.tmap[aRole];
				if (Tools.isEmpty(roleParticipant)) {
					//如果aRole对应的是空，则使用starter
					doer = starter;
				} else {
					if (lodash.isArray(roleParticipant) === false) {
						console.warn("Tmap ", roleParticipant, " is not an array");
						doer = starter;
					} else {
						if (roleParticipant.length === 0) {
							//如果这个角色，在Team中没有映射，则使用Starter
							doer = starter;
						} else {
							doer = roleParticipant;
						}
					}
				}
			}
		} catch (err) {
			console.debug(err);
		}
		if (typeof doer === "string") {
			ret = [{ eid: doer, cn: await Cache.getEmployeeName(tenant, doer) }];
		} else if (Array.isArray(doer)) {
			ret = doer;
		} else {
			console.error("Something went wrong here, doer should be array");
		}
		return ret;
	},

	copyVars: async function (
		tenant: string | Types.ObjectId,
		fromWfid: string,
		fromNodeid: string,
		fromObjid: string,
		toWfid: string,
		toNodeid: string,
		toObjid: string,
		newRound = -1,
	) {
		let filter = { tenant: tenant, wfid: fromWfid, objid: fromObjid };
		let kvar = await KVar.findOne(filter, { __v: 0 });
		if (!kvar) {
			console.warn("COPY_VARS_FAILED", "can't find old vars");
			return null;
		}
		let newKvar = new KVar({
			tenant: tenant,
			round: newRound > -1 ? newRound : kvar.round,
			wfid: toWfid,
			nodeid: toNodeid,
			objid: toObjid,
			doer: kvar.doer,
			content: kvar.content,
			eff: kvar.eff,
		});
		newKvar = await newKvar.save();
		return newKvar;
	},

	setVars: async function (
		tenant: string | Types.ObjectId,
		round: number,
		wfid: string,
		nodeid: string,
		objid: string,
		newvars: any,
		doer: string,
		efficient: string,
	) {
		if (JSON.stringify(newvars) === "{}") return;
		let oldVars = await Parser.userGetVars(
			tenant,
			"EMP",
			wfid,
			objid,
			[],
			[],
			Const.VAR_IS_EFFICIENT,
		);
		if (newvars === undefined || newvars === null) {
			return oldVars;
		} else {
			let names = Object.keys(newvars);
			for (let k = 0; k < names.length; k++) {
				let name = names[k];
				let valueDef = newvars[name];
				if (typeof valueDef.value === "string") {
					while (valueDef.value.indexOf("[") >= 0) valueDef.value = valueDef.value.replace("[", "");
					while (valueDef.value.indexOf("]") >= 0) valueDef.value = valueDef.value.replace("]", "");
				}
			}

			let mergedVars = await Parser.mergeVars(tenant, oldVars, newvars);
			let mergedVars_base64_vars_string = Parser.codeToBase64(JSON.stringify(mergedVars));
			let filter = { tenant: tenant, wfid: wfid, objid: objid, doer: doer };
			doer = lodash.isEmpty(doer) ? "EMP" : doer;
			await KVar.deleteMany(filter);
			let kvar = new KVar({
				tenant: tenant,
				round: round,
				wfid: wfid,
				nodeid: nodeid,
				objid: objid,
				doer: doer,
				content: mergedVars_base64_vars_string,
				eff: efficient.toLowerCase(),
			});
			kvar = await kvar.save();

			return mergedVars;
		}
	},

	/**
	 * Replace string with kvar value
	 *
	 * Parser.theString - string with [kvar_name]
	 * kvarString - key1=value1;key2=value2;...
	 * wfRoot - if not null, use workflow context value
	 *
	 *
	 */
	replaceStringWithKVar: async function (
		tenant: string | Types.ObjectId,
		theString: string,
		kvars: any,
		withInternals: boolean,
	) {
		if (!kvars) {
			throw new EmpError(
				"NO_KVARS",
				"replaceStringWithKVar but no kvars provided, most because code bug",
			);
		}
		if (withInternals) {
			kvars = Parser.injectInternalVars(kvars);
		}

		let m = null;
		do {
			m = theString.match(/\[([^\]]+)\]/);

			if (m) {
				let newValue = kvars[m[1]] ? kvars[m[1]].value : m[1];
				//万一newValue中有【】，需要去掉，否则，do...while会死循环
				if (typeof newValue === "string") {
					newValue = newValue.replace(/\[|\]/g, "");
				}
				theString = theString.replace(m[0], newValue);
			}
		} while (m);
		return theString;
	},

	injectInternalVars: (kvars: any) => {
		let internalVars = {};
		let now = Moment(new Date());
		internalVars["$$date"] = { label: "Date", value: now.format("YYYY-MM-DD") };
		internalVars["$$time"] = { label: "Time", value: now.format("HH-mm-ss") };
		internalVars["$$datetime"] = { label: "DateTime", value: now.format("YYYY-MM-DDTHH-mm-ss") };
		internalVars["$$isoWeek"] = { label: "ISOWeek", value: now.isoWeek() };
		internalVars["$$isoWeeksInISOWeekYear"] = {
			label: "ISOWeeksInSIOWeekYear",
			value: now.isoWeeksInISOWeekYear(),
		};
		internalVars["$$isoWeekYear"] = { label: "ISOWeekYear", value: now.isoWeekYear() };
		internalVars["$$isoWeekDesc"] = {
			label: "ISOWeekDesc",
			value: `W${now.isoWeek()}`,
		};
		internalVars["$$isoWeekDescFull"] = {
			label: "ISOWeekDescFull",
			value: `W${now.isoWeek()}/${now.isoWeeksInISOWeekYear()}-${now.isoWeekYear()}`,
		};

		return lodash.merge(kvars, internalVars);
	},

	injectCells: async (tenant: string | Types.ObjectId, kvars: any) => {
		let names = Object.keys(kvars);
		for (let k = 0; k < names.length; k++) {
			let name = names[k];
			let valueDef = kvars[name];
			if (name.startsWith("csv_")) {
				let fileServerId = valueDef.value;
				let cell = await Cell.findOne(
					{ tenant: tenant, serverId: fileServerId },
					{ _id: 0 },
				).lean();
				if (cell) {
					valueDef.value = cell.cells;
				}
			}
		}
	},

	__removeOneUserToRoleResolver: async (
		tenant: string | Types.ObjectId,
		arr: DoersArray,
		user: any,
	) => {
		try {
			if (!user) return;
			let eid = null;
			//找到用户的UID
			if (typeof user === "object" && user.eid) {
				eid = user.eid;
			} else if (typeof user === "string") {
				eid = user;
			}
			arr = arr.filter((x) => x.eid !== eid);
			return arr;
		} catch (err) {
			return arr;
		}
	},

	__addOneUserToRoleResolver: async (
		tenant: string | Types.ObjectId,
		arr: DoersArray,
		user: any,
	) => {
		try {
			if (!user) return;
			let eid = null;
			//找到用户的UID
			if (typeof user === "object" && user.eid) {
				eid = user.eid;
			} else if (typeof user === "string") {
				eid = user;
			}
			//找到用户的邮箱, 如果已经存在了，就不再加入
			let userEids = arr.map((x) => x.eid);
			if (userEids.includes(eid)) return arr;

			if (typeof user === "object" && user.eid) {
				arr.push(user);
			} else if (typeof user === "string") {
				let username = await Cache.getEmployeeName(tenant, user);
				arr.push({ eid: user, cn: username });
			}
			return arr;
		} catch (err) {
			return arr;
		}
	},

	/**
	 *  Get Doer from PDS
	 *
	 *
	 */
	getDoer: async function (
		tenant: string | Types.ObjectId,
		teamid: string,
		pds: string,
		referredEid: string,
		wfid: string,
		wfIO: CheerioAPI,
		wfRoot: any,
		kvars: any,
		insertDefault: boolean = true,
	): Promise<DoersArray> {
		//If there is team definition in PDS, use it.
		//if PDS is empty, always use referredEid

		let ret = [] as unknown as DoersArray;
		if (Tools.isEmpty(pds)) {
			if (insertDefault)
				ret = [{ eid: referredEid, cn: await Cache.getEmployeeName(tenant, referredEid) }];
			else ret = [] as unknown as DoersArray;
		} else {
			if (pds.match(/\[(.+)\]/)) {
				if (kvars) {
					pds = await Parser.replaceStringWithKVar(tenant, pds, kvars, false);
				} else {
					throw new EmpError("GET_DOER_NO_KVARS", "pds replacement but there is no  kvars");
				}
			}

			//PDS-level team is defined as "T:team_name"
			let teamInPDS = Parser.getTeamInPDS(pds);
			//Use PDS-level team if it exists, use process-level team if not
			teamid = teamInPDS ? teamInPDS : teamid;

			let arr = Parser.splitStringToArray(pds);
			let tmp = [];

			//////////////////////////////////////////////////
			// rdsPart需要支持“-”操作，即黑名单，排除哪些用户
			//////////////////////////////////////////////////
			for (let i = 0; i < arr.length; i++) {
				let isWhiteList = true;
				let rdsPart = arr[i].trim();
				if (rdsPart[0] === "-") {
					isWhiteList = false;
					rdsPart = rdsPart.substring(1).trim();
				}
				tmp = [];
				if (rdsPart.startsWith("L:")) {
					tmp = await Parser.__getLeaderByPosition(tenant, referredEid, rdsPart);
				} else if (rdsPart.startsWith("P:")) {
					tmp = await Parser.__getPeerByPosition(tenant, referredEid, rdsPart);
				} else if (rdsPart.startsWith("Q:")) {
					tmp = await Parser.__getStaffByQuery(tenant, referredEid, rdsPart);
				} else if (rdsPart.startsWith("@")) {
					let tmpEid = rdsPart.substring(1).toLowerCase();
					let cn = await Cache.getEmployeeName(tenant, tmpEid);
					if (cn.startsWith("EMPLOYEE_NOT_FOUND")) tmp = [];
					else tmp = [{ eid: `${tmpEid}`, cn: cn }];
				} else if (rdsPart.startsWith("T:")) {
					tmp = []; //Bypass Team Difinition
				} else {
					tmp = await Parser.__getDoerByTeam(tenant, teamid, rdsPart, referredEid, wfRoot, wfIO);
				}
				if (Array.isArray(tmp)) {
					for (let i = 0; i < tmp.length; i++) {
						if (isWhiteList) ret = await Parser.__addOneUserToRoleResolver(tenant, ret, tmp[i]);
						else ret = await Parser.__removeOneUserToRoleResolver(tenant, ret, tmp[i]);
					}
				} else {
					if (typeof tmp === "string") {
						//There must be some wrong in my coding..., track and fix it when see this error.
						console.error(
							"Parser.getDoer, team",
							teamid,
							" pds ",
							pds,
							" got an non-object result: ",
							tmp,
						);
					} else {
						if (isWhiteList) ret = await Parser.__addOneUserToRoleResolver(tenant, ret, tmp);
						else ret = await Parser.__removeOneUserToRoleResolver(tenant, ret, tmp);
					}
				}
			}
		}
		//检查是否已离职。
		//先取到所有已离职用户信息
		let nonActives = await Employee.find(
			{ tenant: tenant, active: false },
			{ _id: 0, eid: 1, succeed: 1, succeedname: 1 },
		).lean();
		//单独取出已离职用户的Eids
		let nonActiveEids = nonActives.map((x) => x.eid);
		for (let i = 0; i < ret.length; i++) {
			//这个用户是否已离职
			let foundNonActiveIndex = nonActiveEids.indexOf(ret[i].eid);
			if (foundNonActiveIndex >= 0) {
				//替换为接替人的EID和名称
				ret[i].eid = nonActives[foundNonActiveIndex].succeed;
				ret[i].cn = nonActives[foundNonActiveIndex].succeedname;
			}
		}
		return ret;
	},

	getVarType: function (varName: string, varValue: any) {
		let retType = "plaintext";
		let matchResult = varName.match(
			"^(email|password|url|range|number|dt|datetime|date|time|color|search|select|sl|sel|textarea|ta|file|csv|radio|checkbox|cb|ou|usr|user|tbl)_",
		);
		if (matchResult) {
			retType = matchResult[1];
		} else {
			//based on varValue type if no prefix_ in varName
			matchResult = (typeof varValue).match("(number|string)");
			if (matchResult) {
				retType = matchResult[1];
			}
		}
		switch (retType) {
			case "usr":
				retType = "user";
				break;
			case "dt":
				retType = "datetime";
				break;
			case "sl":
			case "sel":
				retType = "select";
				break;
			case "ta":
				retType = "textarea";
				break;
			case "cb":
				retType = "checkbox";
				break;
		}
		return retType;
	},

	kvarsToArray: function (kvars: object) {
		let kvarsArr = [];
		let names = Object.keys(kvars);
		for (let k = 0; k < names.length; k++) {
			let name = names[k];
			let valueDef = kvars[name];
			let tmp = { ...{ name: name }, ...valueDef };
			//START Speculate variable type
			//based on prefix_ of name
			tmp.type = "plaintext";
			tmp.type = Parser.getVarType(name, valueDef.value);

			if (tmp.type === "cb") tmp.type = "checkbox";
			if (tmp.type === "ta") tmp.type = "textarea";
			if (tmp.type === "sl" || tmp.type === "sel" || tmp.type === "ou") tmp.type = "select";
			if (tmp.type === "usr" || tmp.type === "user") tmp.type = "user";
			if (tmp.type === "dt") tmp.type = "datetime";
			if (tmp.type === "checkbox") {
				if (typeof tmp.value !== "boolean") {
					if (typeof tmp.value === "string") {
						tmp.value = tmp.value.toLowerCase() === "true" ? true : false;
					} else {
						tmp.value = Boolean(tmp.value);
					}
				}
			}
			//END Speculate variable type
			/*
    for (let [varKey, varValue] of Object.entries(tmp)) {
      if (typeof varValue === "string" && varValue.indexOf("[workid]") >= 0) {
        tmp[varKey] = varValue.replace("[workid]", workid);
      }
    }
    */
			if (["select", "radio"].includes(tmp.type)) {
				if (tmp.options === undefined || tmp.options === null || tmp.options === "") {
					tmp.options = "A;B;C";
				}
				try {
					tmp.options = this.splitStringToArray(tmp.options.toString());
				} catch (e) {
					console.error(e);
					console.log("set to default A,B,C");
					tmp.options = ["A", "B", "C"];
				}
			}
			kvarsArr.push(tmp);
		}
		return kvarsArr;
	},

	splitStringToArray: function (str: string, deli = null) {
		if (typeof str !== "string") str = "";
		else str = str.trim();
		if (str === "") return [];
		let tmp = str.split(deli ? deli : /[\s;,]/);
		tmp = tmp.map((x) => x.trim()).filter((x) => x.length > 0);
		return tmp;
	},

	codeToBase64: function (code: string) {
		if (Tools.isEmpty(code)) return code;
		try {
			return Buffer.from(code).toString("base64");
		} catch (err) {
			console.log("code=", code);
			console.error(err);
			return code;
		}
	},

	base64ToCode: function (base64: string) {
		return Buffer.from(base64, "base64").toString("utf-8");
	},

	addUserTag: function (str: string) {
		let m = str.match(/(@\S+)/g);
		if (!m) return str;
		for (let i = 0; i < m.length; i++) {
			str = str.replace(m[i], `<span class='usertag'>${m[i]}</span>`);
		}
		console.log(str);
		return str;
	},

	/**
	 *  检查orgchart admin授权，如没必要授权，则丢出EmpError异常
	 */
	checkOrgChartAdminAuthorization: async function (cred: any) {
		let isTenantOwner = cred.user.account === cred.tenant.owner && cred.tenant.orgmode === true;
		if (isTenantOwner) return true;
		let myGroup = cred.employee.group;
		let isAdminGroup = myGroup === "ADMIN" && cred.tenant.orgmode === true;
		if (isAdminGroup) return true;
		if (Parser.canManageOrgChart(cred)) return true;
		throw new EmpError("NOT_AUTHORIZED", "Not authorized for this operation");
	},

	canManageOrgChart: async (cred: any) => {
		return (
			(await cred.employee.group) === "ADMIN" ||
			(await OrgChartAdmin.findOne(
				{ tenant: cred.tenant._id, admins: cred.employee.eid },
				{ _id: 0, admins: 1 },
			)) !== null
		);
	},

	getUserCells: function (cells: any[], eid: string) {
		for (let r = 1; r < cells.length; r++) {
			if (cells[r][0].trim() === eid) {
				return cells[r];
			}
		}
		return [];
	},

	getUserCellsTableAsHTMLByUser: function (cells: any[], eid: string) {
		let userIndex = -1;
		for (let r = 1; r < cells.length; r++) {
			if (cells[r][0].trim() === eid) {
				userIndex = r;
				break;
			}
		}
		if (userIndex < 0) {
			return `user [${eid}] not found in cells`;
		}
		return Parser.getUserCellsTableAsHTMLByUserIndex(cells, userIndex);
	},

	getUserCellsTableAsHTMLByUserIndex: function (cells: any[], userIndex: number) {
		let tblHtml = `<table style="font-family: Arial, Helvetica, sans-serif; border-collapse: collapse; width: 100%;">`;
		tblHtml += `<thead><tr>`;
		for (let cj = 0; cj < cells[0].length; cj++) {
			tblHtml += `<th style="border: 1px solid #ddd; padding: 8px; padding-top: 12px; padding-bottom: 12px; text-align: left; background-color: #4caf50; color: white;">${cells[0][cj]}</th>`;
		}
		tblHtml += "</tr></thead>";
		tblHtml += "<tbody>";
		let userCells = cells[userIndex];
		for (let cj = 0; cj < userCells.length; cj++) {
			tblHtml += `<td style="border: 1px solid #ddd; padding: 8px;">${userCells[cj]}</td>`;
		}
		tblHtml += "</tbody>";
		tblHtml += `</table>`;
		return tblHtml;
	},

	tidyKVars: function (kvars: object) {
		for (const [key, def] of Object.entries(kvars)) {
			delete def["ui"];
			delete def["breakrow"];
			delete def["placeholder"];
			delete def["required"];
			delete def["when"];
			delete def["id"];
			delete def["type"];
		}
		return kvars;
	},

	getNodeType: function (jq: any) {
		for (let i = 0; i < Const.supportedClasses.length; i++) {
			if (jq.hasClass(Const.supportedClasses[i])) {
				return Const.supportedClasses[i];
			}
		}
		return "UNKNOWN";
	},

	removeSTClasses: function (jq: any, classesToRemove: string[]) {
		classesToRemove.map((x: string) => {
			jq.removeClass(x);
		});
	},

	clearSTClass: function (jq: any) {
		Parser.removeSTClasses(jq, Const.supportedSTStatus);
	},
};

export default Parser;
