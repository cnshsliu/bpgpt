"use strict";
import Mongoose from "mongoose";

const schema = new Mongoose.Schema({
  tenant: { type: Mongoose.Schema.Types.ObjectId, ref: "Tenant" },
  owner: { type: String },
  webhook: { type: String },
  tplid: { type: String },
  key: { type: String },
});

export default Mongoose.model("Webhook", schema);
