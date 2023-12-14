const mongoose = require("mongoose")


const groupSchema = new mongoose.Schema({
    members :{
     type : Array
    },
    messages : {
        type : Array
    },
    createdBy : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "users"
    } 
}, {timestamps : true})


const Group = mongoose.model("groups" , groupSchema)

module.exports = Group