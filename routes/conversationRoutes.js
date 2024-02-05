const {Router} = require("express")
const Conversation = require("../models/conversationModel")
const {createConversation , getUserConversations} = require("../controllers/conversationControllers")
const auth = require("../middlewares/auth");
const router = Router()


router.post("/" ,auth, createConversation)

router.get("/:userId" ,auth, getUserConversations)


router.get("/getConversation/:conversastionId" ,auth, async(req , res , next) => {
    try {
        const conversation = await Conversation.findById(req.params.conversastionId)
        res.status(200).json(conversation)
    } catch (error) {
        next(error)
    }
})


module.exports = router