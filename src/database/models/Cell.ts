import { Schema, InferSchemaType, HydratedDocument, model } from "mongoose";

const schema = new Schema({
	tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
	wfid: String,
	stepid: String,
	author: String,
	forKey: String,
	serverId: String,
	realName: String,
	contentType: String,
	cells: [[String]],
	createdAt: { type: Date },
	updatedAt: { type: Date },
});
type extraFields = {
	missedUIDs?: string[];
};
export type CellType = HydratedDocument<InferSchemaType<typeof schema>> & extraFields;
export const Cell = model("Cell", schema);
