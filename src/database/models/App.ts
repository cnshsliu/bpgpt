/**
 * # App.js
 *
 * The App document for Mongoose
 *
 *
'use strict';
/**
 * ## Imports
 *
 */
import Joi from "joi";
//Mongoose - the ORM
import Mongoose from "mongoose";

//Same fields as Parse.com
const schema = new Mongoose.Schema(
  {
    tenant: { type: Mongoose.Schema.Types.ObjectId, ref: "Tenant" },
    appid: { type: String, required: [true, "不能为空"], index: true },
    appkey: { type: String, required: [true, "不能为空"], index: true },
  },
  { timestamps: true }
);

export default Mongoose.model("App", schema);
