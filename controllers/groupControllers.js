const Group = require("../models/groupModel")
const User = require("../models/userModel")
const Message = require("../models/messageModel")
const Conversation = require("../models/conversationModel")

const createError = require("../utils/createError")


const createGroup = async (req , res , next) => {

    const {groupName} = req.body
    const {creatorId} = req.params

    try {
        
        const user = await User.findById(creatorId)

        const newGroup = new Group({
            groupName ,
            groupCreatorId : user._id
        })

        const conversation = new Conversation()

        newGroup.groupMembers.unshift(user._id)
        newGroup.conversationId = conversation._id

        conversation.isGroup = true

        if(!conversation.members.includes(user._id)){
            conversation.members.unshift(creatorId)
        }

        await conversation.save()
        await newGroup.save()

        res.status(201).json(newGroup)

    } catch (error) {
        next(error)
    }
}




const updateGroup = async (req , res , next) => {

    const {groupId , memberId} = req.params

    try {
        
        const group = await Group.findById(groupId)

        if(req.userId !== group.groupCreatorId) return next(createError(401 , "you are not authorized to update this group , creator only"))

        if(group.groupMembers.includes(memberId)) return next(createError(400 , "User already in this group"))

        const updatedGroup = await Group.findByIdAndUpdate(groupId , {
            $push : {groupMembers : memberId}
        } , {new : true})
        
        const conversation = await Conversation.findById(group.conversationId)

        conversation.members.push(memberId)

        await conversation.save()

        res.status(200).json(updatedGroup)
        
    } catch (error) {
        next(error)
    }
}




const sendMsgInGroup = async (req , res , next) => {

    try {
        
        const {groupId , userId} = req.params

        const {text} = req.body
        
        const group = await Group.findById(groupId)
        
        const msg = new Message({
            text,
            sender : userId,
            groupId,
            conversationId : group.conversationId
        })

        await msg.save()

        if(!group.groupMembers.includes(userId)) return next(createError(401 , "you are not a group member , you can't send a message"))

        group.groupMessages.unshift(msg)

        await group.save()

        res.status(201).json({group , msg})

    } catch (error) {
        next(error)        
    }
}




const deleteGroup = async (req , res , next) => {

    const {groupId} = req.params

    try {
        
        const group = await Group.findById(groupId)

        if(req.userId !== group.groupCreatorId) return next(createError(401 , "you are not authorized to delete this group , creator only"))

        await Promise.all(group.groupMessages.map((groupMessage) => {
            return Message.findByIdAndDelete(groupMessage)
        }))

        await Conversation.findByIdAndDelete(group.conversationId)

        await Group.findByIdAndDelete(groupId)

        res.status(200).json({msg: "Group deleted Successfully"})

    } catch (error) {
        next(error)
    }
}




const getAllMessagesInsideGroup = async (req , res , next) => {

    try {
        
        const {groupId} = req.params
        
        const group = await Group.findById(groupId)

        const groupMessages = await Promise.all(group.groupMessages.map((groupMessage) => {
            return Message.findById(groupMessage)
        }))

        res.status(200).json(groupMessages)

    } catch (error) {
        next(error)
    }
} 




module.exports = {createGroup , updateGroup , deleteGroup , sendMsgInGroup , getAllMessagesInsideGroup}