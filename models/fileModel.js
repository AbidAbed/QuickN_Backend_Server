const mongoose = require("mongoose")


const fileSchema = new mongoose.Schema({
    filename : {
        type : String
    },
    path : {
        type : String
    }
} , {timestamps : true})


const File = mongoose.model("files" , fileSchema)


module.exports = File
