"use strict";
import { Schema, InferSchemaType, model, HydratedDocument } from "mongoose";
interface ITimestamp {
	_id: Schema.Types.ObjectId | string;
	createdAt: Date;
	updatedAt: Date;
}

const schema = new Schema(
	{
		tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
		eid: { type: String, required: true, index: true },
		objid: { type: String, required: [true, "不能为空"], index: true },
		signature: { type: String, required: [true, "不能为空"], index: false },
	},
	{ timestamps: true },
);
export type SignatureType = HydratedDocument<InferSchemaType<typeof schema>> & ITimestamp;

export const Signature = model("Signature", schema);
