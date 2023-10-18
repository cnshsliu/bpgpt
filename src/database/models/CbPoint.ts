/**
 * # CbPoint.js
 *
 * The CbPoint document for Mongoose
 *
 *
'use strict';
/**
 * ## Imports
 *
 */
//Mongoose - the ORM
import Mongoose from "mongoose";

const schema = new Mongoose.Schema(
  {
    tenant: { type: Mongoose.Schema.Types.ObjectId, ref: "Tenant" },
    tplid: { type: String, required: [true, "不能为空"], index: true },
    wfid: { type: String, required: [true, "不能为空"], index: true },
    nodeid: { type: String, required: [true, "不能为空"], index: true },
    workid: { type: String, required: [true, "不能为空"], index: true },
    round: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export default Mongoose.model("CbPoint", schema);
