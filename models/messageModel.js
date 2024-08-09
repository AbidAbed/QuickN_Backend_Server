// const mongoose = require("mongoose")

// const messageSchema = new mongoose.Schema({
//     conversationId: {
//         type: String
//     },
//     sender: {
//         type: String
//     },
//     text: {
//         type: String        
//     },
//     file: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "files"
//     },
//     groupId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "groups"
//     },
//     hiddenFor: [{
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "users"
//     }],
//     isForwarded : {
//         type : Boolean ,
//         default : false
//     },
//     isFavorite : {
//         type : Boolean ,
//         default : false
//     }
// }, { timestamps: true });


// const Message = mongoose.model("messages" , messageSchema)


// module.exports = Message

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: String
    },
    sender: {
        type: String
    },
    text: {
        type: String
    },
    file: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "files"
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "groups"
    },
    hiddenFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    }],
    isForwarded : {
        type : Boolean ,
        default : false
    },
    isFavorite : {
        type : Boolean ,
        default : false
    }
}, { timestamps: true });

const Message = mongoose.model("messages", messageSchema);

module.exports = Message;
