const {Router} = require("express")
const Conversation = require("../models/conversationModel")
const {createConversation , getUserConversations} = require("../controllers/conversationControllers")

const router = Router()


router.post("/" , createConversation)

router.get("/:userId" , getUserConversations)


router.get("/getConversation/:conversastionId" , async(req , res , next) => {
    try {
        const conversation = await Conversation.findById(req.params.conversastionId)
        res.status(200).json(conversation)
    } catch (error) {
        next(error)
    }
})


module.exports = router