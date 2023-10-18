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
		taskid: { type: String, required: true, index: true },
		scenid: { type: String, required: true, index: true },
		extras: { type: Object },
		usermsg: String,
		autoask: { type: Boolean, default: true },
		instance: { type: Boolean, default: false, index: true },
		deleted: { type: Boolean, default: false, index: true },
	},
	{ timestamps: true },
);

export type GptTaskDataType = InferSchemaType<typeof schema>;
export type GptTaskType = HydratedDocument<InferSchemaType<typeof schema>> & ITimestamp;
export const GptTask = model("GptTask", schema);
