import { Schema, InferSchemaType, HydratedDocument, model } from "mongoose";

export const MENU_ACL_SELF = 0;
export const MENU_ACL_TENANT = 1;
const schema = new Schema({
	tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
	eid: String,
	url: String,
	pageName: String,
});

export type PersonalMenuItemType = HydratedDocument<InferSchemaType<typeof schema>>;
export const PersonalMenuItem = model("PersonalMenuItem", schema);
