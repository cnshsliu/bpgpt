import Mongoose from "mongoose";

const schema = new Mongoose.Schema({
	tenant: { type: String, required: true, index: true },
	eid: { type: String, required: true, index: true },
});

export default Mongoose.model("Kicklist", schema);
