import { Schema, InferSchemaType, HydratedDocument, model } from "mongoose";
const schema = new Schema(
	{
		tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
		rehearsal: { type: Boolean, default: false },
		who: { type: String, required: true },
		towhom: { type: String, required: true },
		objtype: {
			type: String,
			enum: ["SITE", "TENANT", "TEMPLATE", "WORKFLOW", "WORK", "TODO", "COMMENT"],
			default: "TENANT",
		},
		objid: { type: String },
		threadid: { type: String },
		people: { type: [String], default: [] },
		content: { type: String, default: "" },
		context: {
			wfid: String,
			workid: String,
			todoid: String,
			biztitle: String,
		},
	},
	{ timestamps: true },
);

type extraFields = {
	todoTitle?: string;
	todoDoer?: string;
	todoDoerCN: string;
	whoCN?: string;
	towhomCN: string;
	splitted: string[];
	mdcontent: string;
	mdcontent2: string;
	transition: boolean;
	showChildren: boolean;
	children: any[];
	upnum: number;
	downnum: number;
};
export type CommentType = HydratedDocument<InferSchemaType<typeof schema>> & extraFields;
export const Comment = model("Comment", schema);
