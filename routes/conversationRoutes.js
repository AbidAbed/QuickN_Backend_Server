const {Router} = require("express")
const Conversation = require("../models/conversationModel")
const {createConversation , getUserConversations} = require("../controllers/conversationControllers")

const router = Router()


router.post("/" , createConversation)

router.get("/:userId" , getUserConversations)


module.exports = router