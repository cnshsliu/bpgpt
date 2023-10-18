/**
 * # DelayTimer.js
 *
 * The DelayTimer document for Mongoose
 *
 *
'use strict';
/**
 * ## Imports
 *
 */
//Mongoose - the ORM
import Mongoose from "mongoose";
//The document structure definition

//Same fields as Parse.com
const schema = new Mongoose.Schema(
  {
    tenant: { type: Mongoose.Schema.Types.ObjectId, ref: "Tenant" },
    //TODO: DelayTimer Round
    round: { type: Number, default: 0 },
    teamid: { type: String, required: [true, "不能为空"] },
    tplid: { type: String, required: [true, "不能为空"] },
    wfid: { type: String, required: [true, "不能为空"] },
    wfstatus: { type: String, required: [true, "不能为空"], index: true },
    nodeid: { type: String, required: [true, "不能为空"] },
    workid: { type: String, required: [true, "不能为空"] },
    time: { type: Number, required: true },
  },
  { timestamps: false }
);
schema.index({ wfid: 1, nodeid: 1 }, { unique: true });

export default Mongoose.model("DelayTimer", schema);
