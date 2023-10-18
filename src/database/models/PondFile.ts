import { Schema, InferSchemaType, HydratedDocument, model } from "mongoose";

const schema = new Schema({
	tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
	pondid: String,
	serverId: String,
	realName: String,
	contentType: String,
	author: String,
	createdAt: { type: Date },
	updatedAt: { type: Date },
});
export type PondFileType = HydratedDocument<InferSchemaType<typeof schema>>;
export const PondFile = model("PondFile", schema);
