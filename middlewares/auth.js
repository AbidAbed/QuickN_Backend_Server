const jwt = require("jsonwebtoken")
const createError = require("../utils/createError")


const auth = async (req , res , next) => {

    const authHeader = req.headers.token_header
    
    // if the header is empty (no token value) , or the token don't starts with Bearer word
    if(!authHeader || !authHeader.startsWith("Bearer")){
        return next(createError(401 , "you are not authorized"))
    }

    let token = authHeader.split(" ")[1]

    // verify the token and check its value 
    jwt.verify(token , process.env.JWT_SECRET , (err , decodedToken) => {

        if(err){
            return next(createError(403 , "Invalid token"))  
        }

        // if everything ok . create a key inside the req object contain the payload obj that contains all response keys
        req.userId = decodedToken.userId

        next()

    })

}

module.exports = auth