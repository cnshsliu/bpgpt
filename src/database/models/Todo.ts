"use strict";
import { Schema, InferSchemaType, model, HydratedDocument } from "mongoose";

//Same fields as Parse.com
const schema = new Schema(
	{
		tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
		newer: { type: Schema.Types.Boolean, default: true },
		viewedAt: { type: Date },
		round: { type: Number, default: 0 },
		todoid: { type: String, required: [true, "不能为空"], index: true },
		wfid: { type: String, required: [true, "不能为空"], index: true },
		nodeid: { type: String, required: [true, "不能为空"], index: true },
		workid: { type: String, required: [true, "不能为空"], index: true },
		doer: { type: String, required: [true, "不能为空"], index: true },
		tplid: { type: String, required: [true, "不能为空"], index: true },
		wftitle: { type: String, required: [true, "不能为空"], index: false },
		title: { type: String, required: true },
		origtitle: { type: String },
		comment: { type: String },
		instruct: { type: String, default: "" },
		role: { type: String },
		byroute: { type: String },
		decision: { type: String },
		status: { type: String, required: true, index: true },
		wfstatus: { type: String, required: true, index: true },
		wfstarter: { type: String, required: false, index: false },
		transferable: { type: Boolean, default: false },
		doneby: { type: String, required: false, default: "", index: false },
		doneat: { type: String, required: false },
		rehearsal: { type: Boolean, required: true, default: false, index: true },
		teamid: { type: String, required: false, default: "" },
		cellInfo: { type: String, required: false, default: "" },
		allowdiscuss: { type: Boolean, default: true },
		postpone: { type: Number, default: 0 },
		postponedAt: { type: Date, default: Date.now() },
		createdAt: { type: Date },
		updatedAt: { type: Date },
	},
	{ timestamps: true },
);

export type TodoType = HydratedDocument<InferSchemaType<typeof schema>>;
export const Todo = model("Todo", schema);
