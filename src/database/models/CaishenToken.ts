"use strict";
import { Schema, InferSchemaType, model, HydratedDocument } from "mongoose";

const schema = new Schema({
	uid: { type: Schema.Types.ObjectId, ref: "User", index: true },
	token: { type: Number, required: [true, "不能为空"], index: false },
});
export type CaishenTokenType = HydratedDocument<InferSchemaType<typeof schema>>;

export const CaishenToken = model("CaishenToken", schema);
