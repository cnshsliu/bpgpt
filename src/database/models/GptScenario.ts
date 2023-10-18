"use strict";
import { Schema, InferSchemaType, model, HydratedDocument } from "mongoose";

const schema = new Schema({
	groupid: { type: String, index: true },
	scenarios: { type: [Object] },
});

export type GptScenarioDataType = InferSchemaType<typeof schema>;
export type GptScenarioType = HydratedDocument<InferSchemaType<typeof schema>>;
export const GptScenario = model("GptScenario", schema);
