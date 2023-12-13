const {Router} = require("express")
const {newMessage , getMessagesInsideConversation , getUserFilesInsideMessage , getFile} = require("../controllers/messageControllers")
const upload = require("../middlewares/multer")
const File = require("../models/fileModel")


const router = Router()


router.post("/" , newMessage)   


router.get("/:conversationId" , getMessagesInsideConversation)


router.post("/upload" , upload.single("file")  , async (req , res , next) => {

    // let filename = req.file.originalname === "blob" ? req.file.originalname = req.file.originalname + Math.floor(Math.random() * 100) + ".mp3" : req.file.originalname
    // let path = req.file.originalname.includes("blob") ? req.file.path = `public/images/${filename}` : req.file.path

    const file = {
        filename : req.file.originalname,   
        path : req.file.path
    }

    // console.log(filename)
    // console.log(path)

    try {

        const newFile = new File(file)  

        await newFile.save()

        res.status(201).json(newFile)

    } catch (error) {
        next(error)
    } 

})




// router.post("/upload/voice" , upload.single("file")  , async (req , res , next) => {

//     try {

//         const newFile = new File(req.body)  

//         await newFile.save()

//         res.status(201).json(newFile)

//     } catch (error) {
//         next(error)
//     }

// })



router.get("/getFileInMsg/:msgId" , getUserFilesInsideMessage)

 

router.get("/getFile/:fileId" , getFile)



module.exports = router