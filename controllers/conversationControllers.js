const Conversation = require("../models/conversationModel")


const createConversation = async (req , res , next) => {

    const {senderId , receiverId} = req.body

    try {

        const conversation = new Conversation({
            members : [senderId , receiverId]
        })

        await conversation.save()
        res.status(201).json(conversation)

    } catch (error) {
        next(error)
    }
}




const getUserConversation = async (req , res , next) => {

    try {
        // find all conversation that the userId param exist inside the members array key  
        const userConversations = await Conversation.find({
            members : {$in : [req.params.userId]}
        })

        res.status(200).json(userConversations)

    } catch (error) {
        next(error)
    }
}



module.exports = {createConversation , getUserConversation
}