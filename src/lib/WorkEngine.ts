import { Types } from "mongoose";
import { Cheerio, CheerioAPI, Element } from "cheerio";
import { Todo, TodoType } from "../database/models/Todo.js";
import { Route } from "../database/models/Route.js";
import { marked as Marked } from "marked";
import { Work, WorkType } from "../database/models/Work.js";
import { Employee, EmployeeType } from "../database/models/Employee.js";
import Cache from "./Cache.js";
import Tools from "../tools/tools.js";
import SystemPermController from "./SystemPermController.js";
import Parser from "./Parser.js";
import EmpError from "./EmpError.js";
import RCL from "./RedisCacheLayer.js";
import Const from "./Const.js";
import type {
	workFullInfo,
	ActionDef,
	NodeBriefType,
	HistoryTodoEntryType,
	TenantIdType,
} from "./EmpTypes";

// 获取从某个节点开始往后的Routing Options
const getInstruct = function (tpRoot: Cheerio<Element>, nodeid: string) {
	let ret = "";
	let tpNode = tpRoot.find("#" + nodeid);
	if (tpNode) {
		ret = tpNode.find(".instruct").first().text().trim();
	}
	return ret;
};

const getWorkflowStatus = function (wfRoot: Cheerio<Element>) {
	let ret = "ST_UNKNOWN";
	let tmparr = wfRoot.attr("class").split(" ");
	for (let i = 0; i < tmparr.length; i++) {
		if (tmparr[i].startsWith("ST_")) ret = tmparr[i];
	}
	return ret;
};
//
//如果用户选择了本选项,则重复执行当前工作
const getRepeaton = (tpNode: Cheerio<Element>) => {
	let repeaton = tpNode.attr("repeaton");
	if (repeaton) repeaton = repeaton.trim();
	if (repeaton) {
		return repeaton;
	} else {
		return "";
	}
};

const getWorkflowDoneAt = function (wfRoot: Cheerio<Element>) {
	return wfRoot.attr("doneat");
};

const getRoutingOptions = function (
	wfIO: CheerioAPI,
	tpRoot: Cheerio<Element>,
	nodeid: string,
	removeOnlyDefault: boolean = false,
) {
	let linkSelector = '.link[from="' + nodeid + '"]';
	let routings = [];
	let tpNode = tpRoot.find("#" + nodeid);
	let repeaton = getRepeaton(tpNode);
	if (repeaton) {
		routings.push(repeaton);
	}
	tpRoot.find(linkSelector).each(function (_: number, el: Element) {
		let option = Tools.emptyThenDefault(wfIO(el).attr("case"), "DEFAULT");
		//option以h: h_ h-开头,不显示在用户界面上, 在每个节点上,都有脚本, 当使用脚本决定下一步往哪里走的时候, 对用户隐藏的选择项就有用处
		//意思是, 脚本用的到,用户不能用的选择项就隐藏起来
		if (
			!(option.startsWith("h:") || option.startsWith("h_") || option.startsWith("h-")) &&
			routings.indexOf(option) < 0
		)
			routings.push(option);
	});
	if (routings.length > 1 && routings.includes("DEFAULT")) {
		routings = routings.filter((x) => x !== "DEFAULT");
	}
	//前端会自动判断如果routings数组为空，则自动显示为一个按钮DONE
	//但前面一个注释掉的语句，不能放开注释
	//因为当除了DEFAULT以外，还有一个选项时，DEFAULT是需要出现的
	//这种情况发生在，在建模时，一个节点的后面有多个链接，但有一个或多个链接没有设置routing值
	if (removeOnlyDefault) {
		if (routings.length === 1 && routings[0] === "DEFAULT") {
			routings = [];
		}
	}
	return routings;
};

const _getRoutedPassedWorks = async function (
	tenant: string | Types.ObjectId,
	tpRoot: any,
	wfRoot: any,
	workNode: any,
	withWork = false,
	decentlevel = 0,
): Promise<ActionDef[]> {
	if (Tools.isEmpty(workNode)) return [];
	let tplNodeId = workNode.attr("nodeid");
	let workid = workNode.attr("id");
	if (Tools.isEmpty(tplNodeId)) return [];
	let ret = [];
	let routes = await Route.find(
		{
			tenant: tenant,
			wfid: wfRoot.attr("id"),
			from_workid: workid,
			status: "ST_PASS",
		},
		{ __v: 0 },
	);
	for (let i = 0; i < routes.length; i++) {
		let workSelector = `.work[id="${routes[i].to_workid}"]`;
		let routedWork = workNode.nextAll(workSelector);
		if (routedWork.length < 1) {
			continue;
		}
		routedWork = routedWork.eq(0);
		let st = Tools.getStatusFromClass(routedWork);
		if (routedWork.hasClass("ACTION")) {
			let action = {
				nodeid: routedWork.attr("nodeid"),
				workid: routedWork.attr("id"),
				nodeType: "ACTION",
				route: Tools.emptyThenDefault(routedWork.attr("route"), "DEFAULT"),
				byroute: Tools.emptyThenDefault(routedWork.attr("byroute"), "DEFAULT"),
				status: st,
			};
			withWork && (action["work"] = routedWork);
			ret.push(action);
		} else if (
			st === "ST_DONE" &&
			routedWork.hasClass("ACTION") === false &&
			routedWork.hasClass("END") === false
			//非END的逻辑节点
		) {
			let action = {
				nodeid: routedWork.attr("nodeid"),
				workid: routedWork.attr("id"),
				nodeType: Parser.getNodeType(routedWork),
				route: Tools.emptyThenDefault(routedWork.attr("route"), "DEFAULT"),
				byroute: Tools.emptyThenDefault(routedWork.attr("byroute"), "DEFAULT"),
				status: st,
			};
			withWork && (action["work"] = routedWork);
			ret.push(action);
			ret = ret.concat(
				await _getRoutedPassedWorks(tenant, tpRoot, wfRoot, routedWork, withWork, decentlevel + 1),
			);
		}
	}
	return ret;
};

const _getParallelActions = function (
	wfRoot: Cheerio<Element>,
	workNode: Cheerio<Element>,
): ActionDef[] {
	if (Tools.isEmpty(workNode)) return [];
	let ret = [];
	let parallel_id = workNode.attr("prl_id");
	if (parallel_id) {
		let workSelector = `.work[prl_id="${parallel_id}"]`;
		let tmpWorks = wfRoot.find(workSelector);
		for (let i = 0; i < tmpWorks.length; i++) {
			let tmpWork = tmpWorks.eq(i);
			let st = Tools.getStatusFromClass(tmpWork);
			if (tmpWork.hasClass("ST_END") === false) {
				ret.push({
					nodeid: tmpWork.attr("nodeid"),
					workid: tmpWork.attr("id"),
					route: Tools.emptyThenDefault(tmpWork.attr("route"), "DEFAULT"),
					byroute: Tools.emptyThenDefault(tmpWork.attr("byroute"), "DEFAULT"),
					status: st,
				});
			}
		}
	}
	return ret;
};

//workid 运行到某些节点dests
const isRoutePassTo = async function (
	tenant: TenantIdType,
	wfid: string,
	workid: string,
	checkType: "NODETYPE" | "WORKID" | "NODEID",
	dests: string[],
) {
	if (["NODETYPE", "WORKID", "NODEID"].includes(checkType) === false)
		throw new EmpError("NOT_SUPPORT", "isRoutePassTo " + checkType);
	let tmp = await Route.findOne(
		{
			tenant: tenant,
			wfid: wfid,
			from_workid: workid,
			status: "ST_PASS",
		},
		{ __v: 0 },
	);
	if (checkType === "NODETYPE") {
		return dests.includes(tmp.to_nodetype);
	} else if (checkType === "WORKID") {
		return dests.includes(tmp.to_workid);
	} else if (checkType === "NODEID") {
		return dests.includes(tmp.to_nodeid);
	}
};

//workid 没有运行到某些节点dests
const notRoutePassTo = async function (
	tenant: TenantIdType,
	wfid: string,
	workid: string,
	checkType: "NODETYPE" | "WORKID" | "NODEID",
	dests: string[],
) {
	return !(await isRoutePassTo(tenant, wfid, workid, checkType, dests));
};

const __getWorkFullInfoRevocableAndReturnable = async function (
	tenant: TenantIdType,
	tpRoot: Cheerio<Element>,
	wfRoot: Cheerio<Element>,
	wfid: string,
	todo: TodoType,
	ret: workFullInfo,
) {
	let tpNode = tpRoot.find("#" + todo.nodeid);
	let workNode = wfRoot.find("#" + todo.workid);

	ret.withsb = Tools.blankToDefault(tpNode.attr("sb"), "no") === "yes"; //with Sendback-able?
	ret.withrvk = Tools.blankToDefault(tpNode.attr("rvk"), "no") === "yes"; //with Revocable ?

	ret.following_actions = await _getRoutedPassedWorks(tenant, tpRoot, wfRoot, workNode);
	ret.parallel_actions = _getParallelActions(wfRoot, workNode);

	if (todo.nodeid === "ADHOC") {
		ret.revocable = false;
		ret.returnable = false;
	} else {
		if (ret.withsb || ret.withrvk) {
			//sb:Sendback, rvk: Revoke;
			//一个工作项可以被退回，仅当它没有同步节点，且状态为运行中
			if (ret.withsb) {
				//sb: Sendback; rvk: Revoke;
				ret.returnable =
					ret.parallel_actions.length === 0 &&
					todo.status === "ST_RUN" &&
					ret.from_nodeid !== "start";
			} else {
				ret.returnable = false;
			}

			if (ret.withrvk) {
				let all_following_are_running = true;
				if (ret.following_actions.length === 0) {
					all_following_are_running = false;
				} else {
					for (let i = 0; i < ret.following_actions.length; i++) {
						if (
							ret.following_actions[i].nodeType === "ACTION" &&
							ret.following_actions[i].status !== "ST_RUN"
						) {
							all_following_are_running = false;
							break;
						}
					}
				}

				//revocable only when all following actions are RUNNING, NOT DONE.
				ret.revocable =
					workNode.hasClass("ACTION") &&
					todo.status === "ST_DONE" &&
					all_following_are_running &&
					(await notRoutePassTo(tenant, wfid, todo.workid, "NODETYPE", ["AND"]));
			} else {
				ret.withrvk = false;
			}
		} else {
			ret.revocable = false;
			ret.returnable = false;
		}
	}

	return ret;
};

const getWorkInfo = async function (
	tenant: string | Types.ObjectId,
	eid: string,
	myGroup: string,
	todoid: string,
) {
	//查找TODO，可以找到任何人的TODO
	let todo_filter: any;
	if (myGroup !== "ADMIN") {
		todo_filter = {
			tenant: tenant,
			todoid: todoid,
			$or: [{ doer: eid }, { rehearsal: true, wfstarter: eid }],
		};
	} else {
		todo_filter = { tenant: tenant, todoid: todoid };
	}
	let todo = await Todo.findOneAndUpdate(
		todo_filter,
		{ $set: { newer: false, viewedAt: new Date() } },
		{ upsert: false, new: true },
	);
	if (!todo) {
		throw new EmpError("WORK_NOT_EXIST", "Todo not exist");
	}
	let peopleInBrowser = eid;
	let shouldDoer = todo.doer;
	//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	// Extremely important  BEGIN
	//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

	if (shouldDoer !== peopleInBrowser) {
		if (todo.cellInfo.trim().length > 0) {
			todo.cellInfo = "";
		}
	}
	//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	// Extremely important  END
	//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	let shouldEmployee = (await Employee.findOne(
		{
			tenant: tenant,
			eid: shouldDoer,
		},
		{ __v: 0 },
	)) as EmployeeType;
	if (!SystemPermController.hasPerm(shouldEmployee, "work", todo, "read"))
		throw new EmpError("NO_PERM", "You don't have permission to read this work");
	try {
		let wf = await RCL.getWorkflow({ tenant: tenant, wfid: todo.wfid }, "Engine.getWorkInfo");
		if (!wf) {
			await Todo.deleteOne(todo_filter);

			throw new EmpError("NO_WF", "Workflow does not exist");
		}
		let wfIO = await Parser.parse(wf.doc);
		let tpRoot = wfIO(".template");
		let wfRoot = wfIO(".workflow");

		return await __getWorkFullInfo(
			tenant,
			peopleInBrowser,
			wf,
			wfIO,
			tpRoot,
			wfRoot,
			todo.wfid,
			todo,
		);
	} catch (error) {
		if (error.name === "WF_NOT_FOUND") {
			await Todo.updateMany(
				{ tenant: tenant, wfid: todo.wfid, status: "ST_RUN" },
				{ $set: { status: "ST_IGNORE" } },
			);
			throw new EmpError("NO_WF", "Workflow does not exist");
		}
	}
};

const _getFromActions = function (
	wfIO: CheerioAPI,
	tpRoot: Cheerio<Element>,
	wfRoot: Cheerio<Element>,
	workNode: Cheerio<Element>,
	decentlevel = 0,
): ActionDef[] {
	if (Tools.isEmpty(workNode)) return [];
	let tplNodeId = workNode.attr("nodeid");
	if (Tools.isEmpty(tplNodeId)) return [];
	let linkSelector = `.link[to="${tplNodeId}"]`;
	let ret = [];
	tpRoot.find(linkSelector).each(function (_: number, el: Element) {
		let linkObj = wfIO(el);
		let fromid = linkObj.attr("from");
		//let workSelector = `.work.ST_DONE[nodeid="${fromid}"]`;
		let workSelector = `.work[nodeid="${fromid}"]`;
		let tmpWork = workNode.prevAll(workSelector);
		if (tmpWork.length > 0) {
			tmpWork = tmpWork.eq(0);
			if (tmpWork.hasClass("START") === false) {
				if (tmpWork.hasClass("ACTION")) {
					ret.push({
						nodeid: tmpWork.attr("nodeid"),
						workid: tmpWork.attr("id"),
						nodeType: "ACTION",
						route: Tools.emptyThenDefault(tmpWork.attr("route"), "DEFAULT"),
						byroute: Tools.emptyThenDefault(tmpWork.attr("byroute"), "DEFAULT"),
						level: decentlevel,
					});
				} else {
					ret.push({
						nodeid: tmpWork.attr("nodeid"),
						workid: tmpWork.attr("id"),
						nodeType: Parser.getNodeType(tmpWork),
						route: Tools.emptyThenDefault(tmpWork.attr("route"), "DEFAULT"),
						byroute: Tools.emptyThenDefault(tmpWork.attr("byroute"), "DEFAULT"),
						level: decentlevel,
					});
					let tmp = _getFromActions(wfIO, tpRoot, wfRoot, tmpWork, decentlevel + 1);
					ret = ret.concat(tmp);
				}
			}
		}
	});
	return ret;
};

const __getWorkflowWorksHistory = async function (
	tenant: string | Types.ObjectId,
	eid: string,
	wfid: string,
): Promise<any[]> {
	let ret: HistoryTodoEntryType[] = [];
	let tmpRet: HistoryTodoEntryType[] = [];
	//let todo_filter = { tenant: tenant, wfid: wfid, status: /ST_DONE|ST_RETURNED|ST_REVOKED/ };
	//let todo_filter = { tenant: tenant, wfid: wfid, status: { $ne: "ST_RUN" } };
	let todo_filter = { tenant: tenant, wfid: wfid };
	let todos = await Todo.find(todo_filter, { __v: 0 }).sort({ updatedAt: -1 });
	for (let i = 0; i < todos.length; i++) {
		let hasPersonCNInTitle = false;
		//替换Var之前的原始Title
		if (todos[i].origtitle && todos[i].origtitle.indexOf("doerCN") > 0) {
			hasPersonCNInTitle = true;
		}

		let todoEntry: HistoryTodoEntryType = {} as HistoryTodoEntryType;
		let doerCN = await Cache.getEmployeeName(tenant, todos[i].doer, "__getWorkflowWorksHistory");
		todoEntry.workid = todos[i].workid;
		todoEntry.todoid = todos[i].todoid;
		todoEntry.nodeid = todos[i].nodeid;
		todoEntry.title = todos[i].title;
		if (hasPersonCNInTitle) {
			todoEntry.title = todoEntry.title.replace(doerCN, "***");
		}
		todoEntry.status = todos[i].status;
		todoEntry.doer = todos[i].doer;
		todoEntry.doerCN = doerCN;
		todoEntry.doneby = todos[i].doneby;
		todoEntry.doneat = todos[i].doneat;
		if (todos[i].decision) todoEntry.decision = todos[i].decision;
		let kvars = await Parser.userGetVars(
			tenant,
			eid,
			todos[i].wfid,
			todos[i].workid,
			[],
			[],
			Const.VAR_IS_EFFICIENT,
		);
		todoEntry.kvarsArr = Parser.kvarsToArray(kvars);
		todoEntry.kvarsArr = todoEntry.kvarsArr.filter((x) => x.ui && x.ui.includes("input"));
		tmpRet.push(todoEntry);
	}
	//把相同workid聚合起来
	let tmp = [];
	for (let i = 0; i < tmpRet.length; i++) {
		let existing_index = tmp.indexOf(tmpRet[i].workid);
		//如果一个workid不存在，则这是一个新的Todo
		if (existing_index < 0) {
			//组织这个work的doers（多个用户）
			tmpRet[i].doers = [];
			tmpRet[i].doers.push({
				eid: tmpRet[i].doer,
				cn: await Cache.getEmployeeName(tenant, tmpRet[i].doer, "__getWorkflowWorksHistory"),
				signature: await Cache.getEmployeeSignature(tenant, tmpRet[i].doer),
				todoid: tmpRet[i].todoid,
				doneat: tmpRet[i].doneat,
				status: tmpRet[i].status,
				decision: tmpRet[i].decision,
			});
			let work = await Work.findOne({ tenant: tenant, workid: tmpRet[i].workid }, { __v: 0 });
			tmpRet[i].workDecision = work && work.decision ? work.decision : "";
			ret.push(tmpRet[i]);
			tmp.push(tmpRet[i].workid);
		} else {
			if (tmpRet[i].comment && tmpRet[i].comment.length > 0)
				ret[existing_index].comment = [...ret[existing_index].comment, ...tmpRet[i].comment];
			/*
      if (tmpRet[i].comments && tmpRet[i].comments.length > 0) {
        ret[existing_index].comments = [...ret[existing_index].comments, ...tmpRet[i].comments];
      }
      */
			ret[existing_index].doers.push({
				eid: tmpRet[i].doer,
				cn: await Cache.getEmployeeName(tenant, tmpRet[i].doer, "__getWorkflowWorksHistory"),
				signature: await Cache.getEmployeeSignature(tenant, tmpRet[i].doer),
				todoid: tmpRet[i].todoid,
				doneat: tmpRet[i].doneat,
				status: tmpRet[i].status,
				decision: tmpRet[i].decision,
			});
			if (tmpRet[i].status === "ST_DONE" && ret[existing_index].status === "ST_IGNORE") {
				ret[existing_index].status = "ST_DONE";
			}
			if (tmpRet[i].status === "ST_RUN") {
				ret[existing_index].status = "ST_RUN";
			}
		}
	}
	return ret;
};

const __getWorkFullInfo = async function (
	tenant: string | Types.ObjectId,
	peopleInBrowser: string,
	theWf: any,
	wfIO: CheerioAPI,
	tpRoot: any,
	wfRoot: any,
	wfid: string,
	todo: any,
) {
	//////////////////////////////////////
	// Attention: TodoOwner确定设为todo.doer？
	// 应该是对的，之前只在rehearsal下设，是不对的
	//////////////////////////////////////
	//if (todo.rehearsal) TodoOwner = todo.doer;
	let TodoOwner = todo.doer;
	//////////////////////////////////////
	//////////////////////////////////////
	let tpNode = tpRoot.find("#" + todo.nodeid);
	let workNode = wfRoot.find("#" + todo.workid);
	let ret: workFullInfo = {} as workFullInfo;
	ret.kvars = await Parser.userGetVars(tenant, TodoOwner, todo.wfid, todo.workid, [], [], "any");
	//这里为待输入数据
	for (const [key, _] of Object.entries(ret.kvars)) {
		//待输入数据中去除内部数据
		if (key[0] === "$") {
			delete ret.kvars[key];
		}
	}
	//workflow: 全部节点数据，
	//[],[], 白名单和黑名单都为空
	//yes 为取efficient数据
	let ALL_VISIED_KVARS = await Parser.userGetVars(
		tenant,
		TodoOwner,
		wfid,
		Const.FOR_WHOLE_PROCESS,
		[],
		[],
		Const.VAR_IS_EFFICIENT,
	);
	// 将 第二个参数的值， merge到第一个参数的键上
	Parser.mergeValueFrom(ret.kvars, ALL_VISIED_KVARS);
	//将kvars数据转换为array,方便前端处理
	ret.kvarsArr = Parser.kvarsToArray(ret.kvars);
	ret.todoid = todo.todoid;
	ret.wftitle = todo.wftitle;
	ret.tenant = todo.tenant;
	ret.doer = todo.doer;
	ret.doerCN = await Cache.getEmployeeName(tenant, todo.doer, "__getWorkFullInfo");
	ret.wfid = todo.wfid;
	ret.nodeid = todo.nodeid;
	ret.byroute = todo.byroute;
	ret.workid = todo.workid;
	ret.title = todo.title;
	ret.cellInfo = todo.cellInfo;
	ret.allowdiscuss = todo.allowdiscuss;
	if (TodoOwner !== peopleInBrowser) {
		ret.cellInfo = "";
	}
	if (ret.title.indexOf("[") >= 0) {
		ret.title = await Parser.replaceStringWithKVar(
			tenant,
			ret.title,
			ALL_VISIED_KVARS,
			Const.INJECT_INTERNAL_VARS,
		);
	}
	ret.status = todo.status;
	ret.wfstarter = todo.wfstarter;
	ret.wfstarterCN = await Cache.getEmployeeName(tenant, todo.wfstarter, "__getWorkFullInfo");
	ret.wfstatus = todo.wfstatus;
	ret.rehearsal = todo.rehearsal;
	ret.createdAt = todo.createdAt;
	ret.allowpbo = Tools.blankToDefault(tpNode.attr("pbo"), "no") === "yes";
	ret.mustsign = Tools.blankToDefault(tpNode.attr("mustsign"), "yes") === "yes";
	ret.withadhoc = Tools.blankToDefault(tpNode.attr("adhoc"), "yes") === "yes";
	ret.withcmt = Tools.blankToDefault(tpNode.attr("cmt"), "yes") === "yes";
	ret.updatedAt = todo.updatedAt;
	ret.from_workid = workNode.attr("from_workid");
	ret.from_nodeid = workNode.attr("from_nodeid");
	ret.doneat = workNode.attr("doneat");
	ret.sr = tpNode.attr("sr");
	ret.transferable = todo.transferable;
	ret.role = workNode.attr("role");
	ret.role = Tools.isEmpty(ret.role) ? "DEFAULT" : ret.role === "undefined" ? "DEFAULT" : ret.role;
	ret.doer_string = workNode.attr("doer");
	//ret.comments = await getComments(tenant, "TODO", todo.todoid, Const.COMMENT_LOAD_NUMBER);
	ret.comment =
		Tools.isEmpty(todo.comment) || Tools.isEmpty(todo.comment.trim())
			? []
			: [
					{
						doer: todo.doer,
						comment: todo.comment.trim(),
						cn: await Cache.getEmployeeName(tenant, todo.doer, ""),
						splitted: Tools.splitComment(todo.comment.trim()),
					},
			  ];
	//取当前节点的vars。 这些vars应该是在yarkNode时，从对应的模板节点上copy过来
	ret.wf = {
		wfid: theWf.wfid,
		endpoint: theWf.endpoint,
		endpointmode: theWf.endpointmode,
		tplid: theWf.tplid,
		kvars: ALL_VISIED_KVARS,
		kvarsArr: [],
		starter: wfRoot.attr("starter"),
		starterCN: await Cache.getEmployeeName(tenant, wfRoot.attr("starter"), ""),
		wftitle: wfRoot.attr("wftitle"),
		pwfid: wfRoot.attr("pwfid"),
		pworkid: wfRoot.attr("pworkid"),
		attachments: theWf.attachments,
		status: getWorkflowStatus(wfRoot),
		pbostatus: theWf.pbostatus,
		beginat: wfRoot.attr("at"),
		doneat: getWorkflowDoneAt(wfRoot),
		allowdiscuss: theWf.allowdiscuss,
		history: [],
	};
	ret.wf.kvarsArr = Parser.kvarsToArray(ret.wf.kvars);

	if (todo.nodeid !== "ADHOC") {
		let tmpInstruction = Parser.base64ToCode(getInstruct(tpRoot, todo.nodeid));
		tmpInstruction = Tools.sanitizeHtmlAndHandleBar(ALL_VISIED_KVARS, tmpInstruction);
		if (tmpInstruction.indexOf("[") >= 0) {
			tmpInstruction = await Parser.replaceStringWithKVar(
				tenant,
				tmpInstruction,
				ALL_VISIED_KVARS,
				Const.INJECT_INTERNAL_VARS,
			);
		}
		ret.instruct = Parser.codeToBase64(tmpInstruction);
	} else {
		//Adhoc task has it's own instruction
		ret.instruct = Parser.codeToBase64(Marked.parse(todo.instruct, {}));
	}

	//the 3rd param, true: removeOnlyDefault:  如果只有一个DEFAULT，返回空数组
	ret.routingOptions = getRoutingOptions(wfIO, tpRoot, todo.nodeid, true);
	ret.from_actions = _getFromActions(wfIO, tpRoot, wfRoot, workNode);
	//ret.following_actions = _getFollowingActions(tpRoot, wfRoot, workNode);
	ret.following_actions = await _getRoutedPassedWorks(tenant, tpRoot, wfRoot, workNode);
	ret.parallel_actions = _getParallelActions(wfRoot, workNode);
	ret.freejump_nodes = _getFreeJumpNodes(wfIO, tpRoot, tpNode);

	const tmp = await __getWorkFullInfoRevocableAndReturnable(
		tenant,
		tpRoot,
		wfRoot,
		wfid,
		todo,
		ret,
	);
	ret.revocable = tmp.revocable;
	ret.returnable = tmp.returnable;

	ret.wf.history = await __getWorkflowWorksHistory(tenant, TodoOwner, wfid);
	ret.version = Const.VERSION;

	return ret;
};

const _getFreeJumpNodes = (wfIO: CheerioAPI, tpRoot: any, tpNode: any): NodeBriefType[] => {
	let ret: NodeBriefType[] = [];
	let tplfjdef = tpRoot.attr("freejump")?.trim();
	//if tplfjderf == yes, add all nodes to freejump_nodes
	if (tplfjdef === "yes") {
		tpRoot.find(".node.ACTION").each(function (_: number, el: Element) {
			let jq = wfIO(el);
			if (jq.attr("id") === tpNode.attr("id")) return;
			let title = jq.find("p").first().text().trim();
			ret.push({
				nodeid: jq.attr("id"),
				title: title,
			});
		});
	} else {
		//else, plase matched node text to freejump_nodes
		let fjdef = tpNode.attr("freejump")?.trim();
		if (fjdef) {
			let re = new RegExp(fjdef);
			tpRoot.find(".node.ACTION").each(function (_: number, el: Element) {
				let jq = wfIO(el);
				if (jq.attr("id") === tpNode.attr("id")) return;
				let title = jq.find("p").first().text().trim();
				if (title.match(re)) {
					ret.push({
						nodeid: jq.attr("id"),
						title: title,
					});
				}
			});
		}
	}

	return ret;
};
const getWfHistory = async function (tenant: string, eid: string, wfid: string) {
	return await __getWorkflowWorksHistory(tenant, eid, wfid);
};

export default {
	getWorkInfo,
	getWfHistory,
	__getWorkFullInfoRevocableAndReturnable,
};
