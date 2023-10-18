import Mongoose from "mongoose";

const schema = new Mongoose.Schema({
	tenant: { type: Mongoose.Schema.Types.ObjectId, ref: "Tenant" },
	ou: { type: String, required: [true, "不能为空"], index: true },
	cn: { type: String, required: [true, "不能为空"], index: true },
	account: { type: String, required: [true, "不能为空"], index: true },
	eid: { type: String, required: true, index: true },
	position: [String],
});
schema.index({ tenant: 1, ou: 1, eid: 1 }, { unique: true });
schema.index({ "position.0": 1 }, { partialFilterExpression: { "position.0": { $exists: true } } });

export default Mongoose.model("OrgChart", schema);
