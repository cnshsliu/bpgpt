"use strict";
import { Schema, InferSchemaType, model, HydratedDocument } from "mongoose";
//
//The document structure definition

//Same fields as Parse.com
const schema = new Schema({
	tenant: { type: Schema.Types.ObjectId, ref: "Tenant" },
	wfid: { type: String, required: [true, "不能为空"], index: true },
	round: { type: Number, default: 0 },
	from_nodeid: { type: String }, // 从那个node过来
	from_title: { type: String }, // 从那个node过来
	to_title: { type: String }, // 从那个node过来
	from_nodetype: { type: String },
	to_nodetype: { type: String },
	to_nodeid: { type: String }, //到哪个node
	from_workid: { type: String }, //从哪个work过来
	to_workid: { type: String }, //到哪个work
	route: { type: String }, //路径是什么
	status: { type: String, required: true, index: true }, //状态应该都是ST_DONE
	doneat: { type: String, required: false }, //插入时间
});

export type RouteType = HydratedDocument<InferSchemaType<typeof schema>>;
export const Route = model("Route", schema);
