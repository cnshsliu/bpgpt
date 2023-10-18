import Mongoose from "mongoose";

const schema = new Mongoose.Schema(
	{
		author: { type: String, required: [true, "不能为空"], index: true },
		ksid: { type: String, required: [true, "不能为空"], index: true },
		name: { type: String, required: [true, "不能为空"], index: false, default: "" },
		desc: { type: String, required: false, index: false, default: "" }, //in Markdown format
		tags: { type: [String], default: [] },
		fileExists: { type: Boolean, default: true },
		doc: { type: String, required: true, index: false, default: "" },
		price: { type: Number, default: 0 },
	},
	{ versionKey: false },
);

export default Mongoose.model("KSTPL", schema);
