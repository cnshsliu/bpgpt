import { Schema, InferSchemaType, HydratedDocument, model } from "mongoose";

//Same fields as Parse.com
const schema = new Schema({
	tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
	tplid: { type: String, required: [true, "不能为空"], index: true },
	pboat: {
		type: String,
		enum: ["STARTER_START", "STARTER_RUNNING", "STARTER_ANY", "ANY_RUNNING", "ANY_ANY"],
		default: "ANY_RUNNING",
	},
	endpoint: { type: String, default: "" },
	endpointmode: { type: String, default: "both" },
	freejump: { type: String, default: "", trim: true },
	author: { type: String, required: [true, "不能为空"], index: true },
	authorName: { type: String, required: [true, "不能为空"], index: false },
	lastUpdateBy: String,
	lastUpdateBwid: String, //Browser window it;
	visi: { type: String },
	wecombotkey: { type: String, length: 36 },
	desc: { type: String, required: false, index: false },
	doc: { type: String, required: true },
	//bdoc: { type: Buffer, required: true },
	ins: { type: Boolean, required: true, default: false },
	tags: [
		{
			owner: { type: String },
			group: { type: String },
			text: { type: String },
		},
	],
	worklog: { type: String, default: "full" },
	hasCover: { type: Boolean, default: false },
	coverTag: { type: String, default: "" },
	allowdiscuss: { type: Boolean, default: true },
	musthavepbo: { type: Boolean, default: true },
	ksid: { type: String, default: "", index: true },
	searchable: { type: Boolean, default: true, index: true },
	autostop: { type: Number, default: 0 },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});
schema.index({ tenant: 1, tplid: 1 }, { unique: true });

type extraFields = {
	cron?: number;
};
export type TemplateType = HydratedDocument<InferSchemaType<typeof schema>> & extraFields;
export const Template = model("Template", schema);
