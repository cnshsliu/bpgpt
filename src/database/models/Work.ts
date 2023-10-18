"user strict";
import { Schema, InferSchemaType, model, HydratedDocument } from "mongoose";

//Same fields as Parse.com
const schema = new Schema(
	{
		tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
		round: { type: Number, default: 0 },
		wfid: { type: String, required: [true, "不能为空"], index: true },
		workid: { type: String, required: [true, "不能为空"], index: true },
		nodeid: { type: String },
		from_workid: { type: String },
		from_nodeid: { type: String },
		title: { type: String },
		byroute: { type: String },
		decision: { type: String },
		status: { type: String, required: true, index: true },
		doneat: { type: String, required: false },
	},
	{ timestamps: true },
);

export type WorkType = HydratedDocument<InferSchemaType<typeof schema>>;

export const Work = model("Work", schema);
