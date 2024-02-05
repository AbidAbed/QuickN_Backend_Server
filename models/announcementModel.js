const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    announcementTitle: {
      type: String,
      required: true,
    },
    announcementText: {
      type: String,
      required: true,
    },
    checkedUsers: [
      {
        userId: {
          type: String,
        },
        username: {
          type: String,
        },
        checkedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

const Announcement = mongoose.model("announcements", announcementSchema);

module.exports = Announcement;
