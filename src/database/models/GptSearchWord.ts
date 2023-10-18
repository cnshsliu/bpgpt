"use strict";
import { Schema, InferSchemaType, model, HydratedDocument } from "mongoose";

const schema = new Schema({
	account: { type: String, index: true },
	word: { type: String, index: true },
	times: { type: Number, default: 0, index: false },
});

export type GptSearchWordDataType = InferSchemaType<typeof schema>;
export type GptSearchWordType = HydratedDocument<InferSchemaType<typeof schema>>;
export const GptSearchWord = model("GptSearchWord", schema);
