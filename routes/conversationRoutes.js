const {Router} = require("express")
const Conversation = require("../models/conversationModel")
const {createConversation , getUserConversation} = require("../controllers/conversationControllers")

const router = Router()


router.post("/" , createConversation)

router.get("/:userId" , getUserConversation)


module.exports = router