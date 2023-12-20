const mongoose = require("mongoose")


const groupSchema = new mongoose.Schema({
    groupName : {
        type : String,
        required : true,
        unique : true
    },
    groupCreatorId : {
        type : String
    },
    // will be an array of objects that each object contain user id 
    groupMembers : {
        type : [String]
    },
    groupMessages : [{
        type : mongoose.Schema.Types.ObjectId ,
        ref : "messages"
    }],
    conversationId : {
        type : String
    }
}, {timestamps : true})



const Group = mongoose.model("groups" , groupSchema)


module.exports = Group