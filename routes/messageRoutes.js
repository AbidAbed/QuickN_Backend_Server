const {Router} = require("express")
const {newMessage , getMessagesInsideConversation , getUserFilesInsideMessage , getFile} = require("../controllers/messageControllers")
const upload = require("../middlewares/multer")
const File = require("../models/fileModel")

const router = Router()


router.post("/" , newMessage)   


router.get("/:conversationId" , getMessagesInsideConversation)


router.post("/upload" , upload.single("file") , async (req , res , next) => {

    const file = {
        filename : req.file.originalname,
        path : req.file.path
    }

    try {

        const newFile = new File(file)  

        await newFile.save()

        res.status(201).json(newFile)

    } catch (error) {
        next(error)
    }

})




router.get("/getFileInMsg/:msgId" , getUserFilesInsideMessage)


router.get("/getFile/:fileId" , getFile)



module.exports = router