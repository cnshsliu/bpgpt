"use strict";
import { Schema, InferSchemaType, model, HydratedDocument } from "mongoose";

const schema = new Schema({
	account: { type: String, index: true },
	scenid: { type: String, index: true },
	usedat: { type: Number, default: 0, index: true },
});

export type GptScenUsedDataType = InferSchemaType<typeof schema>;
export type GptScenUsedType = HydratedDocument<InferSchemaType<typeof schema>>;
export const GptScenUsed = model("GptScenUsed", schema);
