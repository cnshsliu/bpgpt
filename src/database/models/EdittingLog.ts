import { Schema, InferSchemaType, model, HydratedDocument } from "mongoose";

//Same fields as Parse.com
const schema = new Schema({
	tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
	objtype: { type: String, required: [true, "不能为空"] },
	objid: { type: String, required: [true, "不能为空"], index: true },
	editor: { type: String, required: [true, "不能为空"], index: true },
	editorName: { type: String, required: [true, "不能为空"], index: false },
	createdAt: { type: Date },
	updatedAt: { type: Date },
});

export type EdittingLogType = HydratedDocument<InferSchemaType<typeof schema>>;
export const EdittingLog = model("EdittingLog", schema);
