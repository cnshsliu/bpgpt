import { Schema, InferSchemaType, model, HydratedDocument } from "mongoose";
//The document structure definition

//Same fields as Parse.com
const schema = new Schema(
	{
		tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
		tplid: { type: String, required: [true, "不能为空"] },
		nodeid: { type: String },
		wfid: { type: String },
		workid: { type: String },
		expr: { type: String, required: true },
		starters: String,
		creator: String,
		scheduled: { type: Boolean, default: true },
		method: { type: String, default: "STARTWORKFLOW" },
		extra: { type: String, default: "{}" },
	},
	{ timestamps: false },
);
schema.index({ tplid: 1 }, { unique: false });

export type CrontabType = HydratedDocument<InferSchemaType<typeof schema>>;
export const Crontab = model("Crontab", schema);
