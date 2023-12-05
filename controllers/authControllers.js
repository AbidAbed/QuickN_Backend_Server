const Joi = require("joi")
const User = require("../models/userModel")
const createError = require("../utils/createError")


const signUp = async (req , res , next) => {

    const signUpSchema = Joi.object({
        username : Joi.string().required().min(3),
        email : Joi.string().email().required(),
        password : Joi.string().required().min(8),
        cpassword : Joi.ref("password") 
    })

    const {value , error} = signUpSchema.validate(req.body , {abortEarly : false})

    if(error){
        return next(createError(500 , "Inavlid Credentials"))
    }

    const {username , email , password} = value

    try {
        
        const isUserAlreadyExist = await User.findOne({email}) 

        if(isUserAlreadyExist){
            return next(createError(500 , "User already exist"))
        }

        const user = new User({
            username ,
            email ,
            password
        })

        await user.save()

        user.password = undefined

        // or
        // const {password , ...rest : rest} = user
        // res.json(rest)

        res.status(201).json(user)

    } catch (error) {
        next(error)
    }

}




const signIn = async (req , res , next) => {

}




module.exports = {signUp , signIn} 