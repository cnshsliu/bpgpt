import { Schema, InferSchemaType, HydratedDocument, model } from "mongoose";

//Same fields as Parse.com
const schema = new Schema({
	tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
	context: {
		tenant: String,
		eid: String,
		tplid: String,
		wfid: String,
		workid: String,
		todoid: String,
	},
	key: { type: String, required: [true, "不能为空"], index: true },
	data: { type: Object },
});

export type DataType = HydratedDocument<InferSchemaType<typeof schema>>;
export const Data = model("Data", schema);
