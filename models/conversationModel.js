const mongoose = require("mongoose")


const conversationSchema = new mongoose.Schema({
    members :{ 
        type : Array
    }
} , {timestamps : true})


const Conversation = mongoose.model("conversations" , conversationSchema)

module.exports = Conversation