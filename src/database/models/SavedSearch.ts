/**
 * # Todo.js
 *
 * The Todo document for Mongoose
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
		objtype: String,
		author: String,
		name: String,
		ss: String,
	},
	{ timestamps: true },
);

export default Mongoose.model("SavedSearch", schema);
