"use strict";
import { Schema, InferSchemaType, model, HydratedDocument } from "mongoose";
interface ITimestamp {
	_id: Schema.Types.ObjectId | string;
	createdAt: Date;
	updatedAt: Date;
}

const schema = new Schema(
	{
		uid: { type: Schema.Types.ObjectId, ref: "User", index: true },
		sharekey: { type: String, index: true },
		by: { type: String, index: false },
		question: String,
		answers: { type: [String] },
		images: { type: [String] },
		period: String,
		deleted: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

export type GptShareItDataType = InferSchemaType<typeof schema>;
export type GptShareItType = HydratedDocument<InferSchemaType<typeof schema>> & ITimestamp;

export const GptShareIt = model("GptShareIt", schema);
