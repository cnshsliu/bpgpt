import {
	MtcCredentials,
	PondFileInfoFromPayloadType,
	PondFileInfoOnServerType,
	WorkflowAttachmentEntryType,
	WorkflowAttachmentEntryTextType,
	WorkflowAttachmentEntryFileType,
} from "../../lib/EmpTypes";
import { expect } from "@hapi/code";
import AccessControl from "../../lib/AccessControl.js";
import { Request, ResponseToolkit } from "@hapi/hapi";
import assert from "assert";
import Parser from "../../lib/Parser.js";
import MongoSession from "../../lib/MongoSession.js";
import moment from "moment";
import type { DurationInputArg1, DurationInputArg2 } from "moment";
import fs from "fs";
import path from "path";
import Excel from "exceljs";
// import Joi from "joi";
import IdGenerator from "../../lib/IdGenerator.js";
import TimeZone from "../../lib/timezone.js";
import { Tenant } from "../../database/models/Tenant.js";
import { Template, TemplateType } from "../../database/models/Template.js";
import { Snapshot } from "../../database/models/Snapshot.js";
import { User } from "../../database/models/User.js";
import { Employee, EmployeeType } from "../../database/models/Employee.js";
import { Workflow } from "../../database/models/Workflow.js";
import { PondFile } from "../../database/models/PondFile.js";
import { Crontab } from "../../database/models/Crontab.js";
import Webhook from "../../database/models/Webhook.js";
import { EdittingLog } from "../../database/models/EdittingLog.js";
import { Todo } from "../../database/models/Todo.js";
import { Work } from "../../database/models/Work.js";
import { Route } from "../../database/models/Route.js";
import List from "../../database/models/List.js";
import { Cell, CellType } from "../../database/models/Cell.js";
import { Comment } from "../../database/models/Comment.js";
import KsTpl from "../../database/models/KsTpl.js";
import Thumb from "../../database/models/Thumb.js";
import Mailman from "../../lib/Mailman.js";
import CbPoint from "../../database/models/CbPoint.js";
import { Team, TeamType } from "../../database/models/Team.js";
import TempSubset from "../../database/models/TempSubset.js";
import OrgChart from "../../database/models/OrgChart.js";
import OrgChartAdmin from "../../database/models/OrgChartAdmin.js";
import SavedSearch from "../../database/models/SavedSearch.js";
import OrgChartHelper from "../../lib/OrgChartHelper.js";
import replyHelper from "../../lib/ReplyHelpers.js";
import Tools from "../../tools/tools.js";
import Engine from "../../lib/Engine.js";
import WorkEngine from "../../lib/WorkEngine.js";
import CommentEngine from "../../lib/CommentEngine.js";
import SPC from "../../lib/SystemPermController.js";
import EmpError from "../../lib/EmpError.js";
import lodash from "lodash";
import Cache from "../../lib/Cache.js";
import Const from "../../lib/Const.js";
import Mongoose from "mongoose";
import RCL from "../../lib/RedisCacheLayer.js";
import { redisClient } from "../../database/redis.js";

const OUEID: string = "OU---";

// const EmailSchema = Joi.string().email();
/* const asyncFilter = async (arr: Array<any>, predicate: any) => {
  const results = await Promise.all(arr.map(predicate));

  return arr.filter((_v, index) => results[index]);
}; */
async function __getCells(
	pondFile: PondFileInfoFromPayloadType,
	pondServerFile: PondFileInfoOnServerType,
) {
	let cells = [];
	console.log(pondFile.contentType);
	switch (pondFile.contentType) {
		case "text/csv":
			cells = await __getCSVCells(pondServerFile);
			break;
		case "application/vnd.ms-excel":
			throw new EmpError("NOT_SUPPORT_OLD_EXCEL", "We don't support old xls, use xlsx please");
		case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
			cells = await __getExcelCells(pondServerFile);
			break;
		default:
			throw new EmpError(
				"CELL_FORMAT_NOT_SUPPORT",
				"Not supported file format" + pondFile.realName,
			);
	}
	return cells;
}

async function __getCSVCells(pondServerFile: PondFileInfoOnServerType) {
	let cells = [];
	let csv = fs.readFileSync(pondServerFile.fullPath, "utf8");
	let rows = csv.split(/[\n|\r]/);
	let firstRow = -1;
	for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
		if (rows[rowIndex].trim().length === 0) continue;
		// 标题行钱可能有空行，前面一句跳过空行后，第一行不为空的行为firstRow
		if (firstRow < 0) firstRow = rowIndex;
		let cols = rows[rowIndex].split(",");
		if (Tools.nbArray(cols) === false) {
			continue;
		}
		cells.push(cols);
		//firstRow后，都是数据行。数据行要检查第一列的用户ID是否存在
	}
	return cells;
}

async function __getExcelCells(pondServerFile: PondFileInfoOnServerType) {
	let cells = [];

	let workbook = new Excel.Workbook();
	await workbook.xlsx.readFile(pondServerFile.fullPath);
	let worksheet = workbook.getWorksheet(1);

	worksheet.eachRow(function (row /*, rowIndex*/) {
		/* let rowSize = row.cellCount;
    let numValues = row.actualCellCount; */
		let cols = [];
		row.eachCell(function (cell /*, colIndex*/) {
			if (cell.type === 6) {
				cols.push(cell.result);
			} else {
				cols.push(cell.value);
			}
		});
		cells.push(cols);
	});

	return cells;
}

async function __saveCSVAsCells(
	tenant_id: string,
	wfid: string,
	csvPondFiles: PondFileInfoFromPayloadType[],
) {
	const __doConvert = async (pondFile: PondFileInfoFromPayloadType) => {
		let pondServerFile: PondFileInfoOnServerType = Tools.getPondServerFile(
			tenant_id,
			pondFile.author,
			pondFile.serverId,
		);
		console.log("=====================");
		console.log(pondFile.contentType);
		console.log(pondFile.realName);
		console.log(pondServerFile.fullPath);
		console.log("=====================");
		let cells = await __getCells(pondFile, pondServerFile);

		/*let cell =*/ await Cell.findOneAndUpdate(
			{ tenant: tenant_id, wfid: wfid, stepid: pondFile.stepid, forKey: pondFile.forKey },
			{
				$set: {
					author: pondFile.author,
					serverId: pondFile.serverId,
					realName: pondFile.realName,
					contentType: pondFile.contentType,
					cells: cells,
				},
			},
			{ upsert: true, new: true },
		);
		let missedUIDs = [];
		for (let i = 1; i < cells.length; i++) {
			if (
				!(await Employee.findOne(
					{
						tenant: tenant_id,
						eid: cells[i][0],
					},
					{ __v: 0 },
				))
			) {
				missedUIDs.push(cells[i][0]);
			}
		}
		return missedUIDs;
	};
	let missedUIDs = [];
	for (let i = 0; i < csvPondFiles.length; i++) {
		missedUIDs = [...missedUIDs, ...(await __doConvert(csvPondFiles[i]))];
	}
	return missedUIDs;
}

const __GetTSpanMomentOperators = function (tspan: string): [DurationInputArg1, DurationInputArg2] {
	if (Tools.isEmpty(tspan)) tspan = "1w";
	if (Tools.isEmpty(tspan.trim())) tspan = "1w";
	let res = tspan.match(/^(\d+)([hdwMQy])$/);
	if (!res) {
		tspan = "1w";
		res = tspan.match(/^(\d+)([hdwMQy])$/);
	}
	return [res[1] as DurationInputArg1, res[2] as DurationInputArg2];
};

async function __GetTagsFilter(tagsForFilter: string[], myEid: string) {
	let ret = null;
	if (
		tagsForFilter &&
		Array.isArray(tagsForFilter) &&
		tagsForFilter.length > 0 &&
		tagsForFilter[0].trim() !== ""
	) {
		let tagsMatchArr = [];
		//组织模板的tags查询条件
		for (let i = 0; i < tagsForFilter.length; i++) {
			//每个tag，要么是自己设的，要么是管理员设置的
			tagsMatchArr.push({
				$elemMatch: {
					$or: [{ owner: myEid }, { group: "ADMIN" }],
					text: tagsForFilter[i],
				},
			});
		}
		let tpl_filter = {
			tags: {
				$all: tagsMatchArr,
			},
		};
		//把符合tags要求的模版找出来
		let taggedTpls = await Template.find(tpl_filter, { tplid: 1, _id: 0 }).lean();
		//然后，将这些模版的tplid组成一个数组
		let taggedTplIds = taggedTpls.map((x) => x.tplid);

		//那么，条件就是下面这个
		ret = { $in: taggedTplIds };
	}
	return ret;
}
//
//TODO: cache Employee nickname
async function setTeamMembersName(tenant_id: string | Mongoose.Types.ObjectId, team: TeamType) {
	let allRoles = Object.keys(team.tmap);
	for (let r = 0; r < allRoles.length; r++) {
		let role = allRoles[r];
		let members = team.tmap[role];
		for (let i = 0; i < members.length; i++) {
			team.tmap[role][i].cn =
				(
					(await Employee.findOne(
						{ tenant: tenant_id, eid: members[i].eid },
						{ nickname: 1 },
					)) as EmployeeType
				)?.nickname ?? "Employee Nonexist";
		}
	}
	return team;
}

// async function AutoRegisterOrgChartUser(
// 	tenant: string,
// 	administrator: any,
// 	staffs: any[],
// 	defaultPassword: string,
// ) {
// 	throw new EmpError(
// 		"NOT_WORK_NOW",
// 		"因account全局唯一，不再使用 email区别用户，不能再自动注册用户",
// 	);
// 	//TODO:  email去重, orgchart不用去重，但register user时需要去重
// 	/*
//   for (let i = 0; i < staffs.length; i++) {
//     let staff_email = staffs[i].eid;
//     let staff_cn = staffs[i].cn;
//     //If user already registered, if yes, send invitation, if not, register this user and add this user to my current org automatically.
//     let existing_staff_user = await User.findOne({ email: staff_email }, { __v: 0 });
//     //If this email is already registered, send enter org invitation
//     if (existing_staff_user) {
//       if (existing_staff_user.username !== staff_cn) {
//         await User.updateOne({ email: staff_email }, { $set: { username: staff_cn } });
//       }
//       if (existing_staff_user.tenant.toString() !== administrator.tenant._id.toString()) {
//         //如果用户已经存在，且其tenant不是当前tenant，则发送邀请加入组的通知邮件
//         let frontendUrl = Tools.getFrontEndUrl();
//         var mailbody = `<p>${administrator.username} (email: ${administrator.email}) </p> <br/> invite you to join his organization, <br/>
//        Please login to Metatocome to accept <br/>
//       <a href='${frontendUrl}'>${frontendUrl}</a>`;
//         Engine.sendTenantMail(
//           tenant_id,
//           staff_email,
//           `[MTC] Invitation from ${administrator.username}`,
//           mailbody,
//           "Invitation",
//         ).then();
//       }
//     } else {
//       //If this email is not registered, auto register and auto enter org
//       //1. Create personal tenant.
//       let staffTenant = new Tenant({
//         site: administrator.site,
//         name: staff_cn + " Personal Org",
//         orgmode: false,
//         owner: staff_email,
//         css: "",
//         timezone: administrator.tenant.timezone,
//       });
//       staffTenant = await staffTenant.save();
//       try {
//         let staffUser = new User({
//           site: administrator.site,
//           username: staff_cn,
//           tenant: administrator.tenant._id,
//           password: Crypto.encrypt(defaultPassword),
//           email: staff_email,
//           emailVerified: true,
//           group: "DOER",
//           avatar: "",
//           ew: true,
//           ps: 20,
//         });
//         staffUser = await staffUser.save();
//       } catch (e) {
//         staffTenant.delete();
//       }
//     }
//   } //for
//  */
// }

export default {
	TemplateCreate: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as MtcCredentials;
				if (!(await SPC.hasPerm(CRED.employee, "template", "", "create")))
					throw new EmpError("NO_PERM", "You don't have permission to create template");
				let doc = `
<div class='template' id='${PLD.tplid}'>
    <div class='node START' id='start' style='left:200px; top:200px;'><p>START</p></div>
    <div class='node ACTION' id='hellohyperflow' style='left:300px; top:300px;'><p>Hello, HyperFlow</p><div class="kvars">e30=</div></div>
    <div class='node END' id='end' style='left:400px; top:400px;'><p>END</p> </div>
    <div class='link' from='start' to='hellohyperflow'></div>
    <div class='link' from='hellohyperflow' to='end'></div>
</div>
    `;
				let tmp = Parser.splitStringToArray(PLD.tags);
				let theTags = tmp.map((x: string) => {
					return { owner: CRED.employee.eid, text: x, group: CRED.employee.group };
				});
				theTags.unshift({ owner: CRED.employee.eid, text: "mine", group: CRED.employee.group });
				//let bdoc = await Tools.zipit(doc, {});
				let obj = new Template({
					tenant: CRED.tenant._id,
					tplid: PLD.tplid,
					author: CRED.employee.eid,
					authorName: CRED.employee.nickname,
					doc: doc,
					//bdoc: bdoc,
					desc: PLD.desc ? PLD.desc : "",
					tags: theTags,
					visi: "@" + CRED.employee.eid,
					ksid: "",
					searchable: true,
				});
				obj = await obj.save();
				await Cache.resetETag(`ETAG:TEMPLATES:${CRED.tenant._id}`);
				return obj;
			}),
		);
	},

	TemplateDesc: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let obj = await Template.findOne({ tenant: CRED.tenant._id, tplid: PLD.tplid }, { __v: 0 });
				if (!(await SPC.hasPerm(CRED.employee, "template", obj, "update")))
					throw new EmpError("NO_PERM", "You don't have permission to update template");
				obj = await Template.findOneAndUpdate(
					{
						tenant: CRED.tenant._id,
						tplid: PLD.tplid,
					},
					{ $set: { desc: PLD.desc ? PLD.desc : "" } },
					{ new: true, upsert: false },
				);
				return obj.desc;
			}),
		);
	},

	TemplateBasic: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let tpl = await Template.findOne(
					{
						tenant: CRED.tenant._id,
						tplid: PLD.tplid,
					},
					{ doc: 0 },
				);
				return tpl;
			}),
		);
	},

	WorkflowGetFirstTodoid: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let todo = await Todo.findOne(
					{
						tenant: CRED.tenant._id,
						wfid: PLD.wfid,
						doer: CRED.employee.eid,
						status: "ST_RUN",
					},
					{ todoid: 1 },
				);
				return todo ? todo.todoid : "";
			}),
		);
	},

	WorkflowReadlog: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let wf = await RCL.getWorkflow(
					{ tenant: CRED.tenant._id, wfid: PLD.wfid },
					"engine/handler.WorkflowReadlog",
				);
				if (!(await SPC.hasPerm(CRED.employee, "workflow", wf, "read")))
					return "You don't have permission to read this workflow";

				let logFilename = Engine.getWfLogFilename(CRED.tenant._id, PLD.wfid);

				return fs.readFileSync(logFilename);
			}),
		);
	},

	SeeItWork: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				//const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				if (!(await SPC.hasPerm(CRED.employee, "template", "", "create")))
					throw new EmpError("NO_PERM", "You don't have permission to create template");
				let doc = `
<div class="template" id="Metatocome Learning Guide"><div class="node START" id="start" style="left:200px; top:200px;"><p>START</p></div><div class="node ACTION" id="hellohyperflow" style="left: 360px; top: 200px; z-index: 0;" role="DEFAULT"><p>LG-Step1: Get familiar with metatocome</p><div class="kvars">e30=</div><div class="instruct">PGgxPkdldCBmYW1pbGlhciB3aXRoIHd3dy5tZXRhdG9jb21lLmNvbTwvaDE+Cjxici8+Ck1ldGF0b2NvbWUgcHJvdmlkZSAKPGgyPmhhaGFoYTwvaDI+CjxhIGhyZWY9Ii9kb2NzLyNpbnRyb2R1Y3Rpb24iPk1ldGF0b2NvbWUgSW50cm9kdWN0aW9uPC9hPgo8YSBocmVmPSIvZG9jcy8jdGhlc2l0ZSI+d3d3Lm1ldGF0b2NvbWUuY29tIGludHJvZHVjdGlvbjwvYT4=</div></div><div class="node END" id="end" style="left: 1240px; top: 920px; z-index: 0;"><p>END</p> </div><div id="71k3oibjJ4FQUFkva62tJo" class="node ACTION" style="top: 340px; left: 360px; z-index: 4;" role="DEFAULT"><p>LG-Step2: The site</p><div class="kvars">e30=</div><div class="instruct">PGEgaHJlZj0iL2RvY3MjdGhlc2l0ZSIgdGFyZ2V0PSJfYmxhbmsiPlRoZSBzaXRlPC9hPg==</div></div><div id="u3zuqQEruTzGGaq4PvpTsH" class="node ACTION" style="top: 440px; left: 360px; z-index: 5;" role="DEFAULT"><p>LG-step3: Key concept</p><div class="kvars">e30=</div><div class="instruct">PGEgaHJlZj0iL2RvY3Mja2V5Y29uZWNwdHMiPktleSBDb25jZXB0PC9hPg==</div></div><div id="rKvK4i2b2aKCKnp4nDBmxa" class="node ACTION" style="top: 540px; left: 360px; z-index: 6;" role="DEFAULT"><p>LG-step4: Workflow Template</p><div class="kvars">e30=</div><div class="instruct">QSB0ZW1wbGF0ZSBpcyAuLi4KCjxhIGhyZWY9Ii9kb2NzI3RlbXBsYXRlIj5TZWUgZGV0YWlscyAuLi48L2E+</div></div><div id="iVq2QorpGf2kFXq4YyTxfW" class="node ACTION" style="top: 640px; left: 360px; z-index: 7;" role="DEFAULT"><p>LG-step5: Workflow Process</p><div class="kvars">e30=</div><div class="instruct"></div></div><div id="4iTURhFXJnnUTSyorQuEKE" class="node ACTION" style="top: 740px; left: 360px; z-index: 8;" role="DEFAULT"><p>LG-step6: Works</p><div class="kvars">e30=</div><div class="instruct"></div></div><div id="3XfczPQZCXHQAQ1RTEzuSG" class="node ACTION" style="top: 800px; left: 200px; z-index: 9;" role="DEFAULT"><p>LG_step7: Work Form</p><div class="kvars">e30=</div><div class="instruct"></div></div><div id="gd42tjiXY1WSn3V67B5bGf" class="node ACTION" style="top: 940px; left: 200px; z-index: 10;" role="DEFAULT"><p>LG-step8：User Choice</p><div class="kvars">e30=</div><div class="instruct"></div></div><div id="4CcpXjn9e1o3wMrdBC36HV" class="node ACTION" style="top: 860px; left: 400px; z-index: 11;" role="DEFAULT"><p>LG-Step91： Approve</p><div class="kvars">e30=</div><div class="instruct"></div></div><div id="i1MnFC4Xrhub8XMR7zRTjL" class="node ACTION" style="top: 1020px; left: 400px; z-index: 13;" role="DEFAULT"><p>LG-Step92： Reject</p><div class="kvars">e30=</div><div class="instruct"></div></div><div id="w5mrnmJSGkGZ7tBgiPFhcT" class="node ACTION" style="top: 920px; left: 540px; z-index: 14;" role="DEFAULT"><p>LG-Step10: User Input</p><div class="kvars">e30=</div><div class="instruct"></div></div><div id="9t5jUp7VTCqTnq7Lx4EMEa" class="node SCRIPT" style="top: 920px; left: 700px; z-index: 15;"><p>Script</p></div><div id="ud8F2jXbKkwRPhpg6Wa7pK" class="node ACTION" style="top: 700px; left: 860px; z-index: 16;" role="DEFAULT"><p>A1</p><div class="kvars">e30=</div><div class="instruct"></div></div><div id="fKnv9oJFSmYQWnSEXSEZgu" class="node ACTION" style="top: 780px; left: 860px; z-index: 17;" role="DEFAULT"><p>A2</p><div class="kvars">e30=</div><div class="instruct"></div></div><div id="4N7FVVX3KM449au8B4hUJn" class="node ACTION" style="top: 880px; left: 860px; z-index: 18;" role="DEFAULT"><p>A3</p><div class="kvars">e30=</div><div class="instruct"></div></div><div id="rjFWZpL1mbUS37ThUYSQn5" class="node ACTION" style="top: 960px; left: 860px; z-index: 19;" role="DEFAULT"><p>B1</p><div class="kvars">e30=</div><div class="instruct"></div></div><div id="n77n7D6ihMwcsMw7Jpj2N5" class="node ACTION" style="top: 1040px; left: 860px; z-index: 20;" role="DEFAULT"><p>B2</p><div class="kvars">e30=</div><div class="instruct"></div></div><div id="4JRPNS5uZfkJ3Tk8zorABj" class="node ACTION" style="top: 1160px; left: 860px; z-index: 21;" role="DEFAULT"><p>B3</p><div class="kvars">e30=</div><div class="instruct"></div></div><div id="wqF5XEzdA9RgVLvgJxx6wF" class="node OR" style="top: 920px; left: 1120px; z-index: 22;"><p>OR</p></div><div id="bMi2AwsMDEssqujs39WnUE" class="node ACTION" style="top: 1260px; left: 860px; z-index: 22;" role="DEFAULT"><p>DEFAULT</p><div class="kvars">e30=</div><div class="instruct"></div></div><div class="link" from="start" to="hellohyperflow"></div><div class="link" from="hellohyperflow" to="71k3oibjJ4FQUFkva62tJo"></div><div class="link" from="71k3oibjJ4FQUFkva62tJo" to="u3zuqQEruTzGGaq4PvpTsH"></div><div class="link" from="u3zuqQEruTzGGaq4PvpTsH" to="rKvK4i2b2aKCKnp4nDBmxa"></div><div class="link" from="rKvK4i2b2aKCKnp4nDBmxa" to="iVq2QorpGf2kFXq4YyTxfW"></div><div class="link" from="iVq2QorpGf2kFXq4YyTxfW" to="4iTURhFXJnnUTSyorQuEKE"></div><div class="link" from="4iTURhFXJnnUTSyorQuEKE" to="3XfczPQZCXHQAQ1RTEzuSG"></div><div class="link" from="3XfczPQZCXHQAQ1RTEzuSG" to="gd42tjiXY1WSn3V67B5bGf"></div><div class="link" from="gd42tjiXY1WSn3V67B5bGf" to="4CcpXjn9e1o3wMrdBC36HV" case="Approve"></div><div class="link" from="gd42tjiXY1WSn3V67B5bGf" to="i1MnFC4Xrhub8XMR7zRTjL" case="Reject"></div><div class="link" from="4CcpXjn9e1o3wMrdBC36HV" to="w5mrnmJSGkGZ7tBgiPFhcT"></div><div class="link" from="i1MnFC4Xrhub8XMR7zRTjL" to="w5mrnmJSGkGZ7tBgiPFhcT"></div><div class="link" from="w5mrnmJSGkGZ7tBgiPFhcT" to="9t5jUp7VTCqTnq7Lx4EMEa"></div><div class="link" from="ud8F2jXbKkwRPhpg6Wa7pK" to="wqF5XEzdA9RgVLvgJxx6wF"></div><div class="link" from="fKnv9oJFSmYQWnSEXSEZgu" to="wqF5XEzdA9RgVLvgJxx6wF"></div><div class="link" from="4N7FVVX3KM449au8B4hUJn" to="wqF5XEzdA9RgVLvgJxx6wF"></div><div class="link" from="rjFWZpL1mbUS37ThUYSQn5" to="wqF5XEzdA9RgVLvgJxx6wF"></div><div class="link" from="n77n7D6ihMwcsMw7Jpj2N5" to="wqF5XEzdA9RgVLvgJxx6wF"></div><div class="link" from="4JRPNS5uZfkJ3Tk8zorABj" to="wqF5XEzdA9RgVLvgJxx6wF"></div><div class="link" from="9t5jUp7VTCqTnq7Lx4EMEa" to="ud8F2jXbKkwRPhpg6Wa7pK" case="A1"></div><div class="link" from="9t5jUp7VTCqTnq7Lx4EMEa" to="fKnv9oJFSmYQWnSEXSEZgu" case="A2"></div><div class="link" from="9t5jUp7VTCqTnq7Lx4EMEa" to="4N7FVVX3KM449au8B4hUJn" case="A3"></div><div class="link" from="9t5jUp7VTCqTnq7Lx4EMEa" to="rjFWZpL1mbUS37ThUYSQn5" case="B1"></div><div class="link" from="9t5jUp7VTCqTnq7Lx4EMEa" to="n77n7D6ihMwcsMw7Jpj2N5" case="B2"></div><div class="link" from="9t5jUp7VTCqTnq7Lx4EMEa" to="4JRPNS5uZfkJ3Tk8zorABj" case="B3"></div><div class="link" from="9t5jUp7VTCqTnq7Lx4EMEa" to="bMi2AwsMDEssqujs39WnUE" case="DEFAULT"></div><div class="link" from="bMi2AwsMDEssqujs39WnUE" to="wqF5XEzdA9RgVLvgJxx6wF"></div><div class="link" from="wqF5XEzdA9RgVLvgJxx6wF" to="end"></div></div>
    `;
				let tplid = "Metatocome Learning Guide";
				let filter: any = { tenant: CRED.tenant._id, tplid: tplid },
					update = {
						$set: {
							author: CRED.employee.eid,
							authorName: await Cache.getEmployeeName(
								CRED.tenant._id,
								CRED.employee.eid,
								"SeeItWork",
							),
							doc: doc,
							ins: false,
						},
					},
					options = { upsert: true, new: true };
				await Template.findOneAndUpdate(filter, update, options);
				let wfDoc = await Engine.startWorkflow({
					rehearsal: false, //Rehearsal
					tenant: CRED.tenant._id,
					tplid: tplid,
					starter: CRED.employee,
					textPbo: ["https://www.metatocome.com/docs"],
					pbostatus: "__init__",
					wftitle: "Metaflow Learning Guide",
				});

				return wfDoc;
			}),
		);
	},

	TemplateSnapshotPut: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;

				if (PLD.tplid.startsWith("preview_"))
					throw new EmpError("IS_PREVIEW", "Preivew snapshot will not be saved");

				const ss_key = `SS_${CRED.tenant._id}_${PLD.tplid}`;
				await redisClient.set(ss_key, PLD.svg);
				await Snapshot.findOneAndUpdate(
					{
						tenant: CRED.tenant._id,
						tplid: PLD.tplid,
					},
					{
						$set: { svg: PLD.svg },
					},
					{ upsert: true, new: true },
				);
				return {
					tplid: PLD.tplid,
				};
			}),
		);
	},

	TemplateSnapshotGet: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const tenant_id = req.params.tenant;
				let tplid = req.params.tplid;
				const ss_key = `SS_${tenant_id}_${tplid}`;

				let svg = await redisClient.get(ss_key);
				if (!svg) {
					const theSS = await Snapshot.findOne({ tenant: tenant_id, tplid: tplid });
					if (theSS) {
						svg = theSS.svg;
						await redisClient.set(ss_key, svg);
					}
				}
				if (!svg) {
					svg = `<svg  xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink" width="300" height="200">
    <rect x="0" y="0" height="100" width="100"
          style="stroke:#DDDDDD; fill: #DDDDDD"/>
					<text x="20" y="40">${tplid}</text>
</svg>`;
				}

				return replyHelper.buildReturn(
					svg,
					{
						"Access-Control-Allow-Origin": "*",
						"Cache-Control": "max-age=3600",
						"Content-Type": "image/svg+xml",
						"Content-Disposition": `attachment;filename="${encodeURIComponent("cover.svg")}"`,
					},
					"",
					-1,
				);
			}),
		);
	},

	TemplatePut: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;

				if (PLD.tplid.startsWith("preview_"))
					throw new EmpError("IS_PREVIEW", "Preivew will not be saved");
				if (!(await SPC.hasPerm(CRED.employee, "template", "", "create")))
					throw new EmpError("NO_PERM", "You don't have permission to create template");
				let lastUpdatedAt = PLD.lastUpdatedAt;
				if (Tools.isEmpty(PLD.doc))
					throw new EmpError("NO_CONTENT", "Template content can not be empty");
				let bwid = PLD.bwid;
				if (!bwid) bwid = CRED.employee.eid;
				let searchable = PLD.searchable ?? true;
				let forceupdate = PLD.forceupdate;
				if (Tools.isEmpty(PLD.tplid)) {
					throw new EmpError("NO_TPLID", "Template id can not be empty");
				}
				let obj: TemplateType = await Template.findOne(
					{ tenant: CRED.tenant._id, tplid: PLD.tplid },
					{ __v: 0 },
				);
				if (obj) {
					if (forceupdate === false && obj.updatedAt.toISOString() !== lastUpdatedAt) {
						throw new EmpError("CHECK_LASTUPDATEDAT_FAILED", "Editted by other or in other window");
					}

					//let bdoc = await Tools.zipit(PLD.doc, {});
					let filter: any = { tenant: CRED.tenant._id, tplid: PLD.tplid },
						update = {
							$set: {
								doc: PLD.doc,
								lastUpdateBy: CRED.employee.eid,
								lastUpdateBwid: bwid, //Browser Window ID
								searchable: searchable,
							},
						},
						options = { upsert: false, new: true };
					obj = await Template.findOneAndUpdate(filter, update, options);
				} else {
					obj = new Template({
						tenant: CRED.tenant._id,
						tplid: PLD.tplid,
						author: CRED.employee.eid,
						authorName: CRED.employee.nickname,
						doc: PLD.doc,
						lastUpdateBy: CRED.employee.eid,
						lastUpdateBwid: bwid,
						desc: PLD.desc,
						ksid: "",
						searchable: searchable,
					});
					obj = await obj.save();
				}
				await Cache.resetETag(`ETAG:TEMPLATES:${CRED.tenant._id}`);
				let edittingLog = new EdittingLog({
					tenant: CRED.tenant._id,
					objtype: "Template",
					objid: obj.tplid,
					editor: CRED.employee.eid,
					editorName: CRED.employee.nickname,
				});
				edittingLog = await edittingLog.save();
				if (PLD.tplid.startsWith("TMP_KSHARE_")) {
					let ksid = obj.ksid;
					await KsTpl.findOneAndUpdate(
						{ ksid: ksid },
						{ $set: { doc: PLD.doc } },
						{ upsert: false, new: true },
					);
				}
				return {
					_id: obj._id,
					tplid: obj.tplid,
					desc: obj.desc,
					updatedAt: obj.updatedAt,
				};
			}),
		);
	},

	TemplateEditLog: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				if (!(await SPC.hasPerm(CRED.employee, "template", "", "read")))
					throw new EmpError("NO_PERM", "You don't have permission to read this template");

				let filter: any = { tenant: CRED.tenant._id, objtype: "Template", objid: PLD.tplid };
				return await EdittingLog.find(filter, { editor: 1, editorName: 1, updatedAt: 1 }).lean();
			}),
		);
	},

	TemplateAddCron: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				if (!(await SPC.hasPerm(CRED.employee, "template", "", "read")))
					throw new EmpError("NO_PERM", "You don't have permission to read this template");
				//////////////////////////////////////////////////
				// ADMIN unlimited, normal user 3
				//////////////////////////////////////////////////
				let allowedCronNumber = CRED.employee.group !== "ADMIN" ? 3 : -1;
				//
				//
				//////////////////////////////////////////////////
				//ADMIN can add cron for other users
				//////////////////////////////////////////////////
				let starters = PLD.starters;
				if (CRED.employee.group !== "ADMIN") {
					//Normal user only add cron for himeself
					starters = "@" + CRED.employee.eid;
					let cnt = await Crontab.countDocuments({
						tenant: CRED.tenant._id,
						creator: CRED.employee.eid,
					});
					if (cnt >= allowedCronNumber) {
						throw new EmpError("QUOTA EXCEEDED", `Exceed cron entry quota ${allowedCronNumber}`);
					}
				}

				let existing = await Crontab.findOne(
					{
						tenant: CRED.tenant._id,
						tplid: PLD.tplid,
						expr: PLD.expr,
						starters: starters,
						method: "STARTWORKFLOW",
					},
					{ __v: 0 },
				);
				if (existing) {
					throw new EmpError("ALREADY_EXIST", "Same cron already exist");
				}
				//
				//////////////////////////////////////////////////
				//
				let cronTab = new Crontab({
					tenant: CRED.tenant._id,
					tplid: PLD.tplid,
					nodeid: "", //no use for STARTWORKFLOW
					wfid: "", //no use for STARTWORKFLOW
					workid: "", //no use for STARTWORKFLOW
					expr: PLD.expr,
					starters: starters,
					creator: CRED.employee.eid,
					scheduled: false,
					method: "STARTWORKFLOW",
					extra: "{}",
				});
				cronTab = await cronTab.save();
				await Engine.rescheduleCrons();
				let filter: any = { tenant: CRED.tenant._id, tplid: PLD.tplid, creator: CRED.employee.eid };
				let crons = await Crontab.find(filter, { __v: 0 }).lean();
				return crons;
			}),
		);
	},

	TemplateBatchStart: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				expect(CRED.employee.group).to.equal("ADMIN");
				await Engine.startBatchWorkflow(
					CRED.tenant._id,
					PLD.starters,
					PLD.tplid,
					CRED.employee.eid,
				);
				return "Done";
			}),
		);
	},

	TemplateDelCron: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let filter: any = { tenant: CRED.tenant._id, _id: PLD.id, creator: CRED.employee.eid };
				await Crontab.deleteOne(filter);
				Engine.stopCronTask(PLD.id);
				filter = { tenant: CRED.tenant._id, tplid: PLD.tplid, creator: CRED.employee.eid };
				let crons = await Crontab.find(filter, { __v: 0 }).lean();
				return crons;
			}),
		);
	},

	TemplateGetCrons: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				if (!(await SPC.hasPerm(CRED.employee, "template", "", "read")))
					throw new EmpError("NO_PERM", "You don't have permission to read this template");
				let filter: any = { tenant: CRED.tenant._id, tplid: PLD.tplid, creator: CRED.employee.eid };
				let crons = await Crontab.find(filter, { __v: 0 }).lean();
				return crons;
			}),
		);
	},

	/**
	 * Rename Template from tplid: fromid to tplid: tplid
	 */
	TemplateRename: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let filter: any = { tenant: CRED.tenant._id, tplid: PLD.fromid };
				let tpl = await Template.findOne(filter, { __v: 0 });
				if (!(await SPC.hasPerm(CRED.employee, "template", tpl, "update")))
					throw new EmpError("NO_PERM", "You don't have permission to rename this template");
				tpl.tplid = PLD.tplid;
				if (Tools.isEmpty(tpl.authorName)) {
					tpl.authorName = await Cache.getEmployeeName(
						CRED.tenant._id,
						tpl.author,
						"TemplateRename",
					);
				}
				let oldTplId = PLD.fromid;
				let newTplId = PLD.tplid;
				tpl = await tpl.save();
				//Move cover image
				await Snapshot.findOneAndUpdate(
					{ tenant: CRED.tenant._id, tplid: oldTplId },
					{ $set: { tplid: newTplId } },
					{ upsert: false, new: true },
				);
				await Cache.resetETag(`ETAG:TEMPLATES:${CRED.tenant._id}`);
				return { tplid: tpl.tplid };
			}),
		);
	},

	TemplateRenameWithIid: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let filter: any = { tenant: CRED.tenant._id, _id: PLD._id };
				let tpl = await Template.findOne(filter, { __v: 0 });
				let oldTplId = tpl.tplid;
				let newTplId = PLD.tplid;
				if (!(await SPC.hasPerm(CRED.employee, "template", tpl, "update")))
					throw new EmpError("NO_PERM", "You don't have permission to rename this template");
				tpl.tplid = newTplId;
				tpl = await tpl.save();
				await Snapshot.findOneAndUpdate(
					{ tenant: CRED.tenant._id, tplid: oldTplId },
					{ $set: { tplid: newTplId } },
					{ upsert: false, new: true },
				);

				await Cache.resetETag(`ETAG:TEMPLATES:${CRED.tenant._id}`);
				return tpl;
			}),
		);
	},

	TemplateMakeCopyOf: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let filter: any = { tenant: CRED.tenant._id, _id: PLD._id };
				let oldTpl = await Template.findOne(filter, { __v: 0 });
				let oldTplId = oldTpl.tplid;
				if (!(await SPC.hasPerm(CRED.employee, "template", "", "create")))
					throw new EmpError("NO_PERM", "You don't have permission to create template");
				let newObj = new Template({
					tenant: oldTpl.tenant,
					tplid: oldTpl.tplid + "_copy",
					author: CRED.employee.eid,
					authorName: CRED.employee.nickname,
					doc: oldTpl.doc,
					tags: [{ owner: CRED.employee.eid, text: "mine", group: CRED.employee.group }],
					hasCover: oldTpl.hasCover,
					ksid: "",
					searchable: true,
				});
				newObj = await newObj.save();
				// let newTplId = newObj.tplid;

				let oldSnapshot = await Snapshot.findOne({ tenant: CRED.tenant._id, tplid: oldTplId });
				if (oldSnapshot) {
					let newSnapshot = new Snapshot({
						tenant: CRED.tenant._id,
						tplid: oldTpl.tplid + "_copy",
						svg: oldSnapshot.svg,
					});
					await newSnapshot.save();
				}

				await Cache.resetETag(`ETAG:TEMPLATES:${CRED.tenant._id}`);
				return newObj;
			}),
		);
	},

	TemplateCopyto: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				if (!(await SPC.hasPerm(CRED.employee, "template", "", "create")))
					throw new EmpError("NO_PERM", "You don't have permission to create template");

				let oldTplId = PLD.fromid;
				let newTplId = PLD.tplid;

				let oldTpl = await Template.findOne(
					{ tenant: CRED.tenant._id, tplid: PLD.fromid },
					{ __v: 0 },
				);
				let newObj = new Template({
					tenant: oldTpl.tenant,
					tplid: newTplId,
					author: CRED.employee.eid,
					authorName: CRED.employee.nickname,
					doc: oldTpl.doc,
					ins: oldTpl.ins,
					tags: oldTpl.tags,
					visi: "@" + CRED.employee.eid,
					hasCover: oldTpl.hasCover,
					ksid: "",
					searchable: true,
				});
				newObj = await newObj.save();

				let oldSnapshot = await Snapshot.findOne({ tenant: CRED.tenant._id, tplid: oldTplId });
				if (oldSnapshot) {
					let newSnapshot = new Snapshot({
						tenant: CRED.tenant._id,
						tplid: newTplId,
						svg: oldSnapshot.svg,
					});
					await newSnapshot.save();
				}
				await Cache.resetETag(`ETAG:TEMPLATES:${CRED.tenant._id}`);
				return newObj;
			}),
		);
	},

	TemplateDelete: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let filter: any = { tenant: tenant_id, _id: PLD._id };
				const theTpl = await Template.findOne(filter, { doc: 0 });
				let oldTplId = theTpl.tplid;
				if (!(await SPC.hasPerm(CRED.employee, "template", theTpl, "delete")))
					throw new EmpError("NO_PERM", "You don't have permission to delete this template");
				let deletedRet = await Template.deleteOne(filter);
				await Snapshot.deleteOne({ tenant: tenant_id, tplid: oldTplId });
				await Cache.resetETag(`ETAG:TEMPLATES:${tenant_id}`);
				return deletedRet;
			}),
		);
	},

	TemplateDeleteByTplid: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let filter: any = { tenant: tenant_id, tplid: PLD.tplid };

				// let oldTplId = PLD.tplid;
				const theTpl = await Template.findOne(filter, { doc: 0 });
				if (!(await SPC.hasPerm(CRED.employee, "template", theTpl, "delete")))
					throw new EmpError("NO_PERM", "You don't have permission to delete this template");
				const delRet = await Template.deleteOne(filter);
				await Snapshot.deleteOne(filter);
				await Cache.resetETag(`ETAG:TEMPLATES:${tenant_id}`);
				return delRet;
			}),
		);
	},

	TemplateDeleteMulti: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				//let myEid = CRED.employee.eid;
				assert.equal(
					CRED.employee.group,
					"ADMIN",
					new EmpError("NOT_ADMIN", "Only ADMIN can delete templates in batch"),
				);

				let filter: any = { tenant: tenant_id, tplid: { $in: PLD.tplids } };
				await Template.deleteMany(filter);
				await Snapshot.deleteMany(filter);

				await Cache.resetETag(`ETAG:TEMPLATES:${tenant_id}`);
				return "Deleted";
			}),
		);
	},

	WorkflowRead: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let withDoc = PLD.withdoc;

				let myGroup = CRED.employee.group;

				if (
					myGroup !== "ADMIN" &&
					(await AccessControl.isDoerInWorkflow(tenant_id, CRED.employee.eid, PLD.wfid)) === false
				) {
					throw new EmpError("No permisisons", "You are not in this workflow");
				}
				let wf = await RCL.getWorkflow(
					{ tenant: tenant_id, wfid: PLD.wfid },
					"engine/handler.WorkflowRead",
				);
				if (!(await SPC.hasPerm(CRED.employee, "workflow", wf, "read")))
					throw new EmpError("NO_PERM", "You don't have permission to read this template");
				if (wf) {
					let retWf = JSON.parse(JSON.stringify(wf));
					retWf.beginat = retWf.createdAt;
					retWf.history = await WorkEngine.getWfHistory(tenant_id, myEid, PLD.wfid);
					if (withDoc === false) delete retWf.doc;
					if (retWf.status === "ST_DONE") retWf.doneat = retWf.updatedAt;
					retWf.starterCN = await Cache.getEmployeeName(tenant_id, wf.starter, "WorkflowRead");
					let pboStatusValueDef = await Parser.getVar(
						tenant_id,
						retWf.wfid,
						Const.FOR_WHOLE_PROCESS,
						Const.VAR_IS_EFFICIENT,
						"pboStatus",
					);
					retWf.pboStatus = pboStatusValueDef === null ? "NOT_SET" : pboStatusValueDef.value;

					return retWf;
				} else {
					return { wftitle: "Not Found" };
				}
			}),
		);
	},

	WorkflowGetAttachments: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let wf = await RCL.getWorkflow(
					{ tenant: tenant_id, wfid: PLD.wfid },
					"engine/handler.WorkflowRead",
				);
				if (wf) {
					if (!(await SPC.hasPerm(CRED.employee, "workflow", wf, "read")))
						throw new EmpError("NO_PERM", "You don't have permission to read this template");
					return wf.attachments;
				} else {
					throw new EmpError("NOT_FOUND", "Workflow not found");
				}
			}),
		);
	},

	WorkflowGetPbo: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let pboType = PLD.pbotype;
				let wf = await RCL.getWorkflow(
					{ tenant: tenant_id, wfid: PLD.wfid },
					"engine/handler.WorkflowRead",
				);
				if (wf) {
					if (!(await SPC.hasPerm(CRED.employee, "workflow", wf, "read")))
						throw new EmpError("NO_PERM", "You don't have permission to read this template");
					let ret = wf.attachments;
					switch (pboType.toLowerCase()) {
						case "all":
							ret = wf.attachments;
							break;
						case "text":
							ret = ret.filter((x: WorkflowAttachmentEntryTextType) => {
								return x.type === "text";
							});
							break;
						case "file":
							ret = ret.filter((x: WorkflowAttachmentEntryFileType) => {
								return x.type === "file";
							});
							break;
					}
					return ret;
				} else {
					throw new EmpError("NOT_FOUND", "Workflow not found");
				}
			}),
		);
	},

	WorkflowSetPbo: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let pbotype = PLD.pbotype;
				if (pbotype !== "text") {
					throw new EmpError("NOT_SUPPORT", "Only text type pbo is supported at this moment");
				}
				let wf = await RCL.getWorkflow(
					{ tenant: tenant_id, wfid: PLD.wfid },
					"engine/handler.WorkflowSetPbo",
				);
				if (wf) {
					if (!(await SPC.hasPerm(CRED.employee, "workflow", wf, "update")))
						throw new EmpError("NO_PERM", "You don't have permission to modify this workflow");
					//保留文件型attachments， 去除所有text类型attachments
					//将新的text类型attachments放到最前面;
					[].concat(PLD.pbo).map((x: string) => {
						wf.attachments.push({
							type: "text",
							author: CRED.employee.eid,
							stepid: PLD.stepid,
							text: x,
						});
					});
					await Workflow.findOneAndUpdate(
						{ tenant: tenant_id, wfid: PLD.wfid },
						{ $set: { attachments: wf.attachments } },
						{ upsert: false, new: true },
					);
					await RCL.resetCache(
						{ tenant: tenant_id, wfid: PLD.wfid },
						"engine/handler.WorkflowSetPbo",
						RCL.CACHE_ELEVEL_REDIS,
					);
					wf = await RCL.getWorkflow(
						{ tenant: tenant_id, wfid: PLD.wfid },
						"engine/handler.WorkflowSetPbo",
					);
					return wf.attachments;
				} else {
					throw new EmpError("NOT_FOUND", "Workflow not found");
				}
			}),
		);
	},

	WorkflowClearPbo: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let pbotype = PLD.pbotype;
				if (pbotype !== "text") {
					throw new EmpError("NOT_SUPPORT", "Only text type pbo is supported at this moment");
				}
				let wf = await RCL.getWorkflow(
					{ tenant: tenant_id, wfid: PLD.wfid },
					"engine/handler.WorkflowCleatPbo",
				);
				if (wf) {
					if (!(await SPC.hasPerm(CRED.employee, "workflow", wf, "update")))
						throw new EmpError("NO_PERM", "You don't have permission to modify this workflow");
					//保留文件型attachments， 去除所有text类型attachments
					//将新的text类型attachments放到最前面;
					switch (PLD.type) {
						case "all":
							wf.attachments = [];
							break;
						case "text":
							wf.attachments = wf.attachments.filter((x: WorkflowAttachmentEntryType) => {
								return x.type === "file";
							});
						case "file":
							wf.attachments = wf.attachments.filter((x: WorkflowAttachmentEntryType) => {
								return x.type === "text";
							});
					}
					await Workflow.findOneAndUpdate(
						{ tenant: tenant_id, wfid: PLD.wfid },
						{ $set: { attachments: wf.attachments } },
						{ upsert: false, new: true },
					);
					await RCL.resetCache(
						{ tenant: tenant_id, wfid: PLD.wfid },
						"engine/handler.WorkflowClearPbo",
						RCL.CACHE_ELEVEL_REDIS,
					);
					wf = await RCL.getWorkflow(
						{ tenant: tenant_id, wfid: PLD.wfid },
						"engine/handler.WorkflowClearPbo",
					);
					return wf.attachments;
				} else {
					throw new EmpError("NOT_FOUND", "Workflow not found");
				}
			}),
		);
	},

	WorkflowCheckStatus: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let wf = await RCL.getWorkflow(
					{
						tenant: CRED.tenant._id,
						wfid: PLD.wfid,
					},
					"engine/handler.WorkflowCheckStatus",
				);
				let ret = {};
				if (!wf) {
					ret = "NOTFOUND";
				} else {
					/* if (wf.updatedAt.toISOString() === PLD.updatedAt) {
        ret = "NOCHANGE";
      } else { */
					ret["wfid"] = wf.wfid;
					ret["nodeStatus"] = await Engine.getNodeStatus(wf);
					ret["doc"] = wf.doc;
					ret["routeStatus"] = await Route.find(
						{ tenant: CRED.tenant._id, wfid: wf.wfid },
						{ __v: 0 },
					);
					ret["updatedAt"] = wf.updatedAt;
					ret["status"] = wf.status;
					//}
					return ret;
				}
			}),
		);
	},

	WorkflowRoutes: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let filter: any = { tenant: CRED.tenant._id, wfid: PLD.wfid };
				return await Route.find(filter, { __v: 0 });
			}),
		);
	},

	WorkflowDumpInstemplate: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let wf = await RCL.getWorkflow(
					{
						tenant: CRED.tenant._id,
						wfid: PLD.wfid,
					},
					"engine/handler.WorkflowDumpInstemplate",
				);
				if (!(await SPC.hasPerm(CRED.employee, "workflow", wf, "read")))
					throw new EmpError("NO_PERM", "You don't have permission to read this template");
				let wfIO = await Parser.parse(wf.doc);
				let tpRoot = wfIO(".template");
				let tplid = PLD.wfid + "_instemplate";
				let theTemplateDoc = `<div class="template" >${tpRoot.html()}</div>`;

				let obj = await Template.findOneAndUpdate(
					{
						tenant: tenant_id,
						tplid: tplid,
					},
					{
						$set: {
							tenant: tenant_id,
							tplid: tplid,
							author: CRED.employee.eid,
							authorName: CRED.employee.nickname,
							doc: theTemplateDoc,
							ins: true,
						},
					},
					{ upsert: true, new: true },
				);

				return { _id: obj._id, tplid: obj.tplid };
			}),
		);
	},

	WorkflowStart: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let starter = CRED.employee;
				let tplid = PLD.tplid;
				let wfid = PLD.wfid;
				let wftitle = PLD.wftitle;
				let teamid = PLD.teamid;
				let rehearsal = PLD.rehearsal;
				let textPbo = PLD.textPbo;
				let kvars = PLD.kvars;
				let uploadedFiles = PLD.uploadedFiles;

				if (!(await SPC.hasPerm(CRED.employee, "workflow", "", "create")))
					throw new EmpError(
						"NO_PERM",
						`You don't have permission to start a workflow EID:${CRED.employee.eid} GROUP:${CRED.employee.group}`,
					);

				textPbo = textPbo ? textPbo : "";
				if (textPbo.length > 0) {
					textPbo = [textPbo];
				} else {
					textPbo = [];
				}
				let tpl = await Template.findOne(
					{
						tenant: CRED.tenant._id,
						tplid: PLD.tplid,
					},
					{ doc: 0 },
				);
				if (!tpl) {
					throw new EmpError("NO_FOUND", `Tempalte ${tplid} not found.`);
				}
				if (tpl.musthavepbo && textPbo.length == 0 && uploadedFiles.length == 0) {
					throw new EmpError("MUST_HAVE_PBO", `Tempalte ${tplid} required PBO on start`);
				}

				let wfDoc = await Engine.startWorkflow({
					rehearsal: rehearsal,
					tenant: tenant_id,
					tplid: tplid,
					starter: starter,
					textPbo: textPbo,
					pbostatus: "__init__",
					teamid: teamid,
					wfid: wfid,
					wftitle: wftitle,
					parent_vars: kvars,
					uploadedFiles: uploadedFiles,
				});
				await Engine.resetTodosETagByWfId(tenant_id, wfid);
				await Cache.resetETag(`ETAG:WORKFLOWS:${tenant_id}`);
				return wfDoc;
			}),
		);
	},

	WorkflowAddFile: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let wfid = PLD.wfid;
				let pondfiles = PLD.pondfiles;
				let attachFiles = [];
				let csvFiles: PondFileInfoFromPayloadType[] = [];
				if (pondfiles.length > 0) {
					pondfiles = pondfiles.map((x: PondFileInfoFromPayloadType) => {
						x.author = CRED.employee.eid;
						x.forKey = PLD.forKey;
						x.type = "file";
						return x;
					});
					attachFiles = pondfiles.filter((x: any) => x.forKey.startsWith("csv_") === false);
					csvFiles = pondfiles.filter((x: any) => x.forKey.startsWith("csv_") === true);
					//非csv_开头的文件，加入workflowAttachment
					//csv_开头的文件，单独处理
					if (attachFiles.length > 0) {
						let workflow = await RCL.updateWorkflow(
							{ tenant: tenant_id, wfid },
							{
								$addToSet: { attachments: { $each: attachFiles } },
							},
							"engine/handler.WorkflowAddFile",
						);
						return workflow.attachments;
					}

					if (csvFiles.length > 0) {
						let csvSaveResult = await __saveCSVAsCells(tenant_id, wfid, csvFiles);
						return csvSaveResult;
					}
				}

				return "No file uploaded, neither attachment nor csv";
			}),
		);
	},

	WorkflowRemoveAttachment: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let wfid = PLD.wfid;
				let attachmentsToDelete = PLD.attachments;
				if (attachmentsToDelete.length <= 0) return "Done";

				let wf = await RCL.getWorkflow(
					{ tenant: tenant_id, wfid: wfid },
					"engine/handler.WorkflowRemoveAttachment",
				);

				let canDeleteAll = false;
				if (CRED.employee.group === "ADMIN") canDeleteAll = true;
				else if (wf.starter === CRED.employee.eid) canDeleteAll = true;

				let wfAttachments = wf.attachments;
				//TODO: to test it.
				for (let i = 0; i < attachmentsToDelete.length; i++) {
					let tobeDel = attachmentsToDelete[i];
					let tmp = [];
					for (let i = 0; i < wfAttachments.length; i++) {
						if (
							((tobeDel.type === "file" && wfAttachments[i].serverId === tobeDel.serverId) ||
								(tobeDel.type === "text" && wfAttachments[i].text === tobeDel.text)) &&
							(canDeleteAll || wfAttachments[i].author === myEid)
						) {
							if (tobeDel.type === "file") {
								try {
									let fileInfo = Tools.getPondServerFile(
										tenant_id,
										wfAttachments[i].author,
										wfAttachments[i].serverId,
									);
									fs.unlinkSync(fileInfo.fullPath);
								} catch (e) {}
							}
						} else {
							tmp.push(wfAttachments[i]);
						}
					}
					wfAttachments = tmp;
				}

				wf = await RCL.updateWorkflow(
					{ tenant: tenant_id, wfid },
					{ $set: { attachments: wfAttachments } },
					"engine/handler.WorkflowRemoveAttachment",
				);

				return wfAttachments;
			}),
		);
	},

	WorkflowPause: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let wfid = PLD.wfid;
				await Engine.resetTodosETagByWfId(tenant_id, wfid);
				let status = await Engine.pauseWorkflow(tenant_id, CRED.employee, wfid);
				await Cache.resetETag(`ETAG:WORKFLOWS:${tenant_id}`);
				return { wfid: wfid, status: status };
			}),
		);
	},

	WorkflowResume: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let wfid = PLD.wfid;
				await Engine.resetTodosETagByWfId(tenant_id, wfid);
				let status = await Engine.resumeWorkflow(tenant_id, CRED.employee, wfid);
				await Cache.resetETag(`ETAG:WORKFLOWS:${tenant_id}`);
				return { wfid: wfid, status: status };
			}),
		);
	},

	WorkflowStop: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let wfid = PLD.wfid;
				await Engine.resetTodosETagByWfId(tenant_id, wfid);
				let status = await Engine.stopWorkflow(tenant_id, CRED.employee, wfid);
				await Cache.resetETag(`ETAG:WORKFLOWS:${tenant_id}`);
				return { wfid: wfid, status: status };
			}),
		);
	},

	WorkflowRestart: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let wfid = PLD.wfid;
				await Engine.resetTodosETagByWfId(tenant_id, wfid);
				let status = await Engine.restartWorkflow(tenant_id, CRED.employee, wfid);
				await Cache.resetETag(`ETAG:WORKFLOWS:${tenant_id}`);
				return { wfid: wfid, status: status };
			}),
		);
	},

	WorkflowDestroy: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let wfid = PLD.wfid;
				await Engine.resetTodosETagByWfId(tenant_id, wfid);
				let ret = await Engine.destroyWorkflow(tenant_id, CRED.employee, wfid);
				await Cache.resetETag(`ETAG:WORKFLOWS:${tenant_id}`);
				return { wfid: wfid, status: ret };
			}),
		);
	},

	WorkflowDestroyMulti: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				assert.equal(
					CRED.employee.group,
					"ADMIN",
					new EmpError("NOT_ADMIN", "Only ADMIN can delete workflows in batch"),
				);
				for (let i = 0; i < PLD.wfids.length; i++) {
					const wfid = PLD.wfids[i];
					await Engine.resetTodosETagByWfId(tenant_id, wfid);
					await Engine.destroyWorkflow(tenant_id, CRED.employee, wfid);
				}
				await Cache.resetETag(`ETAG:WORKFLOWS:${tenant_id}`);
				return "Deleted";
			}),
		);
	},

	WorkflowDestroyByTitle: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let wftitle = PLD.wftitle;
				let wfs = await Workflow.find(
					{ tenant: tenant_id, wftitle: wftitle },
					{ _id: 0, wfid: 1 },
				).lean();
				for (let i = 0; i < wfs.length; i++) {
					await Engine.resetTodosETagByWfId(tenant_id, wfs[i].wfid);
					await Engine.destroyWorkflow(tenant_id, CRED.employee, wfs[i].wfid);
				}
				await Cache.resetETag(`ETAG:WORKFLOWS:${tenant_id}`);
				return "Done";
			}),
		);
	},

	WorkflowDestroyByTplid: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let tplid = PLD.tplid;
				let wfs = await Workflow.find(
					{ tenant: tenant_id, tplid: tplid },
					{ _id: 0, wfid: 1 },
				).lean();
				for (let i = 0; i < wfs.length; i++) {
					await Engine.resetTodosETagByWfId(tenant_id, wfs[i].wfid);
					await Engine.destroyWorkflow(tenant_id, CRED.employee, wfs[i].wfid);
				}
				await Cache.resetETag(`ETAG:WORKFLOWS:${tenant_id}`);
				return "Done";
			}),
		);
	},

	WorkflowRestartThenDestroy: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let wfid = PLD.wfid;
				await Engine.resetTodosETagByWfId(tenant_id, wfid);
				let newWf = await Engine.restartWorkflow(tenant_id, CRED.employee, wfid);
				await Engine.resetTodosETagByWfId(tenant_id, newWf.wfid);
				await Engine.destroyWorkflow(tenant_id, CRED.employee, wfid);
				await Cache.resetETag(`ETAG:WORKFLOWS:${tenant_id}`);
				return newWf;
			}),
		);
	},

	WorkflowOP: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let wfid = PLD.wfid;
				console.log(`[Workflow OP] ${CRED.employee.eid} [${PLD.op}] ${wfid}`);
				let ret = {};
				switch (PLD.op) {
					case "pause":
						ret = {
							wfid: wfid,
							status: await Engine.pauseWorkflow(tenant_id, CRED.employee, wfid),
						};
						break;
					case "resume":
						ret = {
							wfid: wfid,
							status: await Engine.resumeWorkflow(tenant_id, CRED.employee, wfid),
						};
						break;
					case "stop":
						ret = {
							wfid: wfid,
							status: await Engine.stopWorkflow(tenant_id, CRED.employee, wfid),
						};
						break;
					case "restart":
						ret = {
							wfid: wfid,
							status: await Engine.restartWorkflow(tenant_id, CRED.employee, wfid),
						};
						break;
					case "restartWithLatestTpl":
						ret = {
							wfid: wfid,
							status: await Engine.restartWorkflow_with_latest_tpl(
								tenant_id,
								CRED.employee,
								wfid,
								CRED.employee.eid,
							),
						};
						break;
					case "destroy":
						ret = {
							wfid: wfid,
							status: await Engine.destroyWorkflow(tenant_id, CRED.employee, wfid),
						};
						break;
					case "restartthendestroy":
						ret = await Engine.restartWorkflow(tenant_id, CRED.employee, wfid);
						await Engine.destroyWorkflow(tenant_id, CRED.employee, wfid);
						break;
					default:
						throw new EmpError(
							"WORKFLOW_OP_UNSUPPORTED",
							"Unsupported workflow operation",
							req.payload,
						);
				}
				await Cache.resetETag(`ETAG:WORKFLOWS:${tenant_id}`);
				return ret;
			}),
		);
	},

	WorkflowList: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let filter = PLD.filter;
				let sortDef = PLD.sortdef;
				return await Engine.workflowGetList(tenant_id, CRED.employee, filter, sortDef);
			}),
		);
	},

	WorkflowSearch: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myGroup = CRED.employee.group;
				if (PLD.debug) debugger;
				let ifNoneMatch = req.headers["if-none-match"];
				let latestETag = Cache.getETag(`ETAG:WORKFLOWS:${tenant_id}`);
				if (ifNoneMatch && latestETag && ifNoneMatch === latestETag) {
					return {
						data: {},
						code: 304,
						headers: {
							"Content-Type": "application/json; charset=utf-8;",
							"Cache-Control": "no-cache, private",
							"X-Content-Type-Options": "nosniff",
							ETag: latestETag,
						},
					};
				}
				//检查当前用户是否有读取进程的权限
				if (!(await SPC.hasPerm(CRED.employee, "workflow", "", "read")))
					throw new EmpError("NO_PERM", "You don't have permission to read workflow");
				let sortBy = PLD.sortby;

				//开始组装Filter
				let filter: any = { tenant: CRED.tenant._id };
				let todoFilter: any = { tenant: CRED.tenant._id };
				let skip = 0;
				if (PLD.skip) skip = PLD.skip;
				let limit = 10000;
				if (PLD.limit) limit = PLD.limit;
				//按正则表达式匹配wftitle
				if (PLD.pattern) {
					filter["wftitle"] = { $regex: `.*${PLD.pattern}.*` };
					todoFilter["wftitle"] = { $regex: `.*${PLD.pattern}.*` };
				}
				//如果指定了tplid,则使用所指定的tplid
				if (Tools.hasValue(PLD.tplid)) {
					filter["tplid"] = PLD.tplid;
					todoFilter["tplid"] = PLD.tplid;
				} else {
					let tagsFilter = await __GetTagsFilter(PLD.tagsForFilter, CRED.employee.eid);
					//tagsFilter的形式为 {$in: ARRAY OF TPLID}
					if (tagsFilter) {
						filter["tplid"] = tagsFilter;
						todoFilter["tplid"] = tagsFilter;
					}
				}
				if (PLD.wfid) {
					filter["wfid"] = PLD.wfid;
					todoFilter["wfid"] = PLD.wfid;
				}

				if (Tools.hasValue(PLD.status)) {
					filter["status"] = PLD.status;
					todoFilter["wfstatus"] = PLD.status;
				}

				if (Tools.isEmpty(filter.tplid)) {
					delete filter.tplid;
					delete todoFilter.tplid;
				}
				if (["ST_RUN", "ST_PAUSE", "ST_DONE", "ST_STOP"].includes(filter.status) === false) {
					delete filter.status;
					delete todoFilter.wfstatus;
				}

				if (Tools.hasValue(PLD.calendar_begin) && Tools.hasValue(PLD.calendar_end)) {
					let cb = PLD.calendar_begin;
					let ce = PLD.calendar_end;
					let tz = await Cache.getOrgTimeZone(tenant_id);
					let tzdiff = TimeZone.getDiff(tz);
					cb = `${cb}T00:00:00${tzdiff}`;
					ce = `${ce}T00:00:00${tzdiff}`;
					filter.createdAt = {
						$gte: new Date(moment(cb).toDate()),
						$lt: new Date(moment(ce).add(24, "h").toDate()),
					};
					todoFilter.createdAt = filter.createdAt;
				} else {
					//多长时间内
					let tspan = PLD.tspan;
					if (tspan !== "any") {
						let tmp11 = __GetTSpanMomentOperators(tspan);
						filter.createdAt = { $gte: new Date(moment().subtract(tmp11[0], tmp11[1]).toDate()) };
						todoFilter.createdAt = filter.createdAt;
					}
				}

				/*
      db.todos.aggregate([
        { $match: { doer: "suguotai@xihuanwu.com" } },
        { $group: { _id: "$tplid", count: { $sum: 1 } } },
      ]);
       */
				let starter = PLD.starter;
				if (starter) {
					starter = CRED.employee.eid;
					filter["starter"] = starter;
					todoFilter["starter"] = starter;
				}
				//如果当前用户不是ADMIN, 则需要检查进程是否与其相关
				if (myGroup !== "ADMIN") {
					todoFilter.doer = CRED.employee.eid;
					//console.log(`[WfIamIn Filter]  ${JSON.stringify(todoFilter)} `);
					let todoGroup = await Todo.aggregate([
						{ $match: todoFilter },
						{ $group: { _id: "$wfid", count: { $sum: 1 } } },
					]);
					let WfsIamIn = todoGroup.map((x) => x._id);

					//如果没有todo与template相关,也需要看是否是启动者
					//因为,流程的启动者,也许刚好工作都是丢给别人的
					if (WfsIamIn.length === 0) {
						filter.starter = CRED.employee.eid;
					} else {
						//如果有相关todo与template相���,
						//则需��同时考虑todo相关 和 starter相关
						//filter.tplid = { $in: templatesIamIn };
						filter["wfid"] = { $in: WfsIamIn };
					}
				}

				let myBannedTemplatesIds = [];
				if (myGroup !== "ADMIN") {
					myBannedTemplatesIds = await Engine.getUserBannedTemplate(tenant_id, CRED.employee.eid);
				}
				if (filter.tplid) {
					filter["$and"] = [{ tplid: filter.tplid }, { tplid: { $nin: myBannedTemplatesIds } }];
					delete filter.tplid;
				} else {
					filter.tplid = { $nin: myBannedTemplatesIds };
				}

				let fields = { doc: 0 };
				if (PLD.fields) fields = PLD.fields;

				let total = await Workflow.countDocuments(filter, { doc: 0 });
				//console.log(JSON.stringify(filter, null, 2));
				let retObjs = (await Workflow.find(filter, fields)
					.sort(sortBy)
					.skip(skip)
					.limit(limit)
					.lean()) as unknown as any;

				for (let i = 0; i < retObjs.length; i++) {
					retObjs[i].starterCN = await Cache.getEmployeeName(
						tenant_id,
						retObjs[i].starter,
						"WorkflowSearch",
					);
					retObjs[i].commentCount = await Comment.countDocuments({
						tenant_id,
						"context.wfid": retObjs[i].wfid,
					});
				}
				console.log(
					`[Workflow Search] ${CRED.employee.eid} [${total}] filter: ${JSON.stringify(
						filter,
					)} sortBy: ${sortBy} limit: ${limit}`,
				);
				Engine.clearOlderRehearsal(tenant_id, CRED.employee.eid, 24);
				return {
					data: { total, objs: retObjs, version: Const.VERSION },
					headers: {
						"Content-Type": "application/json; charset=utf-8;",
						"Cache-Control": "no-cache",
						"X-Content-Type-Options": "nosniff",
						ETag: latestETag,
					},
				};
			}),
		);
	},

	Mining_Workflow: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myGroup = CRED.employee.group;
				let ifNoneMatch = req.headers["if-none-match"];
				let latestETag = Cache.getETag(`ETAG:MINING:${tenant_id}`);
				if (ifNoneMatch && latestETag && ifNoneMatch === latestETag) {
					return {
						data: {},
						code: 304,
						headers: {
							"Content-Type": "application/json; charset=utf-8;",
							"Cache-Control": "no-cache, private",
							"X-Content-Type-Options": "nosniff",
							ETag: latestETag,
						},
					};
				}
				if (!(await SPC.hasPerm(CRED.employee, "workflow", "", "read")))
					throw new EmpError("NO_PERM", "You don't have permission to read workflow");

				//开始组装Filter
				let filter: any = { tenant: CRED.tenant._id };
				let todoFilter: any = { tenant: CRED.tenant._id };
				//按正则表达式匹配wftitle
				if (PLD.pattern) {
					filter["wftitle"] = { $regex: `.*${PLD.pattern}.*` };
					todoFilter["wftitle"] = { $regex: `.*${PLD.pattern}.*` };
				}
				//如果指定了tplid,则使用所指定的tplid
				if (Tools.hasValue(PLD.tplid)) {
					filter["tplid"] = PLD.tplid;
					todoFilter["tplid"] = PLD.tplid;
				} else {
					let tagsFilter = await __GetTagsFilter(PLD.tagsForFilter, CRED.employee.eid);
					//tagsFilter的形式为 {$in: ARRAY OF TPLID}
					if (tagsFilter) {
						filter["tplid"] = tagsFilter;
						todoFilter["tplid"] = tagsFilter;
					}
				}
				if (PLD.wfid) {
					filter["wfid"] = PLD.wfid;
					todoFilter["wfid"] = PLD.wfid;
				}

				if (Tools.hasValue(PLD.status)) {
					filter["status"] = PLD.status;
					todoFilter["wfstatus"] = PLD.status;
				}

				if (Tools.isEmpty(filter.tplid)) {
					delete filter.tplid;
					delete todoFilter.tplid;
				}
				if (["ST_RUN", "ST_PAUSE", "ST_DONE", "ST_STOP"].includes(filter.status) === false) {
					delete filter.status;
					delete todoFilter.wfstatus;
				}

				if (Tools.hasValue(PLD.calendar_begin) && Tools.hasValue(PLD.calendar_end)) {
					let cb = PLD.calendar_begin;
					let ce = PLD.calendar_end;
					let tz = await Cache.getOrgTimeZone(tenant_id);
					let tzdiff = TimeZone.getDiff(tz);
					cb = `${cb}T00:00:00${tzdiff}`;
					ce = `${ce}T00:00:00${tzdiff}`;
					filter.createdAt = {
						$gte: new Date(moment(cb).toDate()),
						$lt: new Date(moment(ce).add(24, "h").toDate()),
					};
					todoFilter.createdAt = filter.createdAt;
				} else {
					let tspan = PLD.tspan;
					if (tspan !== "any") {
						let tmp11 = __GetTSpanMomentOperators(tspan);
						filter.createdAt = { $gte: new Date(moment().subtract(tmp11[0], tmp11[1]).toDate()) };
						todoFilter.createdAt = filter.createdAt;
					}
				}

				/*
    db.todos.aggregate([
      { $match: { doer: "suguotai@xihuanwu.com" } },
      { $group: { _id: "$tplid", count: { $sum: 1 } } },
    ]);
     */
				let starter = PLD.starter;
				if (starter) {
					starter = CRED.employee.eid;
					filter["starter"] = starter;
					todoFilter["starter"] = starter;
				}
				//如果当前用户不是ADMIN, 则需要检查进程是否与其相关
				if (myGroup !== "ADMIN") {
					todoFilter.doer = CRED.employee.eid;
					//console.log(`[WfIamIn Filter]  ${JSON.stringify(todoFilter)} `);
					let todoGroup = await Todo.aggregate([
						{ $match: todoFilter },
						{ $group: { _id: "$wfid", count: { $sum: 1 } } },
					]);
					let WfsIamIn = todoGroup.map((x) => x._id);

					//如果没有todo与template相关,也需要看是否是启动者
					//因为,流程的启动者,也许刚好工作都是丢给别人的
					if (WfsIamIn.length === 0) {
						filter.starter = CRED.employee.eid;
					} else {
						//如果有相关todo与template相关,
						//则需要同时考虑todo相关 和 starter相关
						//filter.tplid = { $in: templatesIamIn };
						filter["wfid"] = { $in: WfsIamIn };
					}
				}

				let myBannedTemplatesIds = [];
				if (myGroup !== "ADMIN") {
					myBannedTemplatesIds = await Engine.getUserBannedTemplate(tenant_id, CRED.employee.eid);
				}
				if (filter.tplid) {
					filter["$and"] = [{ tplid: filter.tplid }, { tplid: { $nin: myBannedTemplatesIds } }];
					delete filter.tplid;
				} else {
					filter.tplid = { $nin: myBannedTemplatesIds };
				}

				let fields = { doc: 0, __v: 0 };
				if (PLD.fields) fields = PLD.fields;

				//let total = await Workflow.countDocuments(filter, { doc: 0 });
				//console.log(JSON.stringify(filter, null, 2));
				//let retObjs = await Workflow.find(filter, fields, {session}).sort(sortBy).skip(skip).limit(limit).lean();
				let retObjs = (await Workflow.find(filter, fields).lean()) as any[];

				for (let i = 0; i < retObjs.length; i++) {
					retObjs[i].starterCN = await Cache.getEmployeeName(
						tenant_id,
						retObjs[i].starter,
						"WorkflowSearch",
					);
					retObjs[i].commentCount = await Comment.countDocuments({
						tenant_id,
						"context.wfid": retObjs[i].wfid,
					});
					retObjs[i].mdata = { works: [], todos: [] };
					retObjs[i].works = [];
					retObjs[i].todos = [];
					retObjs[i].works_number = 0;
					retObjs[i].todos_number = 0;
					retObjs[i].lasting = 0;
				}
				console.log(
					`[Workflow Search] ${CRED.employee.eid} [${retObjs.length}] filter: ${JSON.stringify(
						filter,
					)} no sort, no skip, no limit`,
				);
				return {
					data: retObjs,
					headers: {
						"Content-Type": "application/json; charset=utf-8;",
						"Cache-Control": "no-cache",
						"X-Content-Type-Options": "nosniff",
						ETag: latestETag,
					},
				};
			}),
		);
	},

	WorkflowGetLatest: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				// let myEid = CRED.employee.eid;
				let filter = PLD.filter;
				return await Engine.workflowGetLatest(tenant_id, CRED.employee, filter);
			}),
		);
	},

	/**
	 * 要么myEid用户是ADMIN，并且doerEmail在同一个Org中
	 * 要么myEid用户被doerEmail用户委托
	 */

	//TODO: return todos with delegated
	WorkSearch: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				const myEid = CRED.employee.eid;
				const myGroup = CRED.employee.group;
				if (PLD.debug) debugger;

				let doer = PLD.doer ? PLD.doer : myEid;
				let reason = PLD.reason ? PLD.reason : "unknown";
				if (myGroup !== "ADMIN" && doer !== myEid) {
					doer = myEid;
				}

				let ifNoneMatch = req.headers["if-none-match"];
				let latestETag = Cache.getETag(`ETAG:TODOS:${doer}`);
				if (ifNoneMatch && latestETag && ifNoneMatch === latestETag) {
					return { data: {}, code: 304, etag: latestETag, headers: replyHelper.headers.nocache };
				}
				//如果有wfid，则找只属于这个wfid工作流的workitems
				/*
       let kicked = await Kicklist.findOne({ tenant: tenant_id, eid: myEid }).lean();
    if (kicked) {
      throw new EmpError("KICKOUT", "your session is kicked out");
    }
    */

				let filter: any = {};
				//filter.tenant = tenant;
				filter.tenant = new Mongoose.Types.ObjectId(tenant_id);
				let hasPermForWork = await Engine.hasPermForWork(CRED.tenant._id, myEid, doer);
				if (hasPermForWork === false) {
					console.log(`${PLD.doer} -> ${doer} does not has Permission for Work`);
					return { total: 0, objs: [] };
				}
				let sortByJson: any = {};
				if (PLD.sortby[0] === "-") {
					sortByJson[PLD.sortby.substring(1)] = -1;
				} else {
					sortByJson[PLD.sortby] = 1;
				}
				//let mappedField = PLD.sort_field === "name" ? "title" : PLD.sort_field;
				let skip = 0;
				if (PLD.skip) skip = PLD.skip;
				let limit = 10000;
				if (PLD.limit) limit = PLD.limit;
				let patternFilter = {};
				if (PLD.pattern?.trim()) {
					let pattern = PLD.pattern.trim();
					if (PLD.pattern.startsWith("wf:")) {
						let wfid =
							PLD.pattern.indexOf(" ") > 0
								? PLD.pattern.substring(3, PLD.pattern.indexOf(" "))
								: PLD.pattern.substring(3);
						pattern =
							PLD.pattern.indexOf(" ") > 0
								? PLD.pattern.substring(PLD.pattern.indexOf(" ") + 1)
								: "";
						filter.wfid = wfid;
					}

					let buildTextQuery = (pattern: string) => {
						//const regexPatterns = pattern.split(" ").map((word) => new RegExp(word, "i"));
						const regexPatterns = pattern.split(" ").map((word) => `.*${word}.*`);

						const query = {
							$and: regexPatterns.map((regex) => ({ title: { $regex: regex } })),
						};
						console.log(query);
						return query;
					};
					patternFilter = buildTextQuery(pattern);
					//filter["title"] = buildTextQuery(pattern);
					// filter["title"] = { $regex: `.*${pattern}.*` };
				}
				if (Tools.hasValue(PLD.tplid)) filter.tplid = PLD.tplid;
				else {
					if (
						PLD.tagsForFilter &&
						Array.isArray(PLD.tagsForFilter) &&
						PLD.tagsForFilter.length > 0 &&
						PLD.tagsForFilter[0].trim() !== ""
					) {
						let tagsFilter = await __GetTagsFilter(PLD.tagsForFilter, myEid);

						if (tagsFilter) filter.tplid = tagsFilter;
					}
				}
				if (Tools.hasValue(PLD.wfid)) filter.wfid = PLD.wfid;
				if (Tools.hasValue(PLD.nodeid)) filter.nodeid = PLD.nodeid;
				if (Tools.hasValue(PLD.workid)) filter.workid = PLD.workid;
				if (Tools.hasValue(PLD.status)) filter.status = PLD.status;
				if (["ST_RUN", "ST_PAUSE", "ST_DONE"].includes(filter.status) === false) {
					delete filter.status;
				}
				if (Tools.hasValue(PLD.wfstatus)) filter.wfstatus = PLD.wfstatus;
				if (["ST_RUN", "ST_PAUSE", "ST_DONE", "ST_STOP"].includes(filter.wfstatus) === false) {
					delete filter.wfstatus;
				}
				if (Tools.hasValue(PLD.calendar_begin) && Tools.hasValue(PLD.calendar_end)) {
					let cb = PLD.calendar_begin;
					let ce = PLD.calendar_end;
					let tz = await Cache.getOrgTimeZone(tenant_id);
					let tzdiff = TimeZone.getDiff(tz);
					cb = `${cb}T00:00:00${tzdiff}`;
					ce = `${ce}T00:00:00${tzdiff}`;
					filter.createdAt = {
						$gte: new Date(moment(cb).toDate()),
						$lt: new Date(moment(ce).add(24, "h").toDate()),
					};
				} else {
					let tspan = PLD.tspan;
					if (tspan !== "any") {
						let tmp11 = __GetTSpanMomentOperators(tspan);
						filter.createdAt = { $gte: new Date(moment().subtract(tmp11[0], tmp11[1]).toDate()) };
					}
				}

				if (filter["status"] !== "ST_RUN" || PLD.showpostponed === true) {
					filter["$or"] = [
						{ rehearsal: false, doer: doer },
						{ rehearsal: true, wfstarter: myEid },
					];
				} else {
					filter["$and"] = [
						{
							$or: [
								{ rehearsal: false, doer: doer },
								{ rehearsal: true, wfstarter: myEid },
							],
						},
						{
							$or: [
								{ postpone: 0 },
								{
									$and: [
										{ postpone: { $gt: 0 } },
										{
											$expr: {
												$gt: [
													{
														$dateDiff: { startDate: "$postponedAt", endDate: "$$NOW", unit: "day" },
													},
													"$postpone",
												],
											},
										},
									],
								},
							],
						},
					];
				}

				//TODO: footprint需要真的是footprint， 根据用户访问的TODO来记录下来
				if (PLD.status === "ST_FOOTPRINT") {
					filter["viewedAt"] = { $exists: true };
					sortByJson = { viewedAt: -1 };
				}

				let ret = await Todo.aggregate([
					{ $match: filter },
					{ $match: patternFilter },
					{
						//lastdays， 当前活动已经持续了多少天，如果是ST_RUN或者ST_PAUSE，跟当前时间相比；
						//否则，用updatedAt - createdAt
						$addFields: {
							lastdays: {
								$cond: {
									if: {
										$or: [{ $eq: ["$status", "ST_RUN"] }, { $eq: ["$status", "ST_PAUSE"] }],
									},
									then: {
										$dateDiff: { startDate: "$createdAt", endDate: "$$NOW", unit: "day" },
									},
									else: {
										$dateDiff: { startDate: "$createdAt", endDate: "$updatedAt", unit: "day" },
									},
								},
							},
						},
					},
					{ $sort: sortByJson },
					{ $skip: skip },
					{ $limit: limit },
				]);
				let total = ret.length;
				for (let i = 0; i < ret.length; i++) {
					if (PLD.showpostponed === false) {
						//如果不显示postponed，也就是搜索结果要么是没有postpone，
						//要么是已经到了postpone时间的，那么，就可以对于这些已经到了postpone时间的，
						//将其postpone设为0， 从而在后续搜索中，不再进行时间对比，直接
						//根据postpone为0，返回即可
						const todoIds = ret.filter((x) => x.postpone > 0).map((x) => x.todoid);
						await Todo.updateMany(
							{
								tenant: tenant_id,
								todoid: { $in: todoIds },
							},
							{ $set: { postpone: 0 } },
						);
					}
					//使用workid，而不是todoid进行搜索comment， 同一work下，不同的todo，也需要
					ret[i].commentCount = await Comment.countDocuments({
						tenant_id,
						"context.workid": ret[i].workid,
					});
					ret[i].kvarsArr = Parser.kvarsToArray(
						await Engine.getKVars(tenant_id, doer, ret[i].wfid),
					);
					ret[i].wfstarterCN = await Cache.getEmployeeName(tenant_id, ret[i].wfstarter);
				}
				console.log(
					`[Work Search] ${myEid} Count:[${total}] Reason[${reason}] filter: ${JSON.stringify(
						filter,
					)} sortBy: ${JSON.stringify(sortByJson)} limit: ${limit}`,
				);
				//借用户每次搜索TODO的时机，清理一下过期的rehearsal
				Engine.clearOlderRehearsal(tenant_id, myEid, 24);
				return {
					data: { total, objs: ret, version: Const.VERSION },
					headers: replyHelper.headers.nocache,
					etag: latestETag,
				};
			}),
		);
	},

	WorkGetNewerIds: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let myEid = CRED.employee.eid;
				let doer = PLD.doer ? PLD.doer : myEid;
				//如果有wfid，则找只属于这个wfid工作流的workitems
				let filter = {};
				filter["$and"] = [
					{ tenant: CRED.tenant._id, status: "ST_RUN", newer: true },
					{
						$or: [
							{ rehearsal: false, doer: doer },
							{ rehearsal: true, wfstarter: myEid },
						],
					},
					{
						$or: [
							{ postpone: 0 },
							{
								$and: [
									{ postpone: { $gt: 0 } },
									{
										$expr: {
											$gt: [
												{
													$dateDiff: { startDate: "$postponedAt", endDate: "$$NOW", unit: "day" },
												},
												"$postpone",
											],
										},
									},
								],
							},
						],
					},
				];
				let todoids = await Todo.find(filter, { todoid: 1, _id: 0 }).lean();
				return todoids;
			}),
		);
	},

	WorkInfo: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let myEid = CRED.employee.eid;
				//如果有wfid，则找只属于这个wfid工作流的workitems
				let myGroup = CRED.employee.group;
				let workitem = await WorkEngine.getWorkInfo(CRED.tenant._id, myEid, myGroup, PLD.todoid);
				return workitem;
			}),
		);
	},

	CheckCoworker: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				//let myEid = CRED.employee.eid;
				let whom = PLD.whom;
				let employee = await Employee.findOne(
					{ tenant: tenant_id, eid: whom },
					{ eid: 1, nickname: 1, _id: 0, group: 1 },
				);
				if (!employee) {
					throw new EmpError("USER_NOT_FOUND", `${whom} not exist`);
				}

				return employee;
			}),
		);
	},

	CheckCoworkers: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				//let myEid = CRED.employee.eid;
				let eids = PLD.eids;
				eids = [...new Set(eids)];

				let ret = "";
				for (let i = 0; i < eids.length; i++) {
					let eid = eids[i][0] === "@" ? eids[i].substring(1) : eids[i];
					let cn = await Cache.getEmployeeName(tenant_id, eid, "CheckCoworkers");
					if (cn === "USER_NOT_FOUND") {
						ret += "<span class='text-danger'>" + eids[i] + "</span> ";
					} else {
						ret += eids[i] + "(" + cn + ") ";
					}
				}

				return ret;
			}),
		);
	},

	TransferWork: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let whom = PLD.whom;
				let todoid = PLD.todoid;

				return Engine.transferWork(tenant_id, whom, myEid, todoid);
			}),
		);
	},

	WorkGetHtml: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let myEid = CRED.employee.eid;
				let myGroup = CRED.employee.group;
				//如果有wfid，则找只属于这个wfid工作流的workitems
				let workitem = await WorkEngine.getWorkInfo(CRED.tenant._id, myEid, myGroup, PLD.todoid);
				let html = "<div class='container'>";
				html += "Work:" + workitem.title;
				html += "KVars:" + JSON.stringify(workitem.kvars);
				html += "</div>";
				return { html };
			}),
		);
	},

	WorkDo: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let myEid = CRED.employee.eid;
				return await Engine.doWork(
					myEid,
					PLD.todoid,
					CRED.tenant._id,
					PLD.doer,
					PLD.route,
					PLD.kvars,
					PLD.comment,
				);
			}),
		);
	},

	WorkFreeJump: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				return await Engine.freejump(
					CRED.tenant._id,
					CRED.employee.eid,
					PLD as {
						from: { nodeid: string; todoid: string; workid: string };
						to: string;
					},
				);
			}),
		);
	},

	WorkFinder: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let filter: any = {
					wfid: PLD.wfid,
					nodeid: PLD.nodeid,
					todoid: PLD.todoid,
					title: PLD.title,
				};
				filter = lodash.omitBy(filter, lodash.isNil);
				let todo = await Todo.findOne(
					{
						$and: [
							//两个条件合并
							//////////////// 第一个条件 start
							lodash.assign(
								{
									tenant: CRED.tenant._id,
									status: "ST_RUN",
								},
								filter,
							),
							///////////////  第一个条件 end
							///////////////  第二个条件 start
							{
								$where: `((this.wfstarter==='${CRED.employee.eid}' && this.rehearsal===true) || (this.rehearsal===false && this.doer==='${CRED.employee.eid}')) `,
							},
							///////////////  第二个条件 end
						],
					},
					{ _id: 0, todoid: 1 },
				).lean();
				if (todo) {
					return todo.todoid;
				} else {
					return "";
				}
			}),
		);
	},

	WorkDoByNode: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let myEid = CRED.employee.eid;
				const todo = await Todo.findOne(
					{
						tenant: CRED.tenant._id,
						wfid: PLD.wfid,
						nodeid: PLD.nodeid,
						status: "ST_RUN",
					},
					{ _id: 0, todoid: 1 },
				).lean();
				if (!todo) {
					throw new EmpError(
						"TODO_NOT_FOUND",
						`Todo with nodeid "${PLD.nodeid}" in wf "${PLD.wfid}" does not exist`,
					);
				}

				return await Engine.doWork(
					myEid,
					todo.todoid,
					CRED.tenant._id,
					PLD.doer,
					PLD.route,
					PLD.kvars,
					PLD.comment,
					PLD.nodeid,
				);
			}),
		);
	},

	WorkPostpone: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;

				const { todoid, days } = PLD;
				await Todo.findOneAndUpdate(
					{ tenant: tenant_id, todoid: todoid },
					{
						$set: {
							postpone: days,
							postponedAt: new Date(),
						},
					},
					{ upsert: false, new: true },
				);

				return "ret";
			}),
		);
	},

	WorkflowStatus: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let myEid = CRED.employee.eid;
				let ret = await Engine.getWorkflowOrNodeStatus(CRED.tenant._id, myEid, PLD.wfid);
				return ret;
			}),
		);
	},

	WorkStatus: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let myEid = CRED.employee.eid;
				return await Engine.getWorkflowOrNodeStatus(CRED.tenant._id, myEid, PLD.wfid, PLD.workid);
			}),
		);
	},

	WorkRevoke: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				// let myEid = CRED.employee.eid;
				return await Engine.revokeWork(
					CRED.employee,
					CRED.tenant._id,
					PLD.wfid,
					PLD.todoid,
					PLD.comment,
				);
			}),
		);
	},

	WorkExplainPds: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let useEid = PLD.eid ? PLD.eid : CRED.employee.eid;
				return await Engine.explainPds({
					tenant: CRED.tenant._id,
					eid: useEid,
					wfid: PLD.wfid,
					teamid: PLD.teamid,
					pds: Tools.qtb(PLD.pds),
					kvar: PLD.kvar,
					insertDefault: false,
				});
			}),
		);
	},

	WorkReset: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				//let myEid = CRED.employee.eid;
				let myGroup = CRED.employee.group;
				if (myGroup !== "ADMIN") {
					throw new EmpError("ONLY_ADMIN", "Only Admin are able to reset");
				}

				let wfid = PLD.wfid;
				let workid = PLD.workid;
				let workFilter = { tenant: tenant_id, wfid: wfid, workid: workid };
				let theWork = await Work.findOne(workFilter, { __v: 0 });
				let wf = await RCL.getWorkflow(
					{ tenant: tenant_id, wfid: wfid },
					"engine/handler.WorkReset",
				);
				let wfIO = await Parser.parse(wf.doc);
				//let tpRoot = wfIO(".template");
				let wfRoot = wfIO(".workflow");

				//Reset work node
				//let tpNode = tpRoot.find("#" + theWork.nodeid);
				let workNode = wfRoot.find("#" + theWork.workid);
				workNode.removeClass("ST_DONE");
				workNode.addClass("ST_RUN");
				workNode.attr("decision", "");
				wf = await RCL.updateWorkflow(
					{ tenant: tenant_id, wfid: wfid },
					{ $set: { doc: wfIO.html() } },
					"engine/handler.WorkReset",
				);

				//Reset Work
				theWork = await Work.findOneAndUpdate(
					workFilter,
					{
						$set: {
							decision: "",
							status: "ST_RUN",
						},
					},
					{ upsert: false, new: true },
				);

				//Reset todo
				let todoFilter = { tenant: tenant_id, wfid: wfid, workid: workid };
				await Todo.updateMany(todoFilter, { $set: { status: "ST_RUN" } });
				return "Done";
			}),
		);
	},

	WorkAddAdhoc: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				return await Engine.addAdhoc({
					tenant: CRED.tenant._id,
					wfid: PLD.wfid,
					todoid: PLD.todoid,
					rehearsal: PLD.rehearsal,
					title: PLD.title,
					doer: PLD.doer,
					comment: PLD.comment,
				});
			}),
		);
	},

	WorkSendback: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let myEid = CRED.employee.eid;
				return await Engine.sendback(
					CRED.tenant._id,
					myEid,
					PLD.wfid,
					PLD.todoid,
					PLD.doer,
					PLD.kvars ?? {},
					PLD.comment,
				);
			}),
		);
	},

	/**
	 * Engine.getTrack = async() 返回work的执行轨迹，倒着往回找
	 */

	WorkGetTrack: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let myEid = CRED.employee.eid;
				return await Engine.getTrack(CRED.tenant._id, myEid, PLD.wfid, PLD.workid);
			}),
		);
	},

	TemplateList: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				//const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				if (!(await SPC.hasPerm(CRED.employee, "template", "", "read")))
					throw new EmpError("NO_PERM", "You don't have permission to read template");
				let ret = await Template.find({ tenant: CRED.tenant._id }, { doc: 0 })
					.sort("-updatedAt")
					.lean();
				return ret;
			}),
		);
	},

	TemplateIdList: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let ifNoneMatch = req.headers["if-none-match"];
				let latestETag = Cache.getETag(`ETAG:TEMPLATES:${tenant_id}`);
				if (ifNoneMatch && latestETag && ifNoneMatch === latestETag) {
					return { data: [], code: 304, etag: latestETag, headers: replyHelper.headers.nocache };
				}
				let filter: any = { tenant: tenant_id, ins: false, searchable: true };
				let myEid = CRED.employee.eid;
				let tagsArr = PLD.tags
					? PLD.tags.split(";").filter((x: string) => x.trim().length > 0)
					: [];
				if (tagsArr.length > 0) {
					//filter["tags.text"] = { $all: PLD.tagsForFilter };
					//filter["tags.owner"] = myEid;
					//filter["tags"] = { text: { $all: PLD.tagsForFilter }, owner: myEid };
					let tagsMatchArr = [];
					for (let i = 0; i < tagsArr.length; i++) {
						tagsMatchArr.push({
							$elemMatch: {
								$or: [{ owner: myEid }, { group: "ADMIN" }],
								text: tagsArr[i],
							},
						});
					}
					filter["tags"] = {
						$all: tagsMatchArr,
					};
				}
				let ret = await Template.find(filter, { tplid: 1, _id: 0 }).sort("tplid");
				return { data: ret, headers: replyHelper.headers.nocache, etag: latestETag };
			}),
		);
	},

	/*

   TemplateSearch_backup :async (req: Request, h:ResponseToolkit)=> {
const PLD=req.payload as any;
const CRED = req.auth.credentials as any;
  try {
const tenant_id = CRED.tenant._id;
    let myEid = CRED.employee.eid;
    if (!(await SPC.hasPerm(CRED.employee, "template", "", "read")))
      throw new EmpError("NO_PERM", "no permission to read template");

    let mappedField = PLD.sort_field === "name" ? "tplid" : PLD.sort_field;
    let sortBy = `${PLD.sort_order < 0 ? "-" : ""}${mappedField}`;
    let filter:any = { tenant: tenant_id, ins: false };
    let skip = 0;
    if (PLD.skip) skip = PLD.skip;
    let limit = 10000;
    if (PLD.limit) limit = PLD.limit;
    if (PLD.pattern) {
      filter["tplid"] = { $regex: `.*${PLD.pattern}.*` };
    }
    if (PLD.tplid) {
      //如果制定了tplid，则使用指定tplid搜索
      filter["tplid"] = PLD.tplid;
      limit = 1;
    }
    if (
      PLD.tagsForFilter &&
      Array.isArray(PLD.tagsForFilter) &&
      PLD.tagsForFilter.length > 0 &&
      PLD.tagsForFilter[0].length > 0
    ) {
      //filter["tags.text"] = { $all: PLD.tagsForFilter };
      //filter["tags.owner"] = myEid;
      //filter["tags"] = { text: { $all: PLD.tagsForFilter }, owner: myEid };
      let tagsMatchArr = [];
      for (let i = 0; i < PLD.tagsForFilter.length; i++) {
        tagsMatchArr.push({
          $elemMatch: {
            $or: [{ owner: myEid }, { group: "ADMIN" }],
            text: PLD.tagsForFilter[i],
          },
        });
      }
      filter["tags"] = {
        $all: tagsMatchArr,
      };
    }

    if (Tools.hasValue(PLD.author)) {
      filter["author"] = PLD.author;
    }

    //let tspan = PLD.tspan;
    let tspan = "any";
    if (tspan !== "any") {
      let tmp11 = __GetTSpanMomentOperators(tspan);
      filter.createdAt = { $gte: new Date(moment().subtract(tmp11[0], tmp11[1])) };
    }

    console.log(
      `[Template Search] filter: ${JSON.stringify(filter)} sortBy: ${sortBy} limit: ${limit}`
    );
    let fields = { doc: 0 };
    if (PLD.fields) fields = PLD.fields;

    //模版的搜索结果, 需要调用Engine.checkVisi检查模版是否对当前用户可见
    let allObjs = await Template.find(filter, { doc: 0 });
    allObjs = await asyncFilter(allObjs, async (x) => {
      return await Engine.checkVisi(tenant_id, x.tplid, myEid, x);
    });
    let total = allObjs.length;
    let ret = await Template.find(filter, fields).sort(sortBy).skip(skip).limit(limit).lean();
    ret = await asyncFilter(ret, async (x) => {
      return await Engine.checkVisi(tenant_id, x.tplid, myEid, x);
    });
    for (let i = 0; i < ret.length; i++) {
      ret[i].cron = (
        await Crontab.find({ tenant: tenant_id, tplid: ret[i].tplid }, { _id: 1 })
      ).length;
    }

    ret = ret.map((x) => {
      x.tags = x.tags.filter((t) => t.owner === myEid);
      return x;
    });
    return { total, objs: ret }; //Template Search Result
  } catch (err) {
    console.error(err);
    return h.response(replyHelper.constructErrorResponse(err)).code(500);
  }
},;
*/

	TemplateSearch: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let myGroup = CRED.employee.group;
				let ifNoneMatch = req.headers["if-none-match"];
				let latestETag = Cache.getETag(`ETAG:TEMPLATES:${tenant_id}`);
				if (ifNoneMatch && latestETag && ifNoneMatch === latestETag) {
					return { data: [], code: 304, headers: replyHelper.headers.nocache, etag: latestETag };
				}
				if (!(await SPC.hasPerm(CRED.employee, "template", "", "read")))
					throw new EmpError("NO_PERM", "no permission to read template");

				let myBannedTemplatesIds = [];
				if (myGroup !== "ADMIN") {
					myBannedTemplatesIds = await Engine.getUserBannedTemplate(tenant_id, myEid);
				}

				let sortBy = PLD.sortby;
				let filter: any = { tenant: tenant_id, ins: false, searchable: true };
				let skip = 0;
				if (PLD.skip) skip = PLD.skip;
				let limit = 10000;
				if (PLD.limit) limit = PLD.limit;
				if (PLD.pattern) {
					//filter["tplid"] = { $regex: `.*${PLD.pattern}.*` };
					filter["$and"] = [
						{ tplid: { $regex: `.*${PLD.pattern}.*` } },
						{ tplid: { $nin: myBannedTemplatesIds } },
					];
				} else if (PLD.tplid) {
					//如果制定了tplid，则使用指定tplid搜索
					//filter["tplid"] = PLD.tplid;
					filter["$and"] = [
						{ tplid: { $eq: PLD.tplid } },
						{ tplid: { $nin: myBannedTemplatesIds } },
					];
					limit = 1;
				} else {
					filter["tplid"] = { $nin: myBannedTemplatesIds };
				}
				if (
					PLD.tagsForFilter &&
					Array.isArray(PLD.tagsForFilter) &&
					PLD.tagsForFilter.length > 0 &&
					PLD.tagsForFilter[0].length > 0
				) {
					//filter["tags.text"] = { $all: PLD.tagsForFilter };
					//filter["tags.owner"] = myEid;
					//filter["tags"] = { text: { $all: PLD.tagsForFilter }, owner: myEid };
					let tagsMatchArr = [];
					for (let i = 0; i < PLD.tagsForFilter.length; i++) {
						tagsMatchArr.push({
							$elemMatch: {
								$or: [{ owner: myEid }, { group: "ADMIN" }],
								text: PLD.tagsForFilter[i],
							},
						});
					}
					filter["tags"] = {
						$all: tagsMatchArr,
					};
				}

				if (PLD.author) {
					filter["author"] = PLD.author;
				}

				//let tspan = PLD.tspan;
				let tspan = "any";
				if (tspan !== "any") {
					let tmp11 = __GetTSpanMomentOperators(tspan);
					filter.createdAt = { $gte: moment().subtract(tmp11[0], tmp11[1]).toDate() };
				}

				let total = await Template.countDocuments(filter, { doc: 0 });
				let ret = (await Template.find(filter, PLD.fields ? PLD.fields : { doc: 0 })
					.sort(sortBy)
					.skip(skip)
					.limit(limit)
					.lean()) as TemplateType[];
				for (let i = 0; i < ret.length; i++) {
					ret[i].cron = (
						await Crontab.find({ tenant: tenant_id, tplid: ret[i].tplid }, { _id: 1 })
					).length;
				}

				ret = ret.map((x) => {
					x.tags = x.tags.filter((t: any) => t.owner === myEid);
					return x;
				});
				// console.log(
				//   `[Template Search] ${myEid} [${total}] filter: ${JSON.stringify(
				//     filter,
				//   )} sortBy: ${sortBy} limit: ${limit}\nGot ${total}`,
				// );
				// console.log(ret);
				return replyHelper.buildReturnWithEtag(
					{ total, objs: ret, version: Const.VERSION },
					latestETag,
				);
			}),
		);
	},

	TemplateRead: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				//If this is for previewing a tstpl,
				//simply construct a Template document object
				//and return it to browser.
				//no DB persistance is required.
				if (PLD.tplid.startsWith("preview_kshare_")) {
					let tmpksid = PLD.tplid.split("preview_kshare_")[1];
					const temporary_template = new Template({
						tenant: CRED.tenant._id,
						tplid: PLD.tplid,
						author: CRED.employee.eid,
						authorName: "temporary_authorname",
						ins: false,
						doc: (await KsTpl.findOne({ ksid: tmpksid }, { doc: 1 }))["doc"],
						ksid: tmpksid,
						searchable: false,
					});
					return temporary_template;
				} else {
					let filter: any = { tenant: CRED.tenant._id, tplid: PLD.tplid };
					if (PLD.bwid) {
						filter["lastUpdateBwid"] = { $ne: PLD.bwid };
					}

					let tpl = await Template.findOne(
						filter,
						PLD.withDoc ? { __v: 0 } : { __v: 0, doc: 0 },
					).lean();
					if (PLD.bwid && !tpl) {
						return "MAYBE_LASTUPDATE_BY_YOUSELF";
					} else if (!tpl) {
						throw new EmpError("TEMPLATE_NOT_FOUND", `Template ${PLD.tplid} does not exist`);
					} else {
						if (!(await SPC.hasPerm(CRED.employee, "template", tpl, "read")))
							throw new EmpError("NO_PERM", "You don't have permission to read this template");
						if (PLD.checkUpdatedAt) {
							if (tpl.updatedAt.toISOString() === PLD.checkUpdatedAt) {
								return "NOCHANGE";
							}
						}
						return tpl;
					}
				}
			}),
		);
	},

	TemplateImport: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				if (!(await SPC.hasPerm(CRED.employee, "template", "", "create")))
					throw new EmpError("NO_PERM", "You don't have permission to create template");
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let author = myEid;
				let authorName = CRED.nickname;
				let fileInfo = PLD.file;
				let doc = fs.readFileSync(fileInfo.path, "utf8");
				let myGroup = CRED.employee.group;

				let tplid = PLD.tplid;
				if (Tools.isEmpty(tplid)) {
					throw new EmpError("NO_TPLID", "Template id can not be empty");
				}
				let obj = new Template({
					tenant: tenant_id,
					tplid: tplid,
					author: author,
					authorName: authorName,
					ins: false,
					doc: doc,
					tags: [{ owner: myEid, text: "mine", group: myGroup }],
					ksid: "",
					searchable: true,
				});
				let filter: any = { tenant: tenant_id, tplid: tplid },
					update = {
						$set: {
							author: author,
							authorName: await Cache.getEmployeeName(tenant_id, author, "TemplateImport"),
							ins: false,
							doc: doc,
						},
					},
					options = { upsert: true, new: true };
				obj = await Template.findOneAndUpdate(filter, update, options);
				fs.unlink(fileInfo.path, () => {
					console.log("Unlinked temp file:", fileInfo.path);
				});
				await Cache.resetETag(`ETAG:TEMPLATES:${tenant_id}`);
				return obj;
			}),
		);
	},

	TemplateCopyFrom: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				if (!(await SPC.hasPerm(CRED.employee, "template", "", "create")))
					throw new EmpError("NO_PERM", "You don't have permission to create template");
				const tenant_id = CRED.tenant._id;
				const { fromtplid, totplid } = PLD;

				let fromDoc = await Template.findOne(
					{ tenant: tenant_id, tplid: fromtplid },
					{ _id: 0, doc: 1 },
				);
				assert(fromDoc && fromDoc.doc);
				const obj = await Template.findOneAndUpdate(
					{ tenant: tenant_id, tplid: totplid },
					{ $set: { doc: fromDoc.doc } },
					{ upsert: false, new: true },
				);
				await Cache.resetETag(`ETAG:TEMPLATES:${tenant_id}`);
				return obj;
			}),
		);
	},

	TemplateSetAuthor: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;

				let tplid = PLD.tplid;

				let newAuthorEid = PLD.author.trim();
				if (newAuthorEid.length > 0 && newAuthorEid[0] === "@")
					newAuthorEid = newAuthorEid.substring(1);
				let newOwner = await Employee.findOne({ tenant: tenant_id, eid: newAuthorEid }, { __v: 0 });
				if (!newOwner) {
					throw new EmpError("NO_USER", `Employee ${newAuthorEid} not found`);
				}

				let filter: any = { tenant: tenant_id, tplid: tplid };
				let myGroup = CRED.employee.group;
				if (myGroup !== "ADMIN") filter["author"] = myEid;
				let tpl = await Template.findOneAndUpdate(
					filter,
					{ $set: { author: newOwner.eid, authorName: newOwner.nickname } },
					{ upsert: false, new: true },
				);
				if (!tpl) {
					throw new EmpError("NO_TPL", `Not admin or owner`);
				}
				tpl = await Template.findOne({ tenant: tenant_id, tplid: tplid }, { doc: 0 });
				await Cache.resetETag(`ETAG:TEMPLATES:${tenant_id}`);

				return tpl;
			}),
		);
	},

	TemplateSetAutostop: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;

				let tplid = PLD.tplid;

				let filter: any = { tenant: tenant_id, tplid: tplid };
				let myGroup = CRED.employee.group;
				if (myGroup !== "ADMIN") filter["author"] = myEid;
				let tpl = await Template.findOneAndUpdate(
					filter,
					{ $set: { autostop: PLD.autostop } },
					{ upsert: false, new: true },
				);
				if (!tpl) {
					throw new EmpError("NO_TPL", `Not admin or owner`);
				}
				await Cache.resetETag(`ETAG:TEMPLATES:${tenant_id}`);

				await Engine.collectTplAutostop();
				return "Done";
			}),
		);
	},

	TemplateSetProp: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;

				let tplid = PLD.tplid;

				let filter: any = { tenant: tenant_id, tplid: tplid };
				let myGroup = CRED.employee.group;
				if (myGroup !== "ADMIN") filter["author"] = myEid;
				let tpl = await Template.findOneAndUpdate(
					filter,
					{
						$set: {
							pboat: PLD.pboat,
							endpoint: PLD.endpoint,
							endpointmode: PLD.endpointmode,
							freejump: PLD.freejump,
						},
					},
					{ upsert: false, new: true },
				);
				if (!tpl) {
					throw new EmpError("NO_AUTH", `Not admin or owner`);
				}
				tpl = await Template.findOne({ tenant: tenant_id, tplid: tplid }, { doc: 0 });

				return tpl;
			}),
		);
	},

	WorkflowSetPboAt: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let myGroup = CRED.employee.group;

				let wfid = PLD.wfid;

				//TODO: huge change
				let wf = await RCL.getWorkflow(
					{ tenant: tenant_id, wfid: wfid },
					"engine/handler.WorkflowSetPboAt",
				);
				if (!wf || (myGroup !== "ADMIN" && wf.starter !== myEid)) {
					throw new EmpError("NO_AUTH", `Not admin or owner`);
				}
				wf = await RCL.updateWorkflow(
					{ tenant: tenant_id, wfid: wfid },
					{ $set: { pboat: PLD.pboat } },
					"engine/handler.WorkflowSetPboAt",
				);
				await Cache.resetETag(`ETAG:WORKFLOWS:${tenant_id}`);

				return wf;
			}),
		);
	},
	WorkflowSetTitle: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let myGroup = CRED.employee.group;

				let wfid = PLD.wfid;

				let wf = await RCL.getWorkflow(
					{ tenant: tenant_id, wfid: wfid },
					"engine/handler.WorkflowSetTitle",
				);
				if (!wf || (myGroup !== "ADMIN" && wf.starter !== myEid)) {
					throw new EmpError("NO_AUTH", `Not admin or owner`);
				}
				wf = await RCL.updateWorkflow(
					{ tenant: tenant_id, wfid: wfid },
					{ $set: { wftitle: PLD.wftitle } },
					"engine/handler.WorkflowSetTitle",
				);
				await Cache.resetETag(`ETAG:WORKFLOWS:${tenant_id}`);

				return { wftitle: wf.wftitle };
			}),
		);
	},

	TemplateSetVisi: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let author = myEid;

				let tplid = PLD.tplid;
				await Cache.removeVisi(tplid);
				let tpl = await Template.findOneAndUpdate(
					{ tenant: tenant_id, author: author, tplid: tplid },
					{ $set: { visi: PLD.visi } },
					{ upsert: false, new: true },
				);
				if (!tpl) {
					console.log({ tenant: tenant_id, author: author, tplid: tplid });
					throw new EmpError("NO_TPL", "No owned template found");
				}
				tpl = await Template.findOne(
					{ tenant: tenant_id, author: author, tplid: tplid },
					{ doc: 0 },
				);

				await Engine.clearUserVisiedTemplate(tenant_id);

				await Cache.resetETag(`ETAG:TEMPLATES:${tenant_id}`);
				return tpl;
			}),
		);
	},

	TemplateClearVisi: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let author = myEid;

				let tplid = PLD.tplid;
				await Cache.removeVisi(tplid);
				await Template.findOneAndUpdate(
					{ tenant: tenant_id, author: author, tplid: tplid },
					{ $set: { visi: "" } },
					{ upsert: false, new: true },
				);

				await Engine.clearUserVisiedTemplate(tenant_id);
				await Cache.resetETag(`ETAG:TEMPLATES:${tenant_id}`);

				return "Done";
			}),
		);
	},

	TemplateDownload: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let filter: any = { tenant: CRED.tenant._id, tplid: PLD.tplid };
				let tpl = await Template.findOne(filter, { __v: 0 });
				if (!(await SPC.hasPerm(CRED.employee, "template", tpl, "read")))
					throw new EmpError("NO_PERM", "You don't have permission to read this template");
				return {
					data: tpl.doc,
					headers: {
						"cache-control": "no-cache",
						Pragma: "no-cache",
						"Access-Control-Allow-Origin": "*",
						"Content-Type": "application/xml",
						"Content-Disposition": `attachment;filename=${encodeURIComponent(PLD.tplid + ".xml")}`,
					},
				};
			}),
		);
	},

	WorkflowDownload: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let wf = await RCL.getWorkflow(
					{
						tenant: CRED.tenant._id,
						wfid: PLD.wfid,
					},
					"engine/handler.WorkflowDownload",
				);
				if (!(await SPC.hasPerm(CRED.employee, "workflow", wf, "read")))
					throw new EmpError("NO_PERM", "You don't have permission to read this workflow");
				return wf;
			}),
		);
	},

	WorkflowGetKVars: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let myEid = CRED.employee.eid;
				let kvars = Engine.getKVars(CRED.tenant._id, myEid, PLD.wfid, PLD.workid);
				return kvars;
			}),
		);
	},

	GetDelayTimers: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let timers = Engine.getDelayTimers(CRED.tenant._id, PLD.wfid);
				return timers;
			}),
		);
	},

	GetActiveDelayTimers: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let timers = Engine.getActiveDelayTimers(CRED.tenant._id, PLD.wfid);
				return timers;
			}),
		);
	},

	TeamPutDemo: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let author = PLD.author;
				let teamid = PLD.teamid;

				let team = new Team({
					tenant: tenant_id,
					author: author,
					teamid: teamid,
					tmap: { director: "steve", manager: "lucas" },
				});
				team = await team.save();
				team = await setTeamMembersName(tenant_id, team);
				return team.teamid;
			}),
		);
	},

	TeamFullInfoGet: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;

				let team = await Team.findOne({ tenant: tenant_id, teamid: req.params.teamid }, { __v: 0 });
				if (!team) {
					throw new EmpError("TEAM_NOT_FOUND", `Team ${req.params.teamid} not found`);
				}
				if (!(await SPC.hasPerm(CRED.employee, "team", team, "read")))
					throw new EmpError("NO_PERM", "You don't have permission to read this team");
				team = await setTeamMembersName(tenant_id, team);

				return team;
			}),
		);
	},

	TeamRead: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;

				let team = await Team.findOne({ tenant: tenant_id, teamid: PLD.teamid }, { __v: 0 });
				if (!(await SPC.hasPerm(CRED.employee, "team", team, "read")))
					throw new EmpError("NO_PERM", "You don't have permission to read this team");

				team = await setTeamMembersName(tenant_id, team);

				return team;
			}),
		);
	},

	TeamUpload: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let author = CRED.employee.eid;
				let teamid = PLD.teamid;
				let tmap = PLD.tmap;

				let teamFilter = { tenant: tenant_id, teamid: teamid };
				let team = await Team.findOne(teamFilter, { __v: 0 });
				if (team) {
					if (!(await SPC.hasPerm(CRED.employee, "team", team, "update")))
						throw new EmpError("NO_PERM", "You don't have permission to update this team");
				} else {
					if (!(await SPC.hasPerm(CRED.employee, "team", "", "create")))
						throw new EmpError("NO_PERM", "You don't have permission to create team");
				}
				team = await Team.findOneAndUpdate(
					teamFilter,
					{ $set: { tenant: tenant_id, author: author, teamid: teamid, tmap: tmap } },
					{ upsert: true, new: true },
				);
				team = await setTeamMembersName(tenant_id, team);
				return team;
			}),
		);
	},

	TeamImport: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let author = CRED.employee.eid;
				let fileInfo = PLD.file;
				let csv = fs.readFileSync(fileInfo.path, "utf8");

				let tmap = {};
				let lines = csv.split("\n");
				for (let i = 0; i < lines.length; i++) {
					let fields = lines[i].split(",");
					if (fields && fields.length !== 3) {
						continue;
					}
					if (tmap[fields[0]]) {
						tmap[fields[0]].push({ eid: fields[1], cn: fields[2] });
					} else {
						tmap[fields[0]] = [{ eid: fields[1], cn: fields[2] }];
					}
				}
				let teamid = PLD.teamid;
				let teamFilter = { tenant: tenant_id, teamid: teamid };
				let team = await Team.findOne(teamFilter, { __v: 0 });
				if (team) {
					if (!(await SPC.hasPerm(CRED.employee, "team", team, "update")))
						throw new EmpError("NO_PERM", "You don't have permission to update this team");
				} else {
					if (!(await SPC.hasPerm(CRED.employee, "team", "", "create")))
						throw new EmpError("NO_PERM", "You don't have permission to create team");
				}
				team = await Team.findOneAndUpdate(
					teamFilter,
					{ $set: { tenant: tenant_id, author: author, teamid: teamid, tmap: tmap } },
					{ upsert: true, new: true },
				);
				team = await setTeamMembersName(tenant_id, team);
				return team;
			}),
		);
	},

	TeamDownload: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let teamid = PLD.teamid;
				let filename = PLD.filename;
				let teamFilter = { tenant: tenant_id, teamid: teamid };
				let team = await Team.findOne(teamFilter, { __v: 0 });
				if (!(await SPC.hasPerm(CRED.employee, "team", team, "read")))
					throw new EmpError("NO_PERM", "You don't have permission to read this team");
				if (!filename) {
					filename = teamid;
				}
				let csvContent = "";
				let allRoles = Object.keys(team.tmap);
				for (let r = 0; r < allRoles.length; r++) {
					let role = allRoles[r];
					let members = team.tmap[role];
					for (let i = 0; i < members.length; i++) {
						csvContent += `${role},${members[i].eid},${members[i].cn}\n`;
					}
				}

				return {
					data: csvContent,
					headers: {
						"cache-control": "no-cache",
						Pragma: "no-cache",
						"Access-Control-Allow-Origin": "*",
						"Content-Type": "text/csv",
						"Content-Disposition": `attachment;filename=${filename}.csv`,
					},
				};
			}),
		);
	},

	TeamDeleteRoleMembers: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;

				let teamid = PLD.teamid;
				let filter: any = { tenant: tenant_id, teamid: teamid };
				let team = await Team.findOne(filter, { __v: 0 });
				if (!team) {
					throw `Team ${teamid} not found`;
				}
				if (!(await SPC.hasPerm(CRED.employee, "team", team, "update")))
					throw new EmpError("NO_PERM", "You don't have permission to change this team");
				let tmap = team.tmap;
				let role = PLD.role;

				let touched = false;
				if (tmap[role]) {
					tmap[role] = tmap[role].filter((aMember: { eid: string }) => {
						let tobeDelete = false;
						for (let i = 0; i < PLD.eids.length; i++) {
							if (PLD.eids[i] === aMember.eid) {
								tobeDelete = true;
								break;
							}
						}
						if (tobeDelete) {
							touched = true;
							return false;
						} else {
							return true;
						}
					});
				}
				if (touched) {
					team.tmap = tmap;
					team.markModified("tmap");
					team = await team.save();
				}
				team = await setTeamMembersName(tenant_id, team);
				return team;
			}),
		);
	},

	TeamAddRoleMembers: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;

				let teamid = PLD.teamid;
				let filter: any = { tenant: tenant_id, teamid: teamid };
				let team = await Team.findOne(filter, { __v: 0 });
				if (!team) {
					throw `Team ${teamid} not found`;
				}
				console.log("Team Author", team.author, typeof team.author);
				if (!(await SPC.hasPerm(CRED.employee, "team", team, "update")))
					throw new EmpError("NO_PERM", "You don't have permission to update this team");
				let tmap = team.tmap;
				let role = PLD.role;
				let members = PLD.members;

				if (tmap[role]) {
					let oldMembers = tmap[role];
					for (let m = 0; m < members.length; m++) {
						let user_existing = false;
						for (let i = 0; i < oldMembers.length; i++) {
							if (oldMembers[i]["eid"] === members[m]["eid"]) {
								user_existing = true;
								oldMembers[i]["cn"] = members[m]["cn"];
								break;
							}
						}
						if (user_existing === false) {
							oldMembers.push(members[m]);
						}
					}
					tmap[role] = oldMembers;
				} else {
					tmap[role] = members;
				}
				team.tmap = tmap;
				/*
    team = await Team.findOneAndUpdate(
      filter,
      { $set: { tmap: team.tmap } },
      { upsert: false, new: true , session}
    );
    */
				team.markModified(`tmap`);
				team = await team.save();

				team = await setTeamMembersName(tenant_id, team);
				return team;
			}),
		);
	},

	TeamCopyRole: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;

				let teamid = PLD.teamid;
				let filter: any = { tenant: tenant_id, teamid: teamid };
				let team = await Team.findOne(filter, { __v: 0 });
				if (!team) {
					throw `Team ${teamid} not found`;
				}
				if (!(await SPC.hasPerm(CRED.employee, "team", team, "update")))
					throw new EmpError("NO_PERM", "You don't have permission to update this team");
				let role = PLD.role;
				let newrole = PLD.newrole;

				team.tmap[newrole] = team.tmap[role];

				team.markModified(`tmap`);
				team = await team.save();

				team = await setTeamMembersName(tenant_id, team);
				return team;
			}),
		);
	},

	TeamSetRole: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;

				let teamid = PLD.teamid;
				let filter: any = { tenant: tenant_id, teamid: teamid };
				let team = await Team.findOne(filter, { __v: 0 });
				if (!team) {
					throw `Team ${teamid} not found`;
				}
				if (!(await SPC.hasPerm(CRED.employee, "team", team, "update")))
					throw new EmpError("NO_PERM", "You don't have permission to update this team");
				let role = PLD.role.trim();
				let members = PLD.members;

				team.tmap[role] = members;
				//Object类型的字段，需要标注为modified，在save时才会被更新
				//基础数据类型的字段无须标注已更改
				team.markModified("tmap");
				team = await team.save();
				team = await setTeamMembersName(tenant_id, team);
				return team;
			}),
		);
	},

	TeamDeleteRole: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;

				let teamid = PLD.teamid;
				let filter: any = { tenant: tenant_id, teamid: teamid };
				let team = await Team.findOne(filter, { __v: 0 });
				if (!team) {
					throw `Team ${teamid} not found`;
				}
				if (!(await SPC.hasPerm(CRED.employee, "team", team, "update")))
					throw new EmpError("NO_PERM", "You don't have permission to update this team");
				let role = PLD.role;

				delete team.tmap[role];
				team.markModified("tmap");
				team = await team.save();
				team = await setTeamMembersName(tenant_id, team);
				return team;
			}),
		);
	},

	TeamDelete: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let teamid = PLD.teamid;
				let team = await Team.findOne({ tenant: tenant_id, teamid: teamid }, { __v: 0 });
				if (!(await SPC.hasPerm(CRED.employee, "team", team, "delete")))
					throw new EmpError("NO_PERM", "You don't have permission to delete this team");

				let ret = await Team.deleteOne({ tenant: tenant_id, teamid: teamid });
				return ret;
			}),
		);
	},

	TeamSearch: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				if (!(await SPC.hasPerm(CRED.employee, "team", "", "read")))
					throw new EmpError("NO_PERM", "You don't have permission to read teams");

				let mappedField = PLD.sort_field === "name" ? "teamid" : PLD.sort_field;
				let sortBy = `${PLD.sort_order < 0 ? "-" : ""}${mappedField}`;
				let filter: any = { tenant: CRED.tenant._id };
				let skip = 0;
				if (PLD.skip) skip = PLD.skip;
				let limit = 10000;
				if (PLD.limit) limit = PLD.limit;
				if (PLD.pattern) {
					filter["teamid"] = { $regex: PLD.pattern };
				}
				let total = await Team.find(filter, { __v: 0 }).countDocuments();
				let ret = await Team.find(filter, { __v: 0 }).sort(sortBy).skip(skip).limit(limit);
				return { total, objs: ret };
			}),
		);
	},

	TeamCopyto: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				if (!(await SPC.hasPerm(CRED.employee, "team", "", "create")))
					throw new EmpError("NO_PERM", "You don't have permission to create team");

				const tenant_id = CRED.tenant._id;
				let filter: any = { tenant: tenant_id, teamid: PLD.fromid };
				let new_objid = PLD.teamid;
				let oldObj = await Team.findOne(filter, { __v: 0 });
				let newObj = new Team({
					tenant: oldObj.tenant,
					teamid: new_objid,
					author: CRED.employee.eid,
					tmap: oldObj.tmap,
				});
				newObj = await newObj.save();

				return newObj;
			}),
		);
	},

	TeamRename: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let filter: any = { tenant: tenant_id, teamid: PLD.fromid };
				let team = await Team.findOne(filter, { __v: 0 });
				if (!(await SPC.hasPerm(CRED.employee, "team", team, "update")))
					throw new EmpError("NO_PERM", "You don't have permission to update this team");
				team.teamid = PLD.teamid;
				team = await team.save();

				return team;
			}),
		);
	},

	OrgChartAddAdmin: async (req: Request, h: ResponseToolkit) => {
		return h.response(
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				expect(CRED.employee.group).to.equal("ADMIN");
				let tenant_id = CRED.tenant._id.toString();

				const existingEmployee = await Employee.findOne({
					tenant: tenant_id,
					eid: PLD.eid,
				}).lean();
				if (existingEmployee) {
					const ret = await OrgChartAdmin.findOneAndUpdate(
						{ tenant: tenant_id },
						{ $addToSet: { admins: PLD.eid } },
						{ upsert: true, new: true },
					);
					return await Cache.addCNtoEids(tenant_id, ret.admins);
				} else {
					throw new EmpError("EMPLOYEE_NOT_FOUND", `${PLD.eid} not exist`);
				}
			}),
		);
	},

	OrgChartDelAdmin: async (req: Request, h: ResponseToolkit) => {
		return h.response(
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				expect(CRED.employee.group).to.equal("ADMIN");
				let tenant_id = CRED.tenant._id.toString();
				const ret = await OrgChartAdmin.findOneAndUpdate(
					{ tenant: tenant_id },
					{ $pull: { admins: PLD.eid } },
					{ new: true },
				);
				return await Cache.addCNtoEids(tenant_id, ret.admins);
			}),
		);
	},

	OrgChartListAdmin: async (req: Request, h: ResponseToolkit) => {
		try {
			// const PLD = req.payload as any;
			const CRED = req.auth.credentials as any;
			expect(CRED.employee.group).to.equal("ADMIN");
			let tenant_id = CRED.tenant._id.toString();
			const ret = await OrgChartAdmin.findOne({ tenant: tenant_id }, { _id: 0, admins: 1 });
			return h.response(await Cache.addCNtoEids(tenant_id, ret?.admins));
		} catch (err) {
			console.error(err);
			return h.response(replyHelper.constructErrorResponse(err)).code(400);
		}
	},

	OrgChartImportExcel: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				// let myId = CRED._id;
				let myEid = CRED.employee.eid;
				let myGroup = CRED.employee.group;
				// let myDomain = CRED.tenant.domain;
				if (myGroup !== "ADMIN") {
					throw new EmpError("NOT_ADMIN", `Only Admin can import orgchart ${myEid} ${myGroup}`);
				}
				if ((await Cache.setOnNonExist("admin_" + CRED.user.account, "a", 10)) === false) {
					throw new EmpError("NO_BRUTE", "Please wait for 10 seconds");
				}
				await Parser.checkOrgChartAdminAuthorization(CRED);
				let filePath = PLD.file.path;

				//filePath = "/Users/lucas/dev/emp/team_csv/orgchart.csv";
				// let csv = fs.readFileSync(filePath, "utf8");

				const COL = { OU: 0, ACCOUNT: 1, OUCN: 1, EID: 2, POSITION: 3 };

				let orgChartArr = [];
				let currentOU = "";
				// let currentPOU = "";
				// let currentCN = "";
				let isOU = false;
				let errors = [];

				const workbook = new Excel.Workbook();
				await workbook.xlsx.readFile(filePath);
				const worksheet = workbook.getWorksheet(1);

				worksheet.eachRow(function (row, rowIndex) {
					let rowSize = row.cellCount;
					// let numValues = row.actualCellCount;

					let cols = [];
					row.eachCell(function (cell) {
						if (cell.type === 6) {
							cols.push(cell.result);
						} else {
							cols.push(cell.value);
						}
					});

					if (rowSize == 0) {
						errors.push(`line ${rowIndex + 1}: should be at least 2 columns`);
						return;
					} else if (rowSize === 1 && cols[COL.OU].length % 5 === 0) {
						cols.push(OUEID);
					}

					if (rowIndex === 0 && cols[COL.OU] === "OU") return;

					if (cols[COL.OU].length > 0 && cols[COL.OU] != "root" && cols[COL.OU].length % 5 !== 0) {
						errors.push(`line ${rowIndex + 1}: ou id ${cols[COL.OU]} format is wrong`);
						return;
					}

					//当栏位添加了连接时, cols数据是一个对象，只要把它的text取出来即可.
					for (let i = 0; i < cols.length; i++) {
						if (cols[i] && cols[i].text) {
							cols[i] = cols[i].text;
						}
					}

					currentOU = cols[COL.OU];

					let ouCN = "";
					if (cols[COL.EID]) {
						if (cols[COL.EID].trim().length > 0) {
							if (cols[COL.EID].trim() === OUEID) {
								isOU = true;
								ouCN = cols[COL.OUCN].trim();
							} else isOU = false; // eid
						}
					} else {
						isOU = true;
						ouCN = cols[COL.OUCN].trim();
					}
					orgChartArr.push({
						tenant: tenant_id,
						ou: currentOU,
						account: isOU ? CRED.tenant.owner : cols[COL.ACCOUNT],
						//如果不是OU， 则cols[COL.EID]为邮箱名
						eid: isOU ? OUEID : cols[COL.EID],
						//如果isOU，则position为空[]即可
						//如果是用户，则position为第4列（cols[COL.POSITION]）所定义的内容用：分割的字符串数组
						position: isOU ? [] : cols[COL.POSITION] ? cols[COL.POSITION].split(":") : ["staff"],
						cn: isOU ? ouCN : "toBeGottenFromEmployee",
						line: rowIndex + 1,
					});
				}); //eachRow;

				//先清空Orgchart
				await OrgChart.deleteMany({ tenant: tenant_id });
				//再把所有用户重新插入Orgchart
				//console.log(JSON.stringify(orgChartArr));
				//await OrgChart.insertMany(orgChartArr);
				let rootExist = false;
				for (let i = 0; i < orgChartArr.length; i++) {
					if (orgChartArr[i].ou === "root" && orgChartArr[i].eid === OUEID) {
						rootExist = true;
						break;
					}
				}
				if (!rootExist) {
					orgChartArr.unshift({
						tenant: tenant_id,
						ou: "root",
						eid: OUEID,
						account: CRED.tenant.owner,
						cn: "组织顶���",
						position: "",
						line: 0,
					});
				}
				for (let i = 0; i < orgChartArr.length; i++) {
					try {
						if (orgChartArr[i].eid !== OUEID) {
							const existingEmployee = await Employee.findOne({
								tenant: tenant_id,
								account: orgChartArr[i].account,
							});
							if (existingEmployee) {
								orgChartArr[i].cn = existingEmployee.nickname;
							} else {
								const existingUser = await User.findOne({ account: orgChartArr[i].account });
								if (existingUser) {
									let employee = new Employee({
										tenant: tenant_id,
										userid: existingUser._id,
										account: orgChartArr[i].account,
										group: "DOER",
										mg: "default",
										nickname: existingUser.username,
										eid: orgChartArr[i].eid,
										domain: CRED.tenant.domain,
										avatarinfo: {
											path: Tools.getDefaultAvatarPath(),
											media: "image/png",
											tag: "nochange",
										},
									});

									employee = await employee.save();
									orgChartArr[i].cn = employee.nickname;
								}
							}
						}
						await OrgChart.insertMany([orgChartArr[i]]);
					} catch (err) {
						errors.push(
							`Error: line: ${orgChartArr[i].line}: ${orgChartArr[i].ou}-${orgChartArr[i].eid}`,
						);
					}
				}
				return { ret: "ok", logs: errors };
			}),
		);
	},

	OrgChartCreateEmployeeEntry: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				await Parser.checkOrgChartAdminAuthorization(CRED);
				// let myEid = CRED.employee.eid;

				const theAccount = await User.findOne({ account: PLD.account });
				if (!theAccount) {
					throw new EmpError("ACCOUNT_NOT_FOUND", `Account ${PLD.account} does not exist`);
				}
				let theEmployee = await Employee.findOne({ tenant: tenant_id, account: PLD.account });
				if (theEmployee && PLD.cn && PLD.cn !== theEmployee.nickname) {
					await Employee.updateOne(
						{ tenant: tenant_id, account: PLD.account },
						{
							$set: { nickname: PLD.cn },
						},
						{ upsert: false, new: true },
					);
				}
				if (!theEmployee) {
					theEmployee = new Employee({
						tenant: tenant_id,
						userid: theAccount._id,
						account: theAccount.account,
						group: "DOER",
						mg: "default",
						nickname: PLD.cn,
						eid: PLD.eid,
						domain: CRED.tenant.domain,
						avatarinfo: {
							path: Tools.getDefaultAvatarPath(),
							media: "image/png",
							tag: "nochange",
						},
					});
					theEmployee = await theEmployee.save();
				}

				let theOU = await OrgChart.findOne({ tenant: tenant_id, ou: PLD.ou, eid: OUEID });
				if (!theOU) {
					throw new EmpError("OU_NOT_EXIST", `Department ${PLD.ou} does not exist`);
				}
				let newEntry = new OrgChart({
					tenant: tenant_id,
					ou: PLD.ou,
					account: PLD.account,
					eid: PLD.eid,
					cn: PLD.cn || theAccount.username,
					position: [],
				});
				await newEntry.save();
				await OrgChart.updateMany({ tenant: tenant_id, eid: PLD.eid }, { $set: { cn: PLD.cn } });
			}),
		);
	},

	OrgChartModifyEmployeeEntry: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				await Parser.checkOrgChartAdminAuthorization(CRED);
				// let myEid = CRED.employee.eid;

				await Employee.updateMany(
					{ tenant: tenant_id, eid: PLD.eid },
					{ $set: { nickname: PLD.nickname } },
				);
				await OrgChart.updateMany({ tenant: tenant_id, eid: PLD.eid }, { $set: { cn: PLD.cn } });
			}),
		);
	},

	OrgChartRemoveOneEmployeeEntry: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				await Parser.checkOrgChartAdminAuthorization(CRED);
				// let myEid = CRED.employee.eid;

				await OrgChart.deleteOne({ tenant: tenant_id, ou: PLD.ou, eid: PLD.eid });
			}),
		);
	},

	OrgChartRemoveAllEmployeeEntries: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				await Parser.checkOrgChartAdminAuthorization(CRED);
				// let myEid = CRED.employee.eid;

				await OrgChart.deleteMany({ tenant: tenant_id, eid: PLD.eid });
				return "Done";
			}),
		);
	},

	OrgChartExport: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				// const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				await Parser.checkOrgChartAdminAuthorization(CRED);
				let entries = [];

				const getEntriesUnder = async function (entries: any[], tenant_id: string, ou: string) {
					let filter: any = { tenant: tenant_id, ou: ou, eid: OUEID };
					let entry = await OrgChart.findOne(filter, { __v: 0 });
					if (entry) {
						entries.push({ ou: entry.ou, eid: OUEID, cn: entry.cn, pos: "" });

						filter = { tenant: tenant_id, ou: ou, eid: { $ne: OUEID } };
						let staffEntries = await OrgChart.find(filter, { __v: 0 });
						for (let i = 0; i < staffEntries.length; i++) {
							let usrPos = staffEntries[i].position.filter((x: string) => x !== "staff");
							entries.push({
								ou: staffEntries[i].ou,
								eid: staffEntries[i].eid,
								cn: staffEntries[i].account,
								pos: usrPos.join(":"),
							});
						}

						let ouFilter = ou === "root" ? { $regex: "^.{5}$" } : { $regex: "^" + ou + ".{5}$" };
						filter = { tenant: tenant_id, ou: ouFilter, eid: OUEID };
						let ous = await OrgChart.find(filter, { __v: 0 });
						for (let i = 0; i < ous.length; i++) {
							await getEntriesUnder(entries, tenant_id, ous[i].ou);
						}
					}
				};
				await getEntriesUnder(entries, tenant_id, "root");

				//return entries;
				//// write to a file
				const workbook = new Excel.Workbook();
				workbook.creator = "Metatocome";
				const worksheet = workbook.addWorksheet("Orgchart");
				worksheet.columns = [
					{ header: "OU", key: "ou", width: 30 },
					{ header: "Account", key: "cn", width: 30 },
					{ header: "Eid", key: "eid", width: 30 },
					{ header: "Position", key: "pos", width: 30 },
				];

				for (let i = 0; i < entries.length; i++) {
					worksheet.addRow(entries[i]);
				}

				// write to a new buffer
				await workbook.xlsx.writeFile("/Users/lucas/tst.xlsx");
				const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;

				return {
					data: buffer,
					headers: {
						"cache-control": "no-cache",
						Pragma: "no-cache",
						"Access-Control-Allow-Origin": "*",
						"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						"Content-Disposition": `attachment;filename="orgchart_${CRED.tenant.name}.xlsx"`,
					},
				};
			}),
		);
	},

	OrgChartGetAllOUs: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				// const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				await Parser.checkOrgChartAdminAuthorization(CRED);

				let entries = [];

				const getEntriesUnder = async function (
					entries: any[],
					tenant_id: string,
					ou: string,
					level: number,
				) {
					let filter: any = { tenant: tenant_id, ou: ou, eid: OUEID };
					let entry = await OrgChart.findOne(filter, { __v: 0 });
					if (entry) {
						entries.push({ ou: entry.ou, eid: OUEID, cn: entry.cn, pos: "", level: level });
						let ouFilter = ou === "root" ? { $regex: "^.{5}$" } : { $regex: "^" + ou + ".{5}$" };
						filter = { tenant: tenant_id, ou: ouFilter, eid: OUEID };
						let ous = await OrgChart.find(filter, { __v: 0 });
						for (let i = 0; i < ous.length; i++) {
							await getEntriesUnder(entries, tenant_id, ous[i].ou, level + 1);
						}
					}
				};
				await getEntriesUnder(entries, tenant_id, "root", 0);

				return entries;
			}),
		);
	},

	OrgChartCopyEmployeeEntry: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				await Parser.checkOrgChartAdminAuthorization(CRED);

				const { eid, from, to } = PLD;

				const existingEntry = await OrgChart.findOne({ tenant: tenant_id, ou: from, eid: eid });
				if (!existingEntry) {
					throw new EmpError(
						"ORGCHART_ENTRY_DOES_NOT_EXIST",
						`Orgchart entry: eid ${eid} in ou ${from} does not exist`,
					);
				}
				let newEntry = new OrgChart({
					tenant: tenant_id,
					ou: to,
					account: existingEntry.account,
					eid: eid,
					cn: existingEntry.cn,
					position: existingEntry.position,
				});
				await newEntry.save();

				return "Done";
			}),
		);
	},

	OrgChartMoveEmployeeEntry: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				await Parser.checkOrgChartAdminAuthorization(CRED);

				const { eid, from, to } = PLD;

				await OrgChart.findOneAndUpdate(
					{ tenant: tenant_id, ou: from, eid: eid },
					{ $set: { ou: to } },
					{ upsert: false, new: true },
				);
			}),
		);
	},

	OrgChartCreateOrModifyOuEntry: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				await Parser.checkOrgChartAdminAuthorization(CRED);

				const { ou, cn } = PLD;

				const oneEntry = await OrgChart.findOneAndUpdate(
					{ tenant: tenant_id, ou: ou, eid: OUEID },
					{ $set: { cn: cn } },
					{ upsert: true, new: true },
				);
				return oneEntry;
			}),
		);
	},

	OrgChartRemoveOuEntry: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				await Parser.checkOrgChartAdminAuthorization(CRED);

				const { ou } = PLD;

				await OrgChart.deleteMany({ tenant: tenant_id, ou: ou });

				return "Done";
			}),
		);
	},

	OrgChartGetLeader: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				//let myEid = CRED.employee.eid;
				let eid = PLD.eid;
				let leader = PLD.leader;
				let ret = await OrgChartHelper.getUpperOrPeerByPosition(tenant_id, eid, leader);
				return ret;
			}),
		);
	},

	/**
	 * 根据querystring查询出对应的人员
	 * querystring格式为：
	 *  ouReg1/pos1:pos2&ouReg2/pos3:pos4
	 *  ouReg是ou的regexp字符串，因此支持单部门、多部门
	 *  pos1:pos2为用：分割的岗位名称
	 *  & 表示可以多个查询合并使用
	 */

	OrgChartGetStaff: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let qstr = PLD.qstr;
				return await OrgChartHelper.getOrgStaff(tenant_id, myEid, qstr);
			}),
		);
	},

	OrgChartListOU: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				//let myEid = CRED.employee.eid;
				let top = PLD.top;
				let withTop = PLD.withTop === "yes";
				let regexp = null;
				let filter: any = {};
				filter["tenant"] = tenant_id;
				filter["eid"] = OUEID;
				if (top !== "root") {
					if (withTop) regexp = new RegExp("^" + top + ".*");
					else regexp = new RegExp("^" + top + "(.{5})+");
					filter["ou"] = regexp;
				} else {
					if (withTop === false) {
						filter["ou"] = { $ne: "root" };
					}
				}
				let ret = await OrgChart.find(filter, { cn: 1, ou: 1, _id: 0 });
				return ret;
			}),
		);
	},

	OrgChartList: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				// const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				//let myEid = CRED.employee.eid;
				let ret = await OrgChart.find({ tenant: tenant_id }, { __v: 0 });
				return ret;
			}),
		);
	},

	OrgChartExpand: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				//let myEid = CRED.employee.eid;
				let ou = PLD.ou;
				let include = PLD.include;
				let ret = [];
				let selfOu = null;
				await OrgChart.updateMany({ tenant: tenant_id, ou: /root/ }, { $set: { ou: "root" } });
				if (ou === "root")
					selfOu = await OrgChart.findOne(
						{ tenant: tenant_id, ou: /root/, eid: OUEID },
						{ __v: 0 },
					);
				else selfOu = await OrgChart.findOne({ tenant: tenant_id, ou: ou, eid: OUEID }, { __v: 0 });
				if (include) {
					selfOu && ret.push(selfOu);
				}

				//先放人
				let childrenStaffFilter = { tenant: tenant_id };
				childrenStaffFilter["eid"] = { $ne: OUEID };
				childrenStaffFilter["ou"] = ou;
				let tmp = await OrgChart.find(childrenStaffFilter, { __v: 0 }).lean();
				for (let i = 0; i < tmp.length; i++) {
					let employee = await Employee.findOne({ tenant: tenant_id, eid: tmp[i].eid }, { __v: 0 });
					if (employee && employee.active === false) {
						tmp[i].eid = employee.succeed;
					}
				}
				ret = ret.concat(tmp);

				//再放下级组织
				let childrenOuFilter = { tenant: tenant_id };
				childrenOuFilter["eid"] = OUEID;
				childrenOuFilter["ou"] =
					ou === "root" ? { $regex: "^.{5}$" } : { $regex: "^" + ou + ".{5}$" };

				tmp = await OrgChart.find(childrenOuFilter, { __v: 0 }).lean();
				ret = ret.concat(tmp);

				return ret;
			}),
		);
	},

	OrgChartAddPosition: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				//let myEid = CRED.employee.eid;
				await Parser.checkOrgChartAdminAuthorization(CRED);

				let pos = PLD.pos;
				let posArr = Parser.splitStringToArray(pos);

				let ret = await OrgChart.findOneAndUpdate(
					{ tenant: tenant_id, ou: PLD.ou, eid: PLD.eid },
					{ $addToSet: { position: { $each: posArr } } },
					{ upsert: false, new: true },
				).lean();

				//staff不要透传到前端
				ret.position = ret.position.filter((x) => x !== "staff");

				return ret;
			}),
		);
	},

	OrgChartDelPosition: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				//let myEid = CRED.employee.eid;
				// let me = await User.findOne({ _id: CRED._id }, { __v: 0 }).populate("tenant").lean();
				await Parser.checkOrgChartAdminAuthorization(CRED);

				let pos = PLD.pos;
				let posArr = Parser.splitStringToArray(pos);

				let ret = await OrgChart.findOneAndUpdate(
					{ tenant: tenant_id, ou: PLD.ou, eid: PLD.eid },
					{ $pull: { position: { $in: posArr } } },
					{ upsert: false, new: true },
				).lean();
				//staff不要透传到前端
				ret.position = ret.position.filter((x) => x !== "staff");

				return ret;
			}),
		);
	},

	/**
	 * Whether or not the current user is authorzied to manage orgchart
	 */

	OrgChartAuthorizedAdmin: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const CRED = req.auth.credentials as any;
				const PLD = req.payload as any;
				await Parser.checkOrgChartAdminAuthorization(CRED);

				if (PLD.eid && PLD.eid !== CRED.employee.eid) {
					let tenant = null;
					let user = null;
					let employee = await Employee.findOne({
						tenant: CRED.tenant._id,
						eid: PLD.eid,
						active: true,
					});
					if (employee) {
						user = await User.findOne({ account: employee.account }).lean();
					}
					tenant = user ? await Tenant.findOne({ _id: user.tenant }).lean() : null;
					if (user && employee && tenant) {
						await Parser.checkOrgChartAdminAuthorization({
							user,
							employee,
							tenant,
						});
					} else {
						throw new EmpError("EID_NOT_EXIST", `Employee ${PLD.eid} does not exist.`);
					}
				} else {
					return "true";
				}
			}),
		);
	},

	GetCallbackPoints: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				// const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let filter: any = { tenant: tenant_id };
				filter = lodash.merge(filter, req.payload);
				return await CbPoint.find(filter, {
					_id: 0,
					tenant: 1,
					tplid: 1,
					wfid: 1,
					nodeid: 1,
					workid: 1,
				});
			}),
		);
	},

	GetLatestCallbackPoint: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				// const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let filter: any = { tenant: tenant_id };
				filter = lodash.merge(filter, req.payload);
				let ret = await CbPoint.find(filter, {
					_id: 1,
					tenant: 1,
					tplid: 1,
					wfid: 1,
					nodeid: 1,
					workid: 1,
				});
				if (ret.length === 0) {
					return null;
				} else {
					return ret[ret.length - 1];
				}
			}),
		);
	},

	OldDoCallback: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let filter: any = { tenant: tenant_id };

				if (PLD.cbp.tplid) filter.tplid = PLD.cbp.tplid;
				if (PLD.cbp.wfid) filter.wfid = PLD.cbp.wfid;
				if (PLD.cbp.nodeid) filter.nodeid = PLD.cbp.nodeid;
				if (PLD.cbp.workid) filter.workid = PLD.cbp.workid;
				let cbp = await CbPoint.findOne(filter, {
					tenant: 1,
					tplid: 1,
					wfid: 1,
					nodeid: 1,
					workid: 1,
				});
				let options: any = {};
				options.route = PLD.route ? PLD.route : "DEFAULT";
				if (lodash.isEmpty(PLD.kvars) === false) options.kvars = PLD.kvars;
				if (lodash.isEmpty(PLD.atts) === false) options.atts = PLD.atts;
				let ret = await Engine.doCallback(tenant_id, cbp, options);
				return ret;
			}),
		);
	},

	DoCallback: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let filter: any = { tenant: tenant_id };

				if (PLD.cbpid) filter._id = PLD.cbpid;
				let cbp = await CbPoint.findOne(filter, {
					_id: 1,
					tenant: 1,
					tplid: 1,
					wfid: 1,
					nodeid: 1,
					workid: 1,
				});
				let options: any = {};
				options.decision = PLD.decision ? PLD.decision : "DEFAULT";
				if (lodash.isEmpty(PLD.kvars) === false) options.kvars = PLD.kvars;
				await Engine.doCallback(tenant_id, cbp, options);
				return cbp._id.toString();
			}),
		);
	},

	MySystemPerm: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let instance = null;
				if (PLD.instance_id) {
					switch (PLD.what) {
						case "template":
							instance = await Template.findOne({ _id: PLD.instance_id }, { __v: 0 });
							break;
						case "work":
							instance = await Todo.findOne({ _id: PLD.instance_id }, { __v: 0 });
							break;
						case "workflow":
							//TODO: need huge optimization
							instance = await Workflow.findOne({ _id: PLD.instance_id }, { __v: 0 });
							break;
						case "team":
							instance = await Team.findOne({ _id: PLD.instance_id }, { __v: 0 });
							break;
						default:
							throw new EmpError("PERM_OBJTYPE_ERROR", `Object type ${PLD.what} not supported`);
					}
				}
				//TODO： 性能天坑
				let perm = await SPC.hasPerm(
					CRED.employee,
					PLD.what,
					PLD.instance_id ? instance : null,
					PLD.op,
				);

				return perm;
			}),
		);
	},

	/**
	 * Get member's permission
	 */

	MemberSystemPerm: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const myGroup = CRED.employee.group;
				let instance = null;
				let member_eid = PLD.eid;
				const tenant_id = CRED.tenant._id;
				let member = (await Employee.findOne(
					{ eid: member_eid, tenant: tenant_id },
					{ __v: 0 },
				)) as EmployeeType;
				if (!member) {
					throw new EmpError("MEMBER_NOT_FOUND", `member ${member_eid} not found in current org`);
				}
				if (myGroup !== "ADMIN") {
					throw new EmpError(
						"NO_PERM",
						"You don't have permission to check this member's permission",
					);
				}
				if (PLD.instance_id) {
					switch (PLD.what) {
						case "template":
							instance = await Template.findOne({ _id: PLD.instance_id }, { __v: 0 });
							break;
						case "work":
							instance = await Todo.findOne({ _id: PLD.instance_id }, { __v: 0 });
							break;
						case "workflow":
							//TODO: need huge optimization
							instance = await Workflow.findOne({ _id: PLD.instance_id }, { __v: 0 });
							break;
						case "team":
							instance = await Team.findOne({ _id: PLD.instance_id }, { __v: 0 });
							break;
						default:
							throw new EmpError("PERM_OBJTYPE_ERROR", `Object type ${PLD.what} not supported`);
					}
				}
				let perm = await SPC.hasPerm(member, PLD.what, PLD.instance_id ? instance : null, PLD.op);

				return perm;
			}),
		);
	},

	CommentWorkflowLoad: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				// let myEid = CRED.employee.eid;
				let wfid = PLD.wfid;
				// let todoid = PLD.todoid;

				let ifNoneMatch = req.headers["if-none-match"];
				let latestETag = Cache.getETag(`ETAG:WF:FORUM:${tenant_id}:${wfid}`);
				if (ifNoneMatch && latestETag && ifNoneMatch === latestETag) {
					return replyHelper.build304([], latestETag);
				}

				let comments = await CommentEngine.loadWorkflowComments(tenant_id, wfid);
				return replyHelper.buildReturnWithEtag(comments, latestETag);
			}),
		);
	},

	CommentDelete: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let deleteFollowing = async (_tenant: string, objid: Mongoose.Types.ObjectId) => {
					let filter: any = { tenant: tenant_id, objid: objid };
					let cmts = await Comment.find(filter, { _id: 1 });
					for (let i = 0; i < cmts.length; i++) {
						await deleteFollowing(tenant_id, cmts[i]._id);
					}
					await Comment.deleteOne(filter);
				};
				const tenant_id = CRED.tenant._id;
				let commentid = PLD.commentid;
				let filter: any = { tenant: tenant_id, _id: commentid };
				//Find the comment to be deleted.
				let cmt = await Comment.findOne(filter, { __v: 0 });
				//Find the objtype and objid of it's parent
				// let objtype = cmt.objtype;
				// let objid = cmt.objid;

				//Delete childrens recursively.
				await deleteFollowing(tenant_id, cmt._id);
				//Delete this one
				await Comment.deleteOne(filter);

				await Cache.resetETag(`ETAG:FORUM:${tenant_id}`);
				await Cache.resetETag(`ETAG:WF:FORUM:${tenant_id}:${cmt.context.wfid}`);
				return { thisComment: cmt };
			}),
		);
	},

	CommentDeleteBeforeDays: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let beforeDays = PLD.beforeDays;
				let filter: any = {
					tenant: tenant_id,
					toWhom: myEid,
					createdAt: {
						$lte: new Date(new Date().getTime() - beforeDays * 24 * 60 * 60 * 1000).toISOString(),
					},
				};
				let cmts = await Comment.find(filter, { context: 1 });
				await Comment.deleteMany(filter);

				for (let i = 0; i < cmts.length; i++) {
					if (cmts[i] && cmts[i].context && cmts[i].context.wfid)
						await Cache.resetETag(`ETAG:WF:FORUM:${tenant_id}:${cmts[i].context.wfid}`);
				}
				await Cache.resetETag(`ETAG:FORUM:${tenant_id}`);

				return "Done";
			}),
		);
	},

	CommentDelNewTimeout: async (_req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				return { timeout: Const.DEL_NEW_COMMENT_TIMEOUT };
			}),
		);
	},

	CommentAddForBiz: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				if (PLD.objtype === "TODO") {
					let todo = await Todo.findOne({ tenant: tenant_id, todoid: PLD.objid }, { __v: 0 });
					if (todo) {
						let thisComment = await CommentEngine.postCommentForTodo(
							tenant_id,
							myEid,
							todo,
							PLD.content,
						);
						let comments = await CommentEngine.getComments(
							tenant_id,
							"TODO",
							PLD.objid,
							Const.COMMENT_LOAD_NUMBER,
						);

						await Cache.resetETag(`ETAG:WF:FORUM:${tenant_id}:${thisComment.context.wfid}`);
						await Cache.resetETag(`ETAG:FORUM:${tenant_id}`);
						return { comments, thisComment };
					}
				}

				return null;
			}),
		);
	},

	CommentAddForComment: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let thisComment = await CommentEngine.postCommentForComment(
					tenant_id,
					myEid,
					PLD.cmtid, //被该条评论所评论的评论ID
					PLD.content,
					PLD.threadid,
				);
				let comments = await CommentEngine.getComments(
					tenant_id,
					"COMMENT",
					PLD.cmtid,
					Const.COMMENT_LOAD_NUMBER,
				);

				await Cache.resetETag(`ETAG:WF:FORUM:${tenant_id}:${thisComment.context.wfid}`);
				await Cache.resetETag(`ETAG:FORUM:${tenant_id}`);

				return { comments, thisComment };
			}),
		);
	},

	//
	//Comment缺省加载3个，前端请求加载更多，

	CommentLoadMorePeers: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let currentlength = PLD.currentlength;
				//找到当前comment
				let thisCmt = await Comment.findOne({ tenant: tenant_id, _id: PLD.cmtid }, { __v: 0 });
				if (thisCmt) {
					//寻找当前Comment的父对象更多的comment
					let comments = await CommentEngine.getComments(
						tenant_id,
						thisCmt.objtype,
						thisCmt.objid,
						//如果小于0，则不限制加载个数，否则，多加载三个即可
						currentlength < 0 ? -1 : Const.COMMENT_LOAD_NUMBER,
						currentlength < 0 ? -1 : currentlength,
					);

					return comments;
				}
			}),
		);
	},

	CommentThumb: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let upOrDown = PLD.thumb;
				let cmtid = PLD.cmtid;
				//找到当前comment
				let thisComment = await Comment.findOne({ tenant: tenant_id, _id: cmtid }, { context: 1 });
				if (thisComment) {
					await Thumb.deleteMany({ tennant: tenant_id, cmtid: cmtid, who: myEid });
					let tmp = new Thumb({ tenant: tenant_id, cmtid: cmtid, who: myEid, upordown: upOrDown });
					tmp = await tmp.save();
					let upnum = await Thumb.countDocuments({
						tenant: tenant_id,
						cmtid: cmtid,
						upordown: "UP",
					});
					let downnum = await Thumb.countDocuments({
						tenant: tenant_id,
						cmtid: cmtid,
						upordown: "DOWN",
					});

					await Cache.resetETag(`ETAG:WF:FORUM:${tenant_id}:${thisComment.context.wfid}`);
					await Cache.resetETag(`ETAG:FORUM:${tenant_id}`);
					return { upnum, downnum };
				} else {
					throw new EmpError("CMT_NOT_FOUND", "Comment not found");
				}
			}),
		);
	},

	CommentSearch: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let pageSer = PLD.pageSer;
				let pageSize = PLD.pageSize;
				let category = PLD.category;
				let q = PLD.q;

				let ifNoneMatch = req.headers["if-none-match"];
				let latestETag = Cache.getETag(`ETAG:FORUM:${tenant_id}`);
				if (ifNoneMatch && latestETag && ifNoneMatch === latestETag) {
					return replyHelper.build304({}, latestETag);
				}

				let wfIds = [];
				let wfIamVisied = [];
				let wfIStarted = [];
				let wfIamIn = [];
				let wfIamQed = [];

				//let myUid = Tools.getEmailPrefix(myEid);
				let myUid = myEid;
				let iamAdmin = CRED.employee.group === "ADMIN";

				let cmts = [];
				let total = 0;

				// let _filter: any = { tenant: tenant_id };

				//I_AM_IN 包含 I_STARTED
				if (category.includes("I_AM_IN")) {
					category.push("I_STARTED");
					category = [...new Set(category)];
				}
				//I_AM_QED 包含 I_STARTED和I_AM_IN
				if (category.includes("I_AM_QED")) {
					category.push("I_STARTED");
					category.push("I_AM_IN");
					category = [...new Set(category)];
				}
				if (category.includes("ALL_VISIED")) {
					if (!iamAdmin) {
						let myBannedTemplatesIds = await Engine.getUserBannedTemplate(tenant_id, myEid);
						wfIamVisied = await Workflow.find(
							{ tenant: tenant_id, tplid: { $nin: myBannedTemplatesIds } },
							{ _id: 0, wfid: 1 },
						).lean();
						wfIamVisied = wfIamVisied.map((x) => x.wfid);
					}
				}
				if (category.includes("I_STARTED")) {
					wfIStarted = await Workflow.find(
						{ tenant: tenant_id, starter: myEid },
						{ _id: 0, wfid: 1 },
					).lean();

					wfIStarted = wfIStarted.map((x) => x.wfid);
				}
				if (category.includes("I_AM_IN")) {
					let todoGroup = await Todo.aggregate([
						{ $match: { tenant: tenant_id, doer: myEid } },
						{ $group: { _id: "$wfid", count: { $sum: 1 } } },
					]);
					wfIamIn = todoGroup.map((x) => x._id);
				}
				if (category.includes("I_AM_QED")) {
					let commentGroup = await Comment.aggregate([
						{
							$match: { people: myUid },
						},
						{ $group: { _id: "$context.wfid", count: { $sum: 1 } } },
					]);
					wfIamQed = commentGroup.map((x) => x._id);
					// 在查找 comment时，  I_AM_QED 缺省需要包含 I_STARTED
				}

				//  对管理员来说，如果是全部课件，则直接搜索所有的comment
				if (iamAdmin && category.length === 1 && category[0] === "ALL_VISIED") {
					let filter_all = q
						? {
								tenant: tenant_id,
								objtype: "TODO",
								content: new RegExp(`.*${q}.*`),
						  }
						: {
								tenant: tenant_id,
								objtype: "TODO",
						  };
					total = await Comment.countDocuments(filter_all);
					cmts = await Comment.find(filter_all, { __v: 0 })
						.sort("-updatedAt")
						.skip(pageSer * 20)
						.limit(pageSize)
						.lean();
				} else {
					//非管理员，要返回这些workflow中的comments
					//wfIds = [...wfIamVisied, ...wfIStarted, ...wfIamIn, ...wfIamQed];
					wfIds = [...wfIStarted, ...wfIamIn];
					wfIds = [...new Set(wfIds)];
					let filter_wfid = q
						? {
								tenant: tenant_id,
								objtype: "TODO",
								"context.wfid": { $in: wfIds },
								content: new RegExp(`.*${q}.*`),
						  }
						: {
								tenant: tenant_id,
								objtype: "TODO",
								"context.wfid": { $in: wfIds },
						  };
					total = await Comment.countDocuments(filter_wfid);
					cmts = await Comment.find(filter_wfid, { __v: 0 })
						.sort("-updatedAt")
						.skip(pageSer * 20)
						.limit(pageSize)
						.lean();
					let cmtsIds = cmts.map((x) => x._id);
					console.log(cmtsIds);

					let filter_people = q
						? {
								tenant: tenant_id,
								_id: { $nin: cmtsIds },
								objtype: "TODO",
								people: myUid,
								content: new RegExp(`.*${q}.*`),
						  }
						: {
								tenant: tenant_id,
								_id: { $nin: cmtsIds },
								objtype: "TODO",
								people: myUid,
						  };

					let qedComments = await Comment.find(filter_people, { __v: 0 })
						.sort("-updatedAt")
						.skip(pageSer * 20)
						.limit(pageSize)
						.lean();
					total += qedComments.length;
					cmts = cmts.concat(qedComments);
				}

				for (let i = 0; i < cmts.length; i++) {
					cmts[i].whoCN = await Cache.getEmployeeName(tenant_id, cmts[i].who, "CommentSearch");
					if (cmts[i].context) {
						let todo = await Todo.findOne(
							{
								tenant_id,
								wfid: cmts[i].context.wfid,
								todoid: cmts[i].context.todoid,
							},
							{ _id: 0, title: 1, doer: 1 },
						);
						if (todo) {
							cmts[i].todoTitle = todo.title;
							cmts[i].todoDoer = todo.doer;
							cmts[i].todoDoerCN = await Cache.getEmployeeName(
								tenant_id,
								todo.doer,
								"CommentSearch",
							);
						}
					}
					cmts[i].upnum = await Thumb.countDocuments({
						tenant_id,
						cmtid: cmts[i]._id,
						upordown: "UP",
					});
					cmts[i].downnum = await Thumb.countDocuments({
						tenant_id,
						cmtid: cmts[i]._id,
						upordown: "DOWN",
					});
					let tmpret = await Tools.splitMarked(tenant_id, cmts[i]);
					cmts[i].mdcontent = tmpret.mdcontent;
					cmts[i].mdcontent2 = tmpret.mdcontent2;

					if (cmts[i].context) {
						cmts[i].latestReply = await Comment.find(
							{
								tenant: tenant_id,
								objtype: "COMMENT",
								"context.todoid": cmts[i].objid,
							},
							{ __v: 0 },
						)
							.sort("-updatedAt")
							.limit(1)
							.lean();
						for (let r = 0; r < cmts[i].latestReply.length; r++) {
							cmts[i].latestReply[r].whoCN = await Cache.getEmployeeName(
								tenant_id,
								cmts[i].latestReply[r].who,
								"commentSearch",
							);
							cmts[i].latestReply[r].mdcontent2 = (
								await Tools.splitMarked(tenant_id, cmts[i].latestReply[r])
							)["mdcontent2"];
						}
					} else {
						cmts[i].latestReply = [];
					}
				}

				////��空 被���价的 TODO和comment已不存在的comment
				let tmp = await Comment.find({ tenant: tenant_id }, { __v: 0 });
				for (let i = 0; i < tmp.length; i++) {
					if (tmp[i].objtype === "TODO") {
						let theTodo = await Todo.findOne(
							{ tenant: tenant_id, todoid: tmp[i].objid },
							{ __v: 0 },
						);
						if (!theTodo) {
							console.log("TODO", tmp[i].objid, "not found");
							await Comment.deleteOne({ tenant: tenant_id, _id: tmp[i]._id });
						}
					} else {
						let theComment = await Comment.findOne({ _id: tmp[i].objid }, { __v: 0 });
						if (!theComment) {
							await Comment.deleteOne({ tenant: tenant_id, _id: tmp[i]._id });
							console.log("CMNT", tmp[i].objid, "not found");
						}
					}
				}
				//修补towhom
				tmp = await Comment.find({ tenant: tenant_id, towhom: { $exists: false } }, { __v: 0 });
				for (let i = 0; i < tmp.length; i++) {
					if (tmp[i].towhom) continue;
					if (tmp[i].objtype === "TODO") {
						let theTodo = await Todo.findOne(
							{ tenant: tenant_id, todoid: tmp[i].objid },
							{ __v: 0 },
						);
						if (!theTodo) {
							console.log("TODO", tmp[i].objid, "not found");
							await Comment.deleteOne({ tenant: tenant_id, _id: tmp[i]._id });
						} else {
							console.log("set towhom to", theTodo.doer);
							await Comment.findOneAndUpdate(
								{ _id: tmp[i]._id },
								{ $set: { towhom: theTodo.doer } },
								{ upsert: false, new: true },
							);
						}
					} else {
						let theComment = await Comment.findOne({ _id: tmp[i].objid }, { __v: 0 });
						if (!theComment) {
							await Comment.deleteOne({ tenant: tenant_id, _id: tmp[i]._id });
							console.log("CMNT", tmp[i].objid, "not found");
						} else {
							console.log("set towhom to", theComment.who);
							await Comment.findOneAndUpdate(
								{ _id: tmp[i]._id },
								{ $set: { towhom: theComment.who } },
								{ upsert: false, new: true },
							);
						}
					}
				}
				return replyHelper.buildReturnWithEtag({ total, cmts }, latestETag);
			}),
		);
	},

	/*Toggle allow discuss for template */

	CommentToggle: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let myGroup = CRED.employee.group;
				let objtype = PLD.objtype;
				let objid = PLD.objid;
				let ret = null;
				let filter: any = {};
				switch (objtype) {
					case "template":
						filter = {
							tenant: tenant_id,
							tplid: objid,
						};
						if (myGroup !== "ADMIN") {
							filter.owner = myEid;
						}
						let tpl = await Template.findOneAndUpdate(
							filter,
							[{ $set: { allowdiscuss: { $eq: [false, "$allowdiscuss"] } } }],
							{ upsert: false, new: true },
						);
						ret = tpl.allowdiscuss;
						break;
					case "workflow":
						filter = {
							tenant: tenant_id,
							wfid: objid,
						};
						if (myGroup !== "ADMIN") {
							filter.starter = myEid;
						}
						let aWf = await RCL.updateWorkflow(
							filter,
							[{ $set: { allowdiscuss: { $eq: [false, "$allowdiscuss"] } } }],
							"engine/handler.CommentToggle",
						);
						ret = aWf.allowdiscuss;
						break;
					case "todo":
						filter = {
							tenant: tenant_id,
							todoid: objid,
						};
						if (myGroup !== "ADMIN") {
							filter.doer = myEid;
						}
						let aTodo = await Todo.findOneAndUpdate(
							filter,
							[{ $set: { allowdiscuss: { $eq: [false, "$allowdiscuss"] } } }],
							{ upsert: false, new: true },
						);
						ret = aTodo.allowdiscuss;
						break;
					default:
						throw new EmpError("UNSUPPORTED", "Objtype is not supported");
				}
				if (ret === null) {
					throw new EmpError(
						"PROC_FAILED",
						"Return value of discuss togglling should be either true or false",
					);
				}

				return ret;
			}),
		);
	},

	MustHavePboToggle: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let myGroup = CRED.employee.group;
				let objtype = PLD.objtype;
				let objid = PLD.objid;
				let ret = null;
				let filter: any = {};
				switch (objtype) {
					case "template":
						filter = {
							tenant: tenant_id,
							tplid: objid,
						};
						if (myGroup !== "ADMIN") {
							filter.owner = myEid;
						}
						let tpl = await Template.findOneAndUpdate(
							filter,
							[{ $set: { musthavepbo: { $eq: [false, "$musthavepbo"] } } }],
							{ upsert: false, new: true },
						);
						ret = tpl.musthavepbo;
						break;
					default:
						throw new EmpError("UNSUPPORTED", `${objtype} is not supported`);
				}
				if (ret === null) {
					throw new EmpError(
						"PROC_FAILED",
						"Return value of musthavepbo togglling should be either true or false",
					);
				}

				return ret;
			}),
		);
	},

	TagDel: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let objtype = PLD.objtype;
				let objid = PLD.objid;
				let text = PLD.text.trim();

				// let tagToDel = { owner: myEid, text: text };

				let existingTags = [];
				if (objtype === "template") {
					let searchFilter: any = { tenant: tenant_id, tplid: objid };
					let tmp = await Template.findOneAndUpdate(
						searchFilter,
						{
							$pull: {
								tags: {
									owner: myEid,
									text: text,
								},
							},
						},
						{ upsert: false, new: true },
					);
					existingTags = tmp.tags;
					existingTags = existingTags.filter((x) => {
						return x.owner === myEid;
					});
				}

				return existingTags;
			}),
		);
	},

	TagAdd: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let myGroup = CRED.employee.group;
				let objtype = PLD.objtype;
				let objid = PLD.objid;
				let text = PLD.text;

				let obj = null;
				let existingTags = [];
				let existingText = [];

				//先把text拆开
				let inputtedTagTexts = Parser.splitStringToArray(text);
				//去除空tag
				inputtedTagTexts = inputtedTagTexts.filter((x: string) => {
					return x.trim().length > 0;
				});

				//获得当前用户已经做过的tag和text
				if (objtype === "template") {
					let searchCondition: any = { tenant: tenant_id, tplid: objid };
					obj = await Template.findOne(searchCondition, { __v: 0 });
				}
				existingTags = obj.tags;
				//
				///////////////////////////////////////
				//清理exitingTags中可能存在的空字符串
				let cleanedExistingTags = existingTags.filter((x) => {
					return x.text.trim().length > 0;
				});
				//如果发现空字符串，将新的数组（不包含空字符串）重新写入数据库
				//如此，实现每次在添加新Tag的时候，自动清理空字符串
				if (cleanedExistingTags.length < existingTags.length) {
					obj.tags = cleanedExistingTags;
					obj = await obj.save();
					existingTags = obj.tags;
				}
				///////////////////////////////////////
				//
				//过滤出当前用户的数据
				existingTags = existingTags.filter((x) => {
					return x.owner === myEid;
				});
				existingText = existingTags.map((x) => x.text);
				//从用户新录入的tag文本中去除已经存在的
				inputtedTagTexts = lodash.difference(inputtedTagTexts, existingText);
				//转换为tag对象
				let tagsToAdd = inputtedTagTexts.map((x: string) => {
					return { owner: myEid, text: x, group: myGroup };
				});

				if (tagsToAdd.length > 0) {
					if (objtype === "template") {
						let searchCondition: any = { tenant: tenant_id, tplid: objid };
						//将新添加的放进数组
						obj = await Template.findOneAndUpdate(
							searchCondition,
							{ $addToSet: { tags: { $each: tagsToAdd } } },
							{ upsert: false, new: true },
						);
					}

					//如果有添加新的，就需要重新取出所有存在的tags
					existingTags = obj.tags;
					//过滤当前用户的tag
					existingTags = existingTags.filter((x) => {
						return x.owner === myEid;
					});
				}

				//返回当前用户的tags
				return existingTags;
			}),
		);
	},

	TagList: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let objtype = PLD.objtype;
				let objid = PLD.objid;

				let ret = [];
				if (objtype === "template") {
					let filter: any = { tenant: tenant_id };
					if (Tools.hasValue(objid)) {
						filter = { tenant: tenant_id, tplid: objid, "tags:owner": myEid };
					} else {
						filter = { tenant: tenant_id, "tags.owner": myEid };
					}
					let objs = await Template.find(filter, { __v: 0 });
					for (let i = 0; i < objs.length; i++) {
						let tmp = objs[i].tags
							.filter((x) => {
								return x.owner === myEid;
							})
							.map((x) => {
								return x.text;
							});

						ret = lodash.union(ret, tmp);
					}
				}

				ret = lodash.sortedUniq(ret);

				return ret;
			}),
		);
	},

	//Org level tags are set in setting page

	TagListOrg: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;

				let ret = (await Cache.getOrgTags(tenant_id)).split(";");

				console.log("TagListOrgs", ret);
				return ret;
			}),
		);
	},

	GetTodosByWorkid: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;

				return await Engine.getTodosByWorkid(tenant_id, PLD.workid, PLD.full);
			}),
		);
	},

	TodoSetDoer: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				// let myEid = CRED.employee.eid;
				let myGroup = CRED.employee.group;
				if (myGroup !== "ADMIN") {
					throw new EmpError("NOT_ADMIN", "Only Administrators can change doer");
				}
				let todoid = PLD.todoid;
				let doer = PLD.doer;
				let newDoer = PLD.newdoer;
				let forAll = PLD.forall;
				if (newDoer[0] === "@") newDoer = newDoer.substring(1);
				if (newDoer.indexOf("@") > 0) newDoer = newDoer.substring(0, newDoer.indexOf("@"));
				let newDoerEid = newDoer;
				let newDoerObj = await Employee.findOne({ tenant: tenant_id, eid: newDoerEid }, { __v: 0 });
				if (!newDoerObj) {
					throw new EmpError("NO_EMPLOYEE", `Employee ${newDoerEid} not found`);
				}

				let filter: any = { tenant: tenant_id, todoid: todoid, doer: doer, status: "ST_RUN" };
				if (forAll) {
					filter = { tenant: tenant_id, doer: doer, status: "ST_RUN" };
				}

				await Todo.updateMany(filter, { $set: { doer: newDoerEid } });

				return {
					newdoer: newDoerEid,
					newcn: await Cache.getEmployeeName(tenant_id, newDoerEid, "TodoSetDoer"),
				};
			}),
		);
	},

	ListSet: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let payloadItems = PLD.items;
				payloadItems = payloadItems.replace("；", ",");
				payloadItems = payloadItems.replace("，", ";");
				payloadItems = Parser.splitStringToArray(payloadItems).join(";");
				let filter: any = { tenant: tenant_id, name: PLD.name };
				let list = await List.findOne(filter, { __v: 0 });
				if (list && list.author !== myEid) {
					throw new EmpError("NO_PERM", "List exists but it's not your owned list");
				} else if (!list) {
					list = new List({
						tenant: tenant_id,
						author: myEid,
						name: PLD.name,
						entries: [
							{
								key: PLD.key,
								items: payloadItems,
							},
						],
					});
					list = await list.save();
				} else {
					let theKey = PLD.key;
					let theEntry = {};
					let allKeys = list.entries.map((x) => x.key);
					//如果Default不存在
					if (allKeys.includes("Default") === false) {
						theKey = "Default";
						theEntry = {
							$each: [{ key: theKey, items: payloadItems }],
							$position: 0, //把Default插入到第一个位置
						};
						filter = { tenant: tenant_id, name: PLD.name, author: myEid };
						list = await List.findOneAndUpdate(
							filter,
							{
								$push: {
									entries: theEntry,
								},
							},
							{ upsert: false, new: true },
						);
					} else if (allKeys.includes(theKey) === false) {
						//如果key不存在
						theEntry = { key: theKey, items: payloadItems };
						filter = { tenant: tenant_id, name: PLD.name, author: myEid };
						list = await List.findOneAndUpdate(
							filter,
							{
								//则推出这个Key
								$push: {
									entries: theEntry,
								},
							},
							{ upsert: false, new: true },
						);
					} else {
						//否则,这个Key存在
						filter = { tenant: tenant_id, name: PLD.name, author: myEid, "entries.key": theKey };
						//则修改它的items值
						list = await List.findOneAndUpdate(
							filter,
							{
								$set: {
									"entries.$.items": payloadItems,
								},
							},
							{ upsert: false, new: true },
						);
					}
				}
				return list;
			}),
		);
	},

	ListChangeName: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let newName = PLD.newName;
				let filter: any = { tenant: tenant_id, name: PLD.name, author: myEid };
				await List.findOneAndUpdate(
					filter,
					{ $set: { name: newName } },
					{ upsert: false, new: true },
				);
				return "Done";
			}),
		);
	},

	ListList: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				// const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;

				return await List.find({ tenant: tenant_id }, { __v: 0 }).lean();
			}),
		);
	},

	ListDelListOrKey: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let filter: any = {};
				if (PLD.key) {
					filter = { tenant: tenant_id, author: myEid, name: PLD.name };
					await List.findOneAndUpdate(
						filter,
						{ $pull: { entries: { key: PLD.key } } },
						{ upsert: false, new: true },
					);
				} else {
					filter = { tenant: tenant_id, author: myEid, name: PLD.name };
					await List.deleteOne(filter);
				}

				return "Done";
			}),
		);
	},

	ListGetItems: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let key = "Default";
				if (Tools.isEmpty(PLD.key)) {
					key = "Default";
				} else {
					key = PLD.key;
				}
				let filter: any = {
					tenant: tenant_id,
					name: PLD.name,
					entries: { $elemMatch: { key: key } },
				};

				let ret = await List.findOne(filter, { "entries.$": 1 }).lean();
				let items = "";
				if (ret && ret.entries) {
					items = ret.entries[0].items;
				}

				return Parser.splitStringToArray(items);
			}),
		);
	},

	CodeTry: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let retMsg = { message: "" };
				let code = PLD.code;
				retMsg.message = await Engine.runCode(
					tenant_id,
					"codetry",
					"codetry",
					myEid,
					{},
					{},
					code,
					"", //callbackid
					true, //isTry = true
				);

				return retMsg;
			}),
		);
	},

	DemoAPI: async (_req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				// const PLD = req.payload as any;
				return {
					intv: 100,
					stringv: "hello",
				};
			}),
		);
	},

	DemoPostContext: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				// const CRED = req.auth.credentials as any;
				let receiver = process.env.DEMO_ENDPOINT_EMAIL_RECEIVER;
				receiver ||= "lucas@xihuanwu.com";
				console.log("Mailman to ", receiver);

				Mailman.SimpleSend(receiver, "", "", "Demo Post Context", JSON.stringify(PLD.mtcdata));
				return "Received";
			}),
		);
	},

	//////////////////////////////////////////////////
	// FilePond的后台接收代码，
	// 文件上传大小在endpoints.js中进行设置
	//////////////////////////////////////////////////

	FilePondProcess: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let filepond = PLD.filepond;
				let ids = "";
				for (let i = 0; i < filepond.length; i++) {
					if (filepond[i].path && filepond[i].headers) {
						let contentType = filepond[i]["headers"]["Content-Type"];
						let realName = filepond[i]["filename"];
						let serverId = IdGenerator();
						serverId = serverId.replace(/-/g, "");
						//serverId = Buffer.from(serverId, "hex").toString("base64");
						let pondServerFile = Tools.getPondServerFile(tenant_id, myEid, serverId);
						if (fs.existsSync(pondServerFile.folder) === false)
							fs.mkdirSync(pondServerFile.folder, { recursive: true });
						fs.renameSync(filepond[i].path, pondServerFile.fullPath);
						let newAttach = new PondFile({
							tenant: tenant_id,
							serverId: serverId,
							realName: realName,
							contentType: contentType,
							author: myEid,
						});
						newAttach = await newAttach.save();
						console.log("Upload", filepond[i].filename, "to", pondServerFile.fullPath);
						ids = serverId;
					}
				}
				return ids;
			}),
		);
	},

	FilePondRemove: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let serverId = PLD.serverId;
				let pondServerFile = Tools.getPondServerFile(tenant_id, myEid, serverId);
				fs.unlinkSync(pondServerFile.fullPath);
				await PondFile.deleteOne({ tenant: tenant_id, serverId: serverId });
				return serverId;
			}),
		);
	},

	FilePondRevert: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let serverId = PLD.serverId;
				let pondServerFile = Tools.getPondServerFile(tenant_id, myEid, serverId);
				fs.unlinkSync(pondServerFile.fullPath);
				await PondFile.deleteOne({ tenant: tenant_id, serverId: serverId });
				return serverId;
			}),
		);
	},

	WorkflowAttachmentViewer: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				//const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				//let myEid = CRED.employee.eid;
				let wfid = req.params.wfid;

				let myGroup = CRED.employee.group;

				if (
					myGroup !== "ADMIN" &&
					(await AccessControl.isDoerInWorkflow(tenant_id, CRED.employee.eid, wfid)) === false
				) {
					throw new EmpError("No permisisons", "You are not in this workflow");
				}

				let serverId = req.params.serverId;
				let wf = await RCL.getWorkflow(
					{ tenant: tenant_id, wfid },
					"engine/handler.WrokflowAttachmentViewer",
				);
				let attach = null;
				for (let i = 0; i < wf.attachments.length; i++) {
					if (wf.attachments[i].serverId === serverId) {
						attach = wf.attachments[i];
					}
				}
				if (!attach) {
					throw new EmpError("ATTACH_NOT_FOUND", "Attachment not found");
				}
				let author = attach.author;
				let contentType = attach.contentType;

				let pondServerFile = Tools.getPondServerFile(tenant_id, author, serverId);
				if (!fs.existsSync(pondServerFile.fullPath)) {
					throw new EmpError("FILE_NOT_FOUND", "Attachment file not found");
				}
				var readStream = fs.createReadStream(pondServerFile.fullPath);

				//TODO: 根据worfklwoid 和 eid， 判断用户是否在这个worfklow中，
				//根据是否有todo发到这个用户即可进行判断
				//也许Engine中已经有了这个方法
				//当然，最好放到新文件中2，Engine已经太大了
				//TODO： 限制DISUSS只被参与者访问
				return replyHelper.buildReturn(readStream, {
					"cache-control": "no-cache",
					Pragma: "no-cache",
					"Access-Control-Allow-Origin": "*",
					"Content-Type": contentType,
					"Content-Disposition": `attachment;filename="${encodeURIComponent(
						pondServerFile.fileName,
					)}"`,
				});
			}),
		);
	},

	FormulaEval: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				//let myEid = CRED.employee.eid;
				let expr = PLD.expr;
				let ret = await Engine.formulaEval(tenant_id, expr);
				return "" + ret;
			}),
		);
	},

	WecomBotForTodoGet: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				//const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let wecomBot = await Webhook.find(
					{ tenant: tenant_id, owner: myEid, webhook: "wecombot_todo" },
					{ _id: 0, tplid: 1, key: 1 },
				);
				return wecomBot;
			}),
		);
	},

	WecomBotForTodoSet: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let wecomBot = await Webhook.findOneAndUpdate(
					{ tenant: tenant_id, owner: myEid, webhook: "wecombot_todo", tplid: PLD.tplid },
					{ $set: { key: PLD.key } },
					{ upsert: true, new: true },
				).lean();
				return wecomBot ? wecomBot.webhook : "";
			}),
		);
	},

	WecomBotForTodoDel: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				await Webhook.deleteOne({
					tenant: tenant_id,
					owner: myEid,
					webhook: "wecombot_todo",
					tplid: PLD.tplid,
				});
				return { message: `Wecombot for tplid ${PLD.tplid} deleted` };
			}),
		);
	},

	TemplateSetCover: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let blobInfo = PLD.blob;
				let tplid = PLD.tplid;
				let ext = ".png";
				switch (blobInfo["Content-Type"]) {
					case "image/png":
						ext = ".png";
						break;
					case "image/jpeg":
						ext = ".jpeg";
						break;
				}
				let coverFolder = Tools.getTenantFolders(tenant_id).cover;
				if (fs.existsSync(coverFolder) === false) fs.mkdirSync(coverFolder, { recursive: true });

				let coverFilePath = path.join(Tools.getTenantFolders(tenant_id).cover, tplid + ext);
				fs.renameSync(blobInfo.path, coverFilePath);
				await Template.findOneAndUpdate(
					{ tenant: tenant_id, tplid: tplid },
					{ $set: { hasCover: true, coverTag: new Date().getTime().toString() } },
					{ upsert: false, new: true },
				);
				await Cache.delTplCoverInfo(tplid);
				return { result: tplid + " cover set" };
			}),
		);
	},

	TemplateGetCover: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const tenant_id = req.params.tenant;
				let tplid = req.params.tplid;

				let coverInfo = await Cache.getTplCoverInfo(tenant_id, tplid);
				if (fs.existsSync(coverInfo.path)) {
					return replyHelper.buildReturn(
						fs.createReadStream(coverInfo.path),
						{
							"Access-Control-Allow-Origin": "*",
							"Content-Type": "image/png",
							"Content-Disposition": `attachment;filename="${tplid}.png"`,
						},
						coverInfo.etag,
					);
				} else {
					throw new EmpError("COVER_FILE_LOST", "Cover file does not exist");
				}
			}),
		);
	},

	TemplateGetWecomBot: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let tpl = await Template.findOne(
					{ tenant: tenant_id, tplid: PLD.tplid, author: myEid },
					{ _id: 0, wecombotkey: 1 },
				);
				return tpl ? tpl.wecombotkey : "";
			}),
		);
	},

	TemplateSetWecomBot: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let tpl = await Template.findOneAndUpdate(
					{ tenant: tenant_id, tplid: PLD.tplid, author: myEid },
					{ $set: { wecombotkey: PLD.key } },
					{ upsert: false, new: true },
				);
				return tpl ? tpl.wecombotkey : "";
			}),
		);
	},

	CellsRead: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let fileId = PLD.fileId;

				let cell = (await Cell.findOne(
					{ tenant: tenant_id, serverId: fileId },
					{ _id: 0 },
				).lean()) as CellType;
				if (cell) {
					if (cell.author !== myEid) {
						throw new EmpError("ONLY_AUTHOR", "Only original author can read this CSV data");
					} else {
						let missedUIDs = [];
						let firstRow = -1;
						let rows = cell.cells;
						for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
							// 标题行钱可能有���行，前面一句跳过空行后，第一行不为空的行为firstRow
							if (firstRow < 0) firstRow = rowIndex;
							let cols = rows[rowIndex];
							if (Tools.nbArray(cols) === false) {
								continue;
							}
							//firstRow后，都是数据行。数据行要检查第一列的用户ID是否存在
							if (rowIndex > firstRow) {
								if (
									!(await Employee.findOne(
										{
											tenant: tenant_id,
											eid: cols[0],
										},
										{ __v: 0 },
									))
								) {
									missedUIDs.push(cols[0]);
								}
							}
						}
						if (Tools.nbArray(missedUIDs)) {
							cell.missedUIDs = missedUIDs;
						}
						return cell;
					}
				} else {
					throw new EmpError("NOT_FOUND", "Cell not found");
				}
			}),
		);
	},

	NodeRerun: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let wfid = PLD.wfid;
				let nodeid = PLD.nodeid;
				await Engine.rerunNode(tenant_id, wfid, nodeid);
				return "Done";
			}),
		);
	},

	EmployeeNotInOrgchart: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				//let myEid = CRED.employee.eid;
				// let myGroup = CRED.employee.group;
				await Parser.checkOrgChartAdminAuthorization(CRED);

				let orgChartEntries = await OrgChart.find(
					{ tenant: tenant_id, eid: { $ne: OUEID } },
					{ eid: 1, _id: 0 },
				).lean();
				let tmp = orgChartEntries.map((x: any) => x.eid);
				let employees = await Employee.find(
					{ tenant: tenant_id, eid: { $nin: tmp } },
					{ eid: 1, nickname: 1, _id: 0 },
				).lean();
				console.log(employees);
				return employees;
			}),
		);
	},

	ReplaceEmployeeSucceed: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				// let myEid = CRED.employee.eid;
				let myGroup = CRED.employee.group;
				assert.equal(myGroup, "ADMIN", new EmpError("NOT_ADMIN", "You are not admin"));

				let fromEid = PLD.from;
				let toEid = PLD.to;
				let toEmployee = await Employee.findOne(
					{
						tenant: tenant_id,
						eid: toEid,
					},
					{ __v: 0 },
				);
				assert.notEqual(
					toEmployee,
					null,
					new EmpError("EMPLOYEE_NOT_FOUND", "TO employee must exists"),
				);
				let fromEmployee = await Employee.findOneAndUpdate(
					{ tenant: tenant_id, eid: fromEid },
					{ $set: { active: false, succeed: toEid, succeedname: toEmployee.nickname } },
					{ upsert: false, new: true },
				);

				// If reassigned user has ever been set as any other reassigned users' succeed, change the succeed to the new user as well.
				await Employee.updateMany(
					{ tenant: tenant_id, succeed: fromEid },
					{ $set: { succeed: toEid, succeedname: toEmployee.nickname } },
				);
				//Delete cache of reassigned user's credential cache from Redis,
				//THis cause credential verifcation failed: no cache, EMP get user info
				//from database and required the user's active value must be true.
				if (fromEmployee) await Cache.removeKey(`cred_${fromEmployee._id}`);

				return "Done";
			}),
		);
	},

	ReplaceUserPrepare: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let myGroup = CRED.employee.group;
				assert.equal(myGroup, "ADMIN", new EmpError("NOT_ADMIN", "You are not admin"));
				await TempSubset.deleteMany({
					admin: myEid,
					tranx: { $ne: PLD.tranx },
				});
				await TempSubset.deleteMany({
					createdAt: {
						$lte: new Date(new Date().getTime() - 10 * 60 * 1000).toISOString(),
					},
				});
				let toEmployee = await Employee.findOne(
					{
						tenant: tenant_id,
						eid: PLD.to,
					},
					{ __v: 0 },
				);
				assert.notEqual(
					toEmployee,
					null,
					new EmpError("EMPLOYEE_NOT_FOUND", "TO Employee must exists"),
				);
				//TODO: replaceUser
				Engine.replaceUser({
					tenant_id,
					admin: myEid,
					domain: Tools.getEmailDomain(myEid),
					action: "prepare",
					...PLD,
				}).then();
				return "Please wait to refresh";
			}),
		);
	},

	ReplaceUserPrepareResult: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				let myGroup = CRED.employee.group;
				if (myGroup !== "ADMIN") {
					throw new EmpError("NOT_ADMIN", "You are not admin");
				}
				let result = await TempSubset.find(
					{
						tranx: PLD.tranx,
						objtype: PLD.objtype,
					},
					{ objtype: 1, objid: 1, objtitle: 1, _id: 0 },
				);

				await TempSubset.deleteMany({
					tranx: PLD.tranx,
					objtype: PLD.objtype,
					objid: { $ne: "DONE" },
				});

				return result;
			}),
		);
	},

	ReplaceUserExecute: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let myGroup = CRED.employee.group;
				if (myGroup !== "ADMIN") {
					throw new EmpError("NOT_ADMIN", "You are not admin");
				}
				//TODO: replaceUser or replaceEmployee?
				Engine.replaceUser({
					tenant_id,
					domain: Tools.getEmailDomain(myEid),
					action: "execute",
					...PLD,
				}).then();
				return "Please wait to refresh";
			}),
		);
	},

	SavedSearchSave: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let { objtype, name, ss } = PLD;
				let newSs = await SavedSearch.findOneAndUpdate(
					{ tenant: tenant_id, author: myEid, name: name },
					{ $set: { author: myEid, name: name, ss: ss, objtype: objtype } },
					{ upsert: true, new: true },
				);
				let total = await SavedSearch.countDocuments({
					tenant: tenant_id,
					author: myEid,
					objtype: objtype,
				});
				if (total > 20) {
					SavedSearch.findOneAndDelete({ tenant: tenant_id, author: myEid, objtype: objtype }).sort(
						"-createdAt",
					);
				}

				await Cache.resetETag(`ETAG:SAVEDSEARCH:${myEid}`);

				return newSs.name;
			}),
		);
	},

	SavedSearchList: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				let ifNoneMatch = req.headers["if-none-match"];
				let latestETag = Cache.getETag(`ETAG:SAVEDSEARCH:${myEid}`);
				if (ifNoneMatch && latestETag && ifNoneMatch === latestETag) {
					return replyHelper.build304([], latestETag);
				}
				const tmp = await SavedSearch.find(
					{
						tenant: tenant_id,
						author: myEid,
						objtype: PLD.objtype,
					},
					{ name: 1, ss: 1, createdAt: 1, _id: 0 },
				)
					.sort("-createdAt")
					.lean();
				const ret = tmp.map((x) => x.name);
				return replyHelper.buildReturnWithEtag(ret, latestETag);
			}),
		);
	},

	SavedSearchGetOne: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				return await SavedSearch.findOne(
					{ tenant: tenant_id, author: myEid, name: PLD.name, objtype: PLD.objtype },
					{ ss: 1, _id: 0 },
				).lean();
			}),
		);
	},

	Fix: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let wfs = await Workflow.find({}, { __v: 0 });
				for (let i = 0; i < wfs.length; i++) {
					for (let a = 0; a < wfs[i].attachments.length; a++) {
						if (wfs[i].attachments[a].serverId) {
							console.log(wfs[i].attachments[a]);
							await PondFile.findOneAndUpdate(
								{
									tenant: tenant_id,
									serverId: wfs[i].attachments[a].serverId,
								},
								{
									$set: {
										realName: wfs[i].attachments[a].realName,
										contentType: wfs[i].attachments[a].contentType,
										author: wfs[i].attachments[a].author,
									},
								},
								{ upsert: true, new: true },
							);
						}
					}
				}
				return "Done";
			}),
		);
	},

	TestWishhouseAuth: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const CRED = req.auth.credentials as any;
				return CRED.username;
			}),
		);
	},

	Version: async (req: Request, h: ResponseToolkit) => {
		const CRED = req.auth.credentials as any;
		try {
			console.log("Call handlers.Version:", CRED.user.account);
			return replyHelper.buildReturn(
				`
				const internal = {version: "${Const.VERSION}"};
				export default internal;
				`,
				replyHelper.headers.nocache,
			);
		} catch (err) {
			return h.response(replyHelper.constructErrorResponse(err)).code(500);
		}
	},

	FlexibleStart: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;

				let toWhom = PLD.toWhom ?? CRED.employee.eid;

				let innerTpl: Emp.TemplateObj = {
					tplid: `Flexible tpl of ${myEid}`,
					pboat: "ANY_RUNNING",
					doc: `<div class="template"><div class="node START" id="start" style="left:200px; top:200px;"><p>START</p></div><div class="node ACTION" id="hellohyperflow" style="left:300px; top:300px;" role="@${toWhom}" wecom="false" transferable="no" sr="no" sb="no" rvk="no" adhoc="yes" cmt="yes"><p>${PLD.name}</p><div class="kvars">e30=</div><div class="instruct">6K+35Zyo6L+Z6YeM54G15rS75Y+R6LW35LiA5Yiw5aSa5Liq54us56uL5bel5L2c5Lu75Yqh44CCCuWcqOehruWumuaVtOS4quS6i+mhue+8iOmhueebru+8ieWujOaIkOS7peWQju+8jOaCqOWPr+S7peWFs+mXreW9k+WJjeeBtea0u+S6i+mhue+8iOivt+azqOaEj++8jOWFs+mXreW9k+WJjeW3peS9nOS7u+WKoeWQju+8jOaJgOacieW3suWPkeWHuuS9huacquWujOaIkOeahOeLrOeri+W3peS9nOS7u+WKoeS5n+WwhuiHquWKqOWkseaViO+8iQ==</div><code>Ly8gcmVhZCBIeXBlcmZsb3cgRGV2ZWxvcGVyJ3MgR3VpZGUgZm9yIGRldGFpbHMKcmV0PSdERUZBVUxUJzs=</code></div><div class="node END" id="end" style="left: 600px; top: 240px; z-index: 0;"><p>END</p> </div><div class="link" from="start" to="hellohyperflow"  >link</div><div class="link" from="hellohyperflow" to="end" case="关闭���灵活事项" >link</div></div>`,
					endpoint: "",
					endpointmode: "none",
					allowdiscuss: true,
				};
				let wf = await Engine.startWorkflow_with({
					rehearsal: false,
					tenant: tenant_id as string,
					tplid: innerTpl.tplid,
					theTemplate: innerTpl,
					starter: CRED.employee,
					textPbo: [""],
					pbostatus: "__init__",
					wfid: null,
					wftitle: PLD.name,
					parent_wf_id: "",
					parent_work_id: "",
					parent_vars: {},
					runmode: "standalone",
					uploadedFiles: [],
					attachments: null,
				});

				return wf;
			}),
		);
	},

	SiteInfo: async (_req: Request, h: ResponseToolkit) => {
		const ret = await Cache.getSiteInfo();
		return h.response(ret);
	},

	Mining_WorkflowDetails: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;

				const wfids = PLD.wfids;
				const ret = [];

				for (let i = 0; i < wfids.length; i++) {
					ret.push(
						await Workflow.findOne(
							{ tenant: tenant_id, wfid: wfids[i] },
							{
								_id: 0,
								wfid: 1,
								wftitle: 1,
								status: 1,
								starter: 1,
								pnodeid: 1,
								pworkid: 1,
								createdAt: 1,
								updatedAt: 1,
							},
						).lean(),
					);
				}
				for (let i = 0; i < ret.length; i++) {
					ret[i].starterCN = await Cache.getEmployeeName(tenant_id, ret[i].starter);
					ret[i].works = await Work.find(
						{ tenant: tenant_id, wfid: ret[i].wfid },
						{
							_id: 0,
							wfid: 1,
							workid: 1,
							nodeid: 1,
							from_workid: 1,
							from_nodeid: 1,
							title: 1,
							status: 1,
							decision: 1,
							doneat: 1,
							createdAt: 1,
							updatedAt: 1,
						},
					).lean();

					ret[i].todos = await Todo.find(
						{ tenant: tenant_id, wfid: ret[i].wfid },
						{
							_id: 0,
							todoid: 1,
							wfid: 1,
							nodeid: 1,
							workid: 1,
							doer: 1,
							tplid: 1,
							title: 1,
							status: 1,
							decision: 1,
							doneby: 1,
							doneat: 1,
							createdAt: 1,
							updatedAt: 1,
						},
					).lean();
					for (let t = 0; t < ret[i].todos.length; t++) {
						ret[i].todos[t].doerCN = await Cache.getEmployeeName(tenant_id, ret[i].todos[t].doer);
					}
				}
				return ret;
			}),
		);
	},

	Mining_Data: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				const myEid = CRED.employee.eid;

				let wfids = [];
				const { tplid, wfid } = PLD;
				if (wfid.length < 1) {
					wfids = (
						await Workflow.find({ tenant: tenant_id, tplid: tplid }, { _id: 0, wfid: 1 }).lean()
					).map((x: any) => x.wfid);
				} else {
					wfids = [wfid];
				}
				let columnKeys = [];
				let columnDefs = [];
				let entries = [];
				for (let i = 0; i < wfids.length; i++) {
					let ALL_VISIED_KVARS = await Parser.userGetVars(
						tenant_id,
						myEid,
						wfids[i],
						Const.FOR_WHOLE_PROCESS,
						[],
						[],
						Const.VAR_IS_EFFICIENT,
					);
					if (columnKeys.length < 1) {
						columnKeys = Object.keys(ALL_VISIED_KVARS);
						columnDefs = columnKeys.map((x) => {
							return {
								header: ALL_VISIED_KVARS[x].label,
								key: x,
								width: 30,
							};
						});
					} else {
						let keys = Object.keys(ALL_VISIED_KVARS);
						for (let k = 0; k < keys.length; k++) {
							if (columnKeys.includes(keys[k]) === false) {
								columnKeys.push(keys[k]);
								columnDefs.push({
									header: ALL_VISIED_KVARS[keys[k]].label,
									key: keys[k],
									width: 30,
								});
							}
						}
					}
					let anEntry = {};
					let keys = Object.keys(ALL_VISIED_KVARS);
					for (let k = 0; k < keys.length; k++) {
						anEntry[keys[k]] = ALL_VISIED_KVARS[keys[k]].value;
					}
					entries.push(anEntry);
				}

				const workbook = new Excel.Workbook();
				workbook.creator = "Metatocome";
				const worksheet = workbook.addWorksheet("ProcessData");

				if (entries.length > 0) {
					worksheet.columns = columnDefs;

					for (let i = 0; i < entries.length; i++) {
						worksheet.addRow(entries[i]);
					}
				} else {
					worksheet.columns = [
						{
							header: "No data",
							key: "nodata",
							width: 30,
						},
					];
					worksheet.addRow({ nodata: "There is no process data" });
				}

				//await workbook.xlsx.writeFile("/Users/lucas/tst.xlsx");
				const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;

				return replyHelper.buildReturn(buffer, {
					"cache-control": "no-cache",
					Pragma: "no-cache",
					"Access-Control-Allow-Origin": "*",
					"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					"Content-Disposition": `attachment;filename="ProcessData.xlsx"`,
				});
			}),
		);
	},

	PrintLog: async (req: Request, h: ResponseToolkit) => {
		const PLD = req.payload as any;
		const CRED = req.auth.credentials as any;
		try {
			// const tenant_id = CRED.tenant._id;
			// const myEid = CRED.employee.eid;

			console.log(`${CRED.employee.eid}: ${PLD.msg}`);

			return h.response(PLD.msg);
		} catch (err) {
			console.error(err);
			return h.response(replyHelper.constructErrorResponse(err)).code(500);
		}
	},

	WorkflowIamIn: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let myEid = CRED.employee.eid;
				// let q = PLD.q;

				let ifNoneMatch = req.headers["if-none-match"];
				let latestETag = Cache.getETag(`ETAG:FORUM:${tenant_id}`);
				if (ifNoneMatch && latestETag && ifNoneMatch === latestETag) {
					return replyHelper.build304({}, latestETag);
				}

				let wfIds = [];
				// let wfIamVisied = [];
				let wfIStarted = [];
				let wfIamIn = [];
				// let wfIamQed = [];

				//let myUid = Tools.getEmailPrefix(myEid);
				// let myUid = myEid;
				// let iamAdmin = CRED.employee.group === "ADMIN";

				// let wfInfos = [];
				// let total = 0;

				// let filter: any = { tenant: tenant_id };

				//我启动的进程
				wfIStarted = await Workflow.find(
					lodash.pickBy({ tenant: tenant_id, starter: myEid, tplid: PLD.tplid }),
					{ _id: 0, wfid: 1, wftitle: 1, createdAt: 1 },
					{ sort: { createdAt: -1 }, limit: 100 },
				).lean();

				wfIStarted = wfIStarted.map((x) => {
					return { wfid: x.wfid, updatedAt: x.createdAt };
				});

				let todoGroup = await Todo.aggregate([
					{ $match: lodash.pickBy({ tplid: PLD.tplid, doer: myEid }) },
					{ $sort: { updatedAt: -1 } },
					{ $limit: 100 },
					{
						$group: {
							_id: "$wfid",
							wftitle: { $first: "$wftitle" },
							updatedAt: { $max: "$updatedAt" },
							count: { $sum: 1 },
						},
					},
					{ $limit: 30 },
				]);

				wfIamIn = todoGroup.map((x) => {
					return { wfid: x._id, wftitle: x.wftitle, updatedAt: x.updatedAt };
				});

				/*
        let commentGroup = await Comment.aggregate([
          {
            $match: { people: myUid },
          },
          {
            $group: { _id: "$context.wfid", updatedAt: { $max: "$updatedAt" }, count: { $sum: 1 } },
          },
        ]);
        wfIamQed = commentGroup.map((x) => {
          return { wfid: x._id, updatedAt: x.updatedAt };
        });
        */
				// 在查找 comment时，  I_AM_QED 缺省需要包含 I_STARTED

				//wfIds = [...wfIamVisied, ...wfIStarted, ...wfIamIn, ...wfIamQed];
				wfIds = [...wfIStarted, ...wfIamIn];
				wfIds = lodash.sortBy(wfIds, ["updatedAt"]).reverse();
				wfIds = lodash.sortedUniqBy(wfIds, (o) => o.wfid);
				//console.log(wfIds);

				return replyHelper.buildReturnWithEtag(wfIds, latestETag);
			}),
		);
	},
};
