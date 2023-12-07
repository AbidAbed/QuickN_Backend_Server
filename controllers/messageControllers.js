const Message = require("../models/messageModel")


const newMessage = async (req , res , next) => {
    try {
        const newMessage = new Message(req.body)
        await newMessage.save()
        
        res.status(201).json(newMessage)
    } catch (error) {
        next(error)
    }
}



const getMessagesInsideConversation = async (req , res , next) => {
    try {
        
        const messages = await Message.find({
            conversationId : req.params.conversationId
        })

        res.status(200).json(messages)

    } catch (error) {
        next(error)
    }
}



module.exports = {newMessage , getMessagesInsideConversation}