const { boolean } = require("joi");
const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
    },
    path: {
      type: String,
    },
    createdName: { type: String },
    type: { type: String },
    extension: { type: String },
    numberOfPages: { type: mongoose.Schema.Types.Number },
    isUploading: {
      type: Boolean,
      default: false,
    },
    isUploaded: {
      type: Boolean,
      default: false,
    },
    // isConverted: {
    //   type: boolean,
    // default: false,
    // },
  },
  { timestamps: true }
);

const File = mongoose.model("files", fileSchema);

module.exports = File;
