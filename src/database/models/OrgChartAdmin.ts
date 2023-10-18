"use strict";
import Mongoose from "mongoose";

const schema = new Mongoose.Schema({
	tenant: { type: Mongoose.Schema.Types.ObjectId, ref: "Tenant" },
	admins: [String],
});
schema.index({ tenant: 1 }, { unique: true });

export default Mongoose.model("OrgChartAdmin", schema);
