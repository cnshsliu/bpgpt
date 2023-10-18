"use strict";
import { Schema, InferSchemaType, model, HydratedDocument } from "mongoose";

const schema = new Schema({
	groupid: { type: String, index: true },
	scenid: { type: String, index: true },
	desc: { type: String, index: false },
	tags: { type: [String], index: true },
	content: { type: Object },
});
schema.index({ groupid: 1, scenid: 1 }, { unique: true });

export type GptScenDataType = InferSchemaType<typeof schema>;
export type GptScenType = HydratedDocument<InferSchemaType<typeof schema>>;
export const GptScen = model("GptScen", schema);
