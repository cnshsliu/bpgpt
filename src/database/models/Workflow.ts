import { Schema, InferSchemaType, HydratedDocument, model } from "mongoose";

let _startTime = null;
const schema = new Schema(
	{
		wfid: {
			type: String,
			required: [true, "不能为空"],
			index: true,
			unique: true,
		},
		pboat: {
			type: String,
			enum: ["STARTER_START", "STARTER_RUNNING", "STARTER_ANY", "ANY_RUNNING", "ANY_ANY"],
			default: "ANY_RUNNING",
		},
		endpoint: { type: String, default: "" },
		endpointmode: { type: String, default: "both" },
		wftitle: { type: String, required: true },
		tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
		teamid: { type: String, required: false, default: "" },
		tplid: { type: String, required: [true, "不能为空"], index: true },
		pbostatus: { type: String, required: false, default: "" },
		status: { type: String, required: [true, "不能为空"], index: true },
		starter: { type: String, required: [true, "不能为空"], index: true },
		doc: { type: String, required: true },
		rehearsal: { type: Boolean, required: true, default: false, index: true },
		runmode: { type: String, default: "standalone" },
		version: { type: Number, default: 1 },
		attachments: { type: [Schema.Types.Mixed], default: [] },
		pnodeid: { type: String, required: false, default: "" },
		pworkid: { type: String, required: false, default: "" },
		cselector: { type: [String], default: [] },
		allowdiscuss: { type: Boolean, default: true },
		createdAt: { type: Date },
		updatedAt: { type: Date },
	},
	{ timestamps: true },
);
// schema.pre("find", function () {
// 	_startTime = Date.now();
// });

// schema.post("find", function () {
// 	if (_startTime != null) {
// 		console.log("Runtime find Workflow in Milliseconds: ", Date.now() - _startTime);
// 	}
// });

type extraFields = {
	starterCN?: string;
	commentCount?: number;
};
export type WorkflowType = HydratedDocument<InferSchemaType<typeof schema>> & extraFields;
export const Workflow = model("Workflow", schema);
