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

const brains: Record<string, BrainType> = {
	"yana-001": {
		name: "Yana001",
		autostop: 1,
		cells: `您好，{nickname}，我是亚娜，欢迎使用 Yarknode。
下面，我来跟您介绍如何使用 Yarknode。

:iamyana
首先，我自身就是 Yarknode 的一部分，由 Yarknode 驱动，
当您看到这段文字或者听到我的声音的时候，您的 Yarknode 体验之旅已经开启，
亚娜我是您在 Yarknode 里的专职 AI 助理。

如果在我们接下来的沟通过程中，您点了其它菜单项而离开了我们的对话，
您可以随时按下 Control 加 P 键，重新回到我们的对话里。

已全部介绍完，您现在可以点右上角的⊗关闭
`,
	},
	"yana-002": {
		name: "Yana001",
		cells: `您好，{nickname}，现在为你介绍流程设计器的使用。
你现在已经被自动带到了示例流程模版ABCD。

在屏幕左侧，我们看到了。。。

在屏幕右侧，我们看到了。。。

已全部介绍完，您现在可以点右上角的⊗关闭
`,
	},
	"yana-003": {
		name: "Yana001",
		cells: `您好，{nickname}，我现在带你浏览一遍Yarknode的页面。你现在看到的是"业务规划"页面
goto:/template
show:demo01_eid

Now， it's  setting
goto:/settings

Now it's workflows
goto:/workflow

已全部介绍完，您现在可以点右上角的⊗关闭
`,
	},
};

const buildTemplate = (yanaid: string, employee: { nickname: string }) => {
	let brain = brains[yanaid];
	let autostop = brain.autostop ?? 0;
	let xml = "";
	brain.cells = brain.cells.replace("{nickname}", employee.nickname);
	let tmp = brain.cells.split("\n");
	let stepSerial = 0;
	let steps = [] as stepType[];
	let currentStep: stepType = {
		stepId: "",
		instruction: [],
		goto: "",
		show: "",
	};
	for (let i = 0; i < tmp.length; i++) {
		//新的一段开始， 段与段之间用空行开始
		if (tmp[i].trim() === "") {
			stepSerial = stepSerial + 1;
			if (currentStep.stepId === "") {
				currentStep.stepId = `step-${stepSerial}`;
			}
			steps.push(currentStep);
			currentStep = { stepId: "", instruction: [], goto: "", show: "" };
		} else {
			if (tmp[i][0] === ":") {
				currentStep.stepId = tmp[i].slice(1).trim();
			} else if (tmp[i].slice(0, 4) === "goto") {
				currentStep.goto = tmp[i].slice(5).trim();
			} else if (tmp[i].slice(0, 4) === "show") {
				currentStep.show = tmp[i].slice(5).trim();
			} else {
				currentStep.instruction.push(tmp[i]);
			}
		}
	}

	xml += `<div class="template" id="${brain.name}">`;
	xml += `<div class="node START ui-draggable-disabled" id="start" style="left:200px; top:200px;"><p>START</p></div>`;
	for (let i = 0; i < steps.length; i++) {
		let tmp =
			steps[i].instruction.join(" ") +
			(steps[i].goto ? `goto(${steps[i].goto})` : "") +
			(steps[i].show ? `show(${steps[i].show})` : "");
		xml += `<div class="node ACTION" id="${steps[i].stepId}" style="left:${250 + i * 36}px; top:${
			250 + i * 36
		}px;" role="DEFAULT"><p>${steps[i].stepId}</p><div class="instruct">${Parser.codeToBase64(
			tmp,
		)}</div></div>`;
	}
	xml += `<div class="node END ui-draggable-disabled" id="end" style="left:400px; top:400px;"><p>END</p> </div>`;

	xml += `<div class="link" from="start" to="${steps[0].stepId}"></div>`;
	for (let i = 0; i < steps.length - 1; i++) {
		xml += `<div class="link" from="${steps[i].stepId}" to="${steps[i + 1].stepId}"></div>`;
	}
	xml += `<div class="link" from="${steps[steps.length - 1].stepId}" to="end"></div>`;
	xml += `</div>`;
	return { xml, steps, autostop };
};

export default {
	StartYana: async (req: Request, h: ResponseToolkit) => {
		return h.response(
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;

				const tenant_id = CRED.tenant._id;

				const { xml, steps, autostop } = buildTemplate(PLD.yanaid, CRED.employee);
				// console.log(xml);
				let tplid = CRED.employee.eid + "_" + PLD.yanaid;

				let wfs = await Workflow.find(
					{ tenant: CRED.tenant._id, tplid: tplid, starter: CRED.employee.eid },
					{ _id: 0, wfid: 1 },
				).lean();
				for (let i = 0; i < wfs.length; i++) {
					await Engine.resetTodosETagByWfId(CRED.tenant._id, wfs[i].wfid);
					//最后一个参数是true，表明可以删除自己启动的，已经运行到任意节点的流程
					//如果是false，则只能删除rehearsal，以及正式运行，切当前节点处于start的流程
					await Engine.destroyWorkflow(CRED.tenant._id, CRED.employee, wfs[i].wfid, true);
				}

				let template = await Template.findOneAndUpdate(
					{ tenant: CRED.tenant._id, tplid: tplid },
					{
						$set: {
							doc: xml,
							lastUpdateBy: CRED.employee.eid,
							lastUpdateBwid: CRED.employee.bwid,
							searchable: false,
							bwid: "internal",
							author: CRED.employee.eid,
							authorName: CRED.employee.nickname,
							ins: false,
							visi: "@" + CRED.employee.eid,
							ksid: "",
							autostop: autostop,
						},
					},
					{ upsert: true, new: true },
				);
				await Engine.collectTplAutostop();

				let wfid = IdGenerator();

				let wfDoc = await Engine.startWorkflow({
					rehearsal: false,
					tenant: CRED.tenant._id.toString(),
					tplid: tplid,
					pbostatus: "__init__",
					starter: CRED.employee,
					attachments: [],
					teamid: "",
					wfid: wfid,
					wftitle: "Yana-" + PLD.yanaid,
					parent_wf_id: "",
					parent_work_id: "",
					parent_vars: {},
					runmode: "standalone",
					uploadedFiles: [],
				});
				await Engine.resetTodosETagByWfId(tenant_id, wfid);
				await Cache.resetETag(`ETAG:WORKFLOWS:${tenant_id}`);
				return { tplid: template.tplid, wfid: wfDoc.wfid, steps: steps };
			}),
		);
	},

	DestroyYana: async (req: Request, h: ResponseToolkit) => {
		return replyHelper.buildResponse(
			h,
			await MongoSession.noTransaction(async () => {
				const PLD = req.payload as any;
				const CRED = req.auth.credentials as any;
				const tenant_id = CRED.tenant._id;
				let yanaid = PLD.yanaid;
				let wfid = PLD.wfid;
				if (yanaid) {
					let tplid = CRED.employee.eid + "_" + PLD.yanaid;
					let wfs = await Workflow.find(
						{ tenant: tenant_id, tplid: tplid, starter: CRED.employee.eid },
						{ _id: 0, wfid: 1 },
					).lean();
					for (let i = 0; i < wfs.length; i++) {
						await Engine.resetTodosETagByWfId(tenant_id, wfs[i].wfid);
						//最后一个参数是true，表明可以删除自己启动的，已经运行到任意节点的流程
						//如果是false，则只能删除rehearsal，以及正式运行，切当前节点处于start的流程
						await Engine.destroyWorkflow(tenant_id, CRED.employee, wfs[i].wfid, true);
					}
				} else if (wfid) {
					await Engine.destroyWorkflow(tenant_id, CRED.employee, wfid, true);
				} else {
					return "nothing to destroy";
				}
				await Cache.resetETag(`ETAG:WORKFLOWS:${tenant_id}`);
				return "Done";
			}),
		);
	},
};
