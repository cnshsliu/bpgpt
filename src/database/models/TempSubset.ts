import Mongoose from "mongoose";
const schema = new Mongoose.Schema(
	{
		admin: String,
		tranx: String,
		from: String,
		to: String,
		objtype: String,
		objid: String,
		objtitle: String,
	},
	{ timestamps: true },
);

export default Mongoose.model("TempSubset", schema);
