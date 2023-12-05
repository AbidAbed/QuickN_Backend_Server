const mongoose = require("mongoose")
const validator = require("validator")
const bcrypt = require("bcrypt")


const userSchema = new mongoose.Schema({
    username : {
        type : String ,
        required : true,
        unique : true
    },
    email : {
        type : String,
        required : true,
        unique : true ,
        validate : validator.isEmail
    },
    password :{
        type : String,
        required : true,
        minlength : 6 ,
        select : false
    }
} , {timestamps : true})



userSchema.pre("save" , async function(){

    if(!this.isModified("password")) return
    
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(this.password , salt)
    this.password = hashedPassword

})


const User = mongoose.model("users" , userSchema)


module.exports = User