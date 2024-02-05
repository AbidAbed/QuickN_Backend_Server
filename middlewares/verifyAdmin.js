const jwt = require("jsonwebtoken")
const createError = require("../utils/createError")


const verifyAdmin = (req , res , next) => {

    const adminHeader = req.headers.admin_header
    
    // if there is no header (empty value) or it doesn't start with admin keyword
    if(!adminHeader || !adminHeader.startsWith("admin")){
        return next(createError(401 , "you are not authorized"))
    }

    let token = adminHeader.split(" ")[1]

    try {
        
        jwt.verify(token , process.env.JWT_SECRET , (err , decodedToken) => {
            
            // if the sent token not valid or expierd
            if(err){
                return next(createError(403 , "Invalid token , access forbiden"))
            }
    
            const {isAdmin , isAnnouncing, userId} = decodedToken
            
            // after we verify the token if the isAdmin , isAnnouncing keys from the payload object are false
            if(!isAdmin || !isAnnouncing) return next(createError(401 , "Access denied"))
    
            req.isAdmin = isAdmin
            req.isAnnouncing = isAnnouncing

            req.userId = userId
            next()

        })
    } catch (error) {
        next(error)
    }
}


module.exports = verifyAdmin