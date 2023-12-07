const Joi = require("joi")
const bcrypt = require("bcrypt")
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

    const signInSchema = Joi.object({
        username : Joi.string().required().min(3),
        password : Joi.string().required().min(8)
    })

    const {value , error} = signInSchema.validate(req.body , {abortEarly : false})

    if(error){
        return next(createError(400 , "Invalid Credentials"))
    }

    const {username , password} = value

    try {
        
        const user = await User.findOne({username}).select("+password")

        if(!user){
            return next(createError(404 , "User not exist"))
        }

        const isPasswordMatched = await bcrypt.compare(password , user.password)

        if(!isPasswordMatched){
            return next(createError(400 , "Incorrect password"))
        }

        user.password = undefined

        const token = user.createJWT()

        const {isAdmin , isAnnouncing} = user

        res.cookie("access_token" , token , {httpOnly : true}).status(200).json({user , isAdmin , isAnnouncing , token})

    } catch (error) {
        next(error)
    }
}




const getUser = async (req , res , next) => {
    try {
        
        const userId = req.query.userId
        const user = await User.findById(userId)

        if(!user){
            return next(createError(404 , "User with this id not found"))
        }

        res.status(200).json(user)

    } catch (error) {
        next(error)
    }
}



module.exports = {signUp , signIn , getUser} 