import { Schema, InferSchemaType, HydratedDocument, model } from "mongoose";
interface ITimestamp {
	_id: Schema.Types.ObjectId | string;
	createdAt: Date;
	updatedAt: Date;
}

const schema = new Schema(
	{
		tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
		uid: { type: String, required: [true, "不能为空"], index: true },
		bsid: { type: String, required: true, index: true },
		scenid: String,
		advisor: String,
		taskid: String,
		qas: [{ question: String, answer: String }],
		summary: String,
		deleted: { type: Boolean, default: false, index: true },
	},
	{ timestamps: true },
);

export type GptLogDataType = InferSchemaType<typeof schema>;
export type GptLogType = HydratedDocument<InferSchemaType<typeof schema>> & ITimestamp;
export const GptLog = model("GptLog", schema);
