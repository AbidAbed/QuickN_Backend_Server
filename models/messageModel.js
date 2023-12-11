const mongoose = require("mongoose")


const messageSchema = new mongoose.Schema({
    conversationId : {
        type : String
    },
    sender : {
        type : String
    },
    text : {
        type : String        
    },
    file : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "files"
    }
} , {timestamps : true})


const Message = mongoose.model("messages" , messageSchema)


module.exports = Message