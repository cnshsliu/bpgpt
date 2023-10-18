import { Schema, InferSchemaType, HydratedDocument, model } from "mongoose";

export const MENU_ACL_SELF = 0;
export const MENU_ACL_TENANT = 1;
const schema = new Schema({
	tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
	acl: {
		type: Number,
		required: true,
		index: true,
		default: MENU_ACL_SELF,
	},
	eid: { type: String, required: [true, "不能为空"], index: true },
	mg: { type: String, required: true, index: true },
	def: { type: Object },
});

export type MenuDataType = InferSchemaType<typeof schema>;
export type MenuType = HydratedDocument<InferSchemaType<typeof schema>>;
export const Menu = model("Menu", schema);
