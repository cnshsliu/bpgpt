import Mongoose from "mongoose";

const schema = new Mongoose.Schema(
  {
    tenant: { type: Mongoose.Schema.Types.ObjectId, ref: "Tenant" },
    cmtid: { type: String, required: true },
    who: { type: String, required: true },
    upordown: {
      type: String,
      enum: ["UP", "DOWN"],
      default: "UP",
    },
  },
  { timestamps: true }
);

export default Mongoose.model("Thumb", schema);
