import { Schema, InferSchemaType, HydratedDocument, model } from "mongoose";

const schema = new Schema(
	{
		tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
		author: { type: String, required: [true, "不能为空"], index: true },
		teamid: {
			type: String,
			required: [true, "不能为空"],
			index: true,
			minlength: 2,
			maxlength: 40,
		},
		tmap: { type: Object },
		createdAt: { type: Date },
		updatedAt: { type: Date },
	},
	{ timestamps: true },
);
schema.index({ tenant: 1, teamid: 1 }, { unique: true });

export type TeamType = HydratedDocument<InferSchemaType<typeof schema>>;
export const Team = model("Team", schema);
