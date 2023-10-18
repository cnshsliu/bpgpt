import Mongoose from "mongoose";

const schema = new Mongoose.Schema({
  tenant: { type: Mongoose.Schema.Types.ObjectId, ref: "Tenant" },
  author: { type: String, required: [true, "不能为空"], index: true },
  name: { type: String, required: [true, "不能为空"] },
  entries: [
    {
      key: { type: String, required: [true, "不能为空"] },
      items: { type: String, required: [true, "不能为空"] },
    },
  ],
});
schema.index(
  {
    tenant: 1,
    name: 1,
  },
  { unique: true }
);
export default Mongoose.model("List", schema);
