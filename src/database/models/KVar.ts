import Mongoose from "mongoose";

const schema = new Mongoose.Schema(
  {
    tenant: { type: Mongoose.Schema.Types.ObjectId, ref: "Tenant" },
    round: { type: Number, default: 0 },
    wfid: { type: String, required: [true, "不能为空"] },
    nodeid: { type: String, required: [true, "不能为空"] },
    objid: { type: String, required: [true, "不能为空"] },
    doer: { type: String, required: [true, "不能为空"] },
    content: { type: String, required: [true, "不能为空"] },
    eff: { type: String, default: "yes" },
  },
  { timestamps: true }
);

export default Mongoose.model("kvar", schema);
