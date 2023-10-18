"use strict";
import { Schema, InferSchemaType, model, HydratedDocument } from "mongoose";
interface ITimestamp {
	_id: Schema.Types.ObjectId | string;
	createdAt: Date;
	updatedAt: Date;
}

const schema = new Schema(
	{
		//部署站点编码
		site: String,
		account: { type: String, index: true, required: true, lowercase: true },
		//用户名，显示名，比如中文名字
		username: { type: String, required: true },
		//用户登录密码
		password: { type: String, required: true },
		// 手机验证码
		phone: { type: String, unique: true, required: true },
		// 填入手机时候，做个短信验证
		phoneVerified: { type: Boolean, default: false },
		// 微信授权登录的openid
		openId: { type: String, default: "" },
		// 微信授权登录的unionId
		unionId: { type: String, default: "" },
		// 最后登录的组织
		tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
		demo: { type: Boolean, default: false },
		validuntil: { type: Number, default: -1 },
		expire: { type: Number, default: -1 },
		chatgpt_api_key: { type: String, default: "" },
		chatglm_api_key: { type: String, default: "" },
	},
	{ timestamps: true },
);
schema.index({ site: 1, account: 1 }, { unique: true });

export type UserType = HydratedDocument<InferSchemaType<typeof schema>> & ITimestamp;

export const User = model("User", schema);
