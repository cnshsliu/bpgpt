"use strict";
import { Schema, InferSchemaType, model, HydratedDocument } from "mongoose";

const schema = new Schema({
	groups: { type: [Object] },
});

export type GptScenarioGroupDataType = InferSchemaType<typeof schema>;
export type GptScenarioGroupType = HydratedDocument<InferSchemaType<typeof schema>>;
export const GptScenarioGroup = model("GptScenarioGroup", schema);
