const mongoose = require("mongoose")


const announcementSchema = new mongoose.Schema({
    announcementTitle : {
        type : String,
        required : true
    },
    announcementText : {
        type : String,
        required : true
    }
} , {timestamps : true})


const Announcement = mongoose.model("announcements" , announcementSchema)

module.exports = Announcement