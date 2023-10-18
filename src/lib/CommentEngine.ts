import { Types } from "mongoose";
import { Cheerio, CheerioAPI, Element } from "cheerio";
import { Todo, TodoType } from "../database/models/Todo.js";
import Thumb from "../database/models/Thumb.js";
import { Workflow, WorkflowType } from "../database/models/Workflow.js";
import { Comment, CommentType } from "../database/models/Comment.js";
import { Route } from "../database/models/Route.js";
import { marked as Marked } from "marked";
import { Work, WorkType } from "../database/models/Work.js";
import { Employee, EmployeeType } from "../database/models/Employee.js";
import Cache from "./Cache.js";
import MessageEngine from "./MessageEngine.js";
import Tools from "../tools/tools.js";
import SystemPermController from "./SystemPermController.js";
import Parser from "./Parser.js";
import EmpError from "./EmpError.js";
import RCL from "./RedisCacheLayer.js";
import Const from "./Const.js";
import type {
	CommentContextType,
	workFullInfo,
	ActionDef,
	NodeBriefType,
	HistoryTodoEntryType,
	TenantIdType,
} from "./EmpTypes";

const frontendUrl = Tools.getFrontEndUrl();

const postCommentForComment = async function (
	tenant: Types.ObjectId | string,
	doer: string,
	cmtid: string,
	content: string,
	threadid: string,
) {
	let cmt = await Comment.findOne({ tenant: tenant, _id: cmtid }, { __v: 0 });

	let theTodo = await Todo.findOne(
		{ tenant: tenant, todoid: cmt.context.todoid },
		{ __v: 0 },
	).lean();
	let people = cmt.people;
	people.push(cmt.who);
	let eids: string[] = people;
	let doerCN = await Cache.getEmployeeName(tenant, doer, "postCommentForComment");
	[people, eids] = await Tools.setPeopleFromContent(tenant, content, people, eids);
	let msg = {
		tenant: tenant,
		doer: doer,
		doerCN: doerCN,
		subject: (cmt.rehearsal ? "MTC Comment Rehearsal: " : "MTC Comment: ") + `from ${doerCN}`,
		mail_body: `Hello [receiverCN],<br/><br/>Comment for you: <br/>${content}<br/> From: ${doerCN}<br/> 
        Click to see it on task: <a href="${frontendUrl}/work/${
			cmt.context.todoid
		}?anchor=ANCHOR">${theTodo ? theTodo.title : "The Task"} </a> <br/>
        Process: <a href="${frontendUrl}/workflow/${cmt.context.wfid}">${
			theTodo ? theTodo.wftitle : "The Workflow"
		}</a><br/>
    <br/><br/> Metatocome`,
	};
	return await __postComment(
		tenant,
		doer,
		cmt.who,
		"COMMENT",
		cmtid, //被该条评论 所评论的评论的ID
		content,
		cmt.context, //继承上一个comment的业务上下文
		people,
		eids,
		cmt.rehearsal,
		msg,
		threadid,
	);
};

const __postComment = async function (
	tenant: Types.ObjectId | string,
	doer: string,
	toWhom: string,
	objtype: string,
	objid: string,
	content: string,
	context: CommentContextType,
	thePeople: string[],
	eids: string[] = [],
	rehearsal: boolean,
	emailMsg: { subject: string; mail_body: string } | null = null,
	threadid: string | null = null,
): Promise<CommentType> {
	console.log("__postCommment will send email to ", eids);
	try {
		//找里面的 @somebody， regexp是@后面跟着的连续非空字符
		let comment: CommentType = null;
		comment = new Comment({
			tenant: tenant,
			rehearsal: rehearsal,
			who: doer,
			towhom: toWhom,
			objtype: objtype,
			objid: objid,
			people: thePeople,
			content: content,
			context: context,
			threadid: threadid ? threadid : "",
		}) as CommentType;
		comment = (await comment.save()) as CommentType;
		await Cache.resetETag(`ETAG:WF:FORUM:${tenant}:${comment.context.wfid}`);
		await Cache.resetETag(`ETAG:FORUM:${tenant}`);
		//对TODO的comment是thread级Comment，需要将其threadid设置为其自身的_id
		if (comment.objtype === "TODO") {
			comment.threadid = comment._id.toString();
			comment = await comment.save();
		} else if (threadid) {
			//对Comment的Comment需要将其thread  Comment的 updatedAt进行更新
			//以便其排到前面
			await Comment.findOneAndUpdate(
				{ tenant: tenant, _id: comment.threadid },
				{ updatedAt: new Date(0) },
				{ upsert: false, new: true },
			);
		}
		//TODO: send TIMEOUT seconds later, then check if still exists, if not, don't send email
		if (emailMsg) {
			setTimeout(async () => {
				let theComment = await Comment.findOne({ tenant: tenant, _id: comment._id }, { __v: 0 });
				if (theComment) {
					for (let i = 0; i < eids.length; i++) {
						if (eids[i] === doer) {
							console.log("Bypass: comment's author email to him/herself");
							continue;
						}
						let receiverCN = await Cache.getEmployeeName(tenant, eids[i], "__postComment");
						if (receiverCN === "USER_NOT_FOUND") continue;
						let subject = emailMsg.subject.replace("[receiverCN]", receiverCN);
						let body = emailMsg.mail_body.replace("[receiverCN]", receiverCN);
						//ANCHOR, use to scroll to attached comment by comment id.
						body = body.replace("ANCHOR", "tcmt_" + comment._id.toString());

						MessageEngine.sendTenantMail(
							tenant, //not rehearsal
							rehearsal ? doer : eids[i],
							subject,
							body,
							"COMMENT_MAIL",
						).then(() => {
							console.log(
								"Mailer send email to ",
								rehearsal ? doer + "(" + eids[i] + ")" : eids[i],
								"subject:",
								subject,
							);
						});
					}
				} else {
					console.log("Don't send comment email, since HAS been deleted");
				}
			}, (Const.DEL_NEW_COMMENT_TIMEOUT + 5) * 1000);
		}
		comment = JSON.parse(JSON.stringify(comment)) as CommentType;
		comment.whoCN = await Cache.getEmployeeName(tenant, comment.who, "__postComment");
		comment.towhomCN = await Cache.getEmployeeName(tenant, toWhom, "__postComment");
		comment.splitted = Tools.splitComment(comment.content);
		let tmpret = await Tools.splitMarked(tenant, comment);
		comment.mdcontent = tmpret.mdcontent;
		comment.mdcontent2 = tmpret.mdcontent2;
		let people = [];
		let eids = [];
		[people, eids] = await Tools.setPeopleFromContent(tenant, comment.content, people, eids);
		comment.people = people;
		comment.transition = true;
		comment.children = [];
		comment.upnum = 0;
		comment.downnum = 0;
		return comment;
	} catch (err) {
		console.error(err);
	}
};

//对每个@somebody存储，供somebody反向查询comment
const postCommentForTodo = async function (
	tenant: Types.ObjectId | string,
	doer: string,
	todo: TodoType,
	content: string,
) {
	if (content.trim().length === 0) return;
	let eids = [todo.wfstarter];
	let people = [Tools.getEmailPrefix(todo.wfstarter)];
	let doerCN = await Cache.getEmployeeName(tenant, doer, "postCommentForTodo");
	[people, eids] = await Tools.setPeopleFromContent(tenant, content, people, eids);
	let msg = {
		tenant: todo.tenant,
		doer: doer,
		doerCN: doerCN,
		subject: (todo.rehearsal ? "MTC Comment Rehearsal: " : "MTC Comment: ") + `from ${doerCN}`,
		mail_body: `Hello [receiverCN],<br/><br/>Comment for you: 
    <br/>
    <br/>
    ${content}
    <br/>
    <br/>
        From: ${doerCN}<br/>
        Click to see it on task: <a href="${frontendUrl}/work/${todo.todoid}?anchor=ANCHOR">${todo.title}</a> <br/>
        Process: <a href="${frontendUrl}/workflow/${todo.wfid}">${todo.wftitle}</a><br/>
        <br/><a href="${frontendUrl}/comment">View all comments left for you </a><br/><br/><br/> Metatocome`,
	};
	let theWf = await Workflow.findOne({ tenant: tenant, wfid: todo.wfid }, { wftitle: 1 });
	let context: CommentContextType = {
		wfid: todo.wfid,
		workid: todo.workid,
		todoid: todo.todoid,
		biztitle: theWf.wftitle,
	};
	let ret = await __postComment(
		tenant,
		doer,
		todo.doer,
		"TODO", //被评论的对象是一个TODO
		todo.todoid, //被评论对象的ID
		content,
		context,
		people,
		eids,
		todo.rehearsal,
		msg,
	);
	ret.todoTitle = todo.title;
	ret.todoDoer = todo.doer;
	ret.todoDoerCN = await Cache.getEmployeeName(tenant, todo.doer, "postCommentForTodo");
	return ret;
};

const getComments = async function (
	tenant: TenantIdType,
	objtype: string,
	objid: string,
	depth: number = -1,
	skip: number = -1,
) {
	//对objtype+objid的comment可能是多个
	let cmtCount = await Comment.countDocuments({ tenant, objtype, objid });
	if (cmtCount === 0) {
		return [];
	}
	let cmts: CommentType[] = [];
	if (skip >= 0 && depth >= 0) {
		cmts = await Comment.find({ tenant, objtype, objid }, { __v: 0 })
			.sort({ createdAt: -1 })
			.limit(depth)
			.skip(skip)
			.lean();
	} else if (depth >= 0) {
		cmts = await Comment.find({ tenant, objtype, objid }, { __v: 0 })
			.sort({ createdAt: -1 })
			.limit(depth)
			.lean();
	} else if (skip >= 0) {
		cmts = await Comment.find({ tenant, objtype, objid }, { __v: 0 })
			.sort({ createdAt: -1 })
			.skip(skip)
			.lean();
	} else {
		cmts = await Comment.find({ tenant, objtype, objid }, { __v: 0 })
			.sort({ createdAt: -1 })
			.lean();
	}
	if (cmts) {
		for (let i = 0; i < cmts.length; i++) {
			cmts[i].whoCN = await Cache.getEmployeeName(tenant, cmts[i].who, "getComments");
			cmts[i].towhomCN = await Cache.getEmployeeName(tenant, cmts[i].towhom, "getComments");
			cmts[i].splitted = Tools.splitComment(cmts[i].content);
			let tmpret = await Tools.splitMarked(tenant, cmts[i]);
			cmts[i].mdcontent = tmpret.mdcontent;
			cmts[i].mdcontent2 = tmpret.mdcontent2;
			cmts[i].showChildren = true;
			cmts[i].upnum = await Thumb.countDocuments({
				tenant,
				cmtid: cmts[i]._id,
				upordown: "UP",
			});
			cmts[i].downnum = await Thumb.countDocuments({
				tenant,
				cmtid: cmts[i]._id,
				upordown: "DOWN",
			});
			//每个 comment 自身还会有被评价
			let children = await getComments(tenant, "COMMENT", cmts[i]._id.toString(), depth);
			if (children.length > 0) {
				cmts[i]["children"] = children;
				cmts[i].showChildren = true;
			} else {
				cmts[i]["children"] = [];
				cmts[i].showChildren = false;
			}
			cmts[i].transition = false;
		}

		return cmts;
	} else {
		return [];
	}
};

const loadWorkflowComments = async function (tenant: TenantIdType, wfid: string) {
	let cmts = [];
	let workComments = (await Comment.find(
		{
			tenant: tenant,
			"context.wfid": wfid,
			objtype: "TODO",
		},
		{
			__v: 0,
		},
		{ sort: "-updatedAt" },
	).lean()) as CommentType[];
	for (let i = 0; i < workComments.length; i++) {
		let todo = await Todo.findOne(
			{
				tenant,
				wfid: workComments[i].context.wfid,
				todoid: workComments[i].context.todoid,
			},
			{ _id: 0, title: 1, doer: 1 },
		);
		if (todo) {
			workComments[i].todoTitle = todo.title;
			workComments[i].todoDoer = todo.doer;
			workComments[i].todoDoerCN = await Cache.getEmployeeName(
				tenant,
				todo.doer,
				"_loadWorkflowComments",
			);
		}
		workComments[i].upnum = await Thumb.countDocuments({
			tenant,
			cmtid: workComments[i]._id,
			upordown: "UP",
		});
		workComments[i].downnum = await Thumb.countDocuments({
			tenant,
			cmtid: workComments[i]._id,
			upordown: "DOWN",
		});
	}

	cmts = workComments;

	for (let i = 0; i < cmts.length; i++) {
		cmts[i].whoCN = await Cache.getEmployeeName(tenant, cmts[i].who, "_loadWorkflowComments");
		cmts[i].splitted = Tools.splitComment(cmts[i].content);
		let tmpret = await Tools.splitMarked(tenant, cmts[i]);
		cmts[i].mdcontent = tmpret.mdcontent;
		cmts[i].mdcontent2 = tmpret.mdcontent2;
		let people = [];
		let eids = [];
		[people, eids] = await Tools.setPeopleFromContent(tenant, cmts[i].content, people, eids);
		cmts[i].people = people;
		//每个 comment 自身还会有被评价
		let children = await getComments(tenant, "COMMENT", cmts[i]._id);
		cmts[i]["children"] = children;
		cmts[i].showChildren = true;
		cmts[i].transition = i === 0;
	}
	return cmts;
};

export default {
	postCommentForComment,
	postCommentForTodo,
	getComments,
	loadWorkflowComments,
};
