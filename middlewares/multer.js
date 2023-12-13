const multer = require("multer")


const storage = multer.diskStorage({
    destination : function(req , file , cb){
        return cb(null , "./public/images")
    },
    filename : function(req , file , cb){
        console.log(file.originalname)
        return cb(null , file.originalname === "blob" ? file.originalname = file.originalname + Math.floor(Math.random() * 100) + ".mp3" : file.originalname)
    }
})


const upload = multer({storage})


module.exports = upload

