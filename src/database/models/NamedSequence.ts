"use strict";
import Mongoose from "mongoose";

const schema = new Mongoose.Schema({
  sequence_name: { type: String, unique: true },
  sequence_value: { type: Number },
});

schema.statics.getNextSequenceValue = async function (sequenceName) {
  let sequenceDocument = await this.db.models["Counter"].findOneAndUpdate(
    { sequence_name: sequenceName },
    { $inc: { sequence_value: 1 } },
    { upsert: true, new: true }
  );
  return sequenceDocument.sequence_value;
};

export default Mongoose.model("Counter", schema);
