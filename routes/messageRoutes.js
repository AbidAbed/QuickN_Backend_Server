const {Router} = require("express")
const {newMessage , getMessagesInsideConversation} = require("../controllers/messageControllers")

const router = Router()


router.post("/" , newMessage)


router.get("/:conversationId" , getMessagesInsideConversation)


module.exports = router