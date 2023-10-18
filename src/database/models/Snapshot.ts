import { Schema, InferSchemaType, HydratedDocument, model } from "mongoose";

//Same fields as Parse.com
const schema = new Schema({
	tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
	tplid: { type: String, required: [true, "不能为空"], index: true },
	svg: { type: String, required: true },
});

export type SnapshotType = HydratedDocument<InferSchemaType<typeof schema>>;
export const Snapshot = model("Snapshot", schema);
