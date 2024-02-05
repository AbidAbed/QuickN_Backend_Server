const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    members: {
      type: Array,
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    readBy: [String],
  },
  { timestamps: true }
);

const Conversation = mongoose.model("conversations", conversationSchema);

module.exports = Conversation;
