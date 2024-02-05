
const errorHandler = (err , req , res , next) => {

    const defaultErrorObj = {
        statusCode : err.status || 500 ,
        msg : err.message || "Somthing went wrong"
    }

    if(err.name === "CastError"){
        defaultErrorObj.msg = `Resource with this id not found `,
        defaultErrorObj.statusCode = 404
    }

    if(err.code && err.code === 11000){
        defaultErrorObj.statusCode = 500
        defaultErrorObj.msg = "user already exist"
    }

    res.status(defaultErrorObj.statusCode).json({
        success : false ,
        msg : defaultErrorObj.msg ,
    })
    
}


module.exports = errorHandler