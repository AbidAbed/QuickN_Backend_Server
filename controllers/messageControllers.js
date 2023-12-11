const Message = require("../models/messageModel")
const File = require("../models/fileModel")


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




const getUserFilesInsideMessage = async (req , res , next) => {

    const {msgId} = req.params
    
    try {

        const msg = await Message.findById(msgId)
        res.status(200).json({fileId : msg.file})

    } catch (error) {
        next(error)
    }
}



const getFile = async (req , res , next) => {

    const {fileId} = req.params 

    try {
        const file = await File.findById(fileId)
        res.status(200).json(file)
    } catch (error) {
        next(error)
    }
}



module.exports = {newMessage , getMessagesInsideConversation , getUserFilesInsideMessage , getFile}