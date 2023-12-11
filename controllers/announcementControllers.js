const Joi = require("joi")
const createError = require("../utils/createError")
const Announcement = require("../models/announcementModel")


const addAnnouncement = async (req , res , next) => {

    const announcementSchema = Joi.object({
        announcementTitle : Joi.string().required().min(3) ,
        announcementText : Joi.string().required().min(10)
    })

    const {value , error} = announcementSchema.validate(req.body)

    if(error){
        return next(createError(400 , "Invalid Announcement Credentials"))
    }

    const {announcementTitle , announcementText} = value

    try {

        const announcement = new Announcement({
            announcementTitle,
            announcementText
        })

        await announcement.save()

        res.status(201).json(announcement)

    } catch (error) {
        next(error)
    }
}




const getAnnouncements = async (req , res , next) => {
    try {
        const announcements = await Announcement.find()
        res.status(200).json(announcements)
    } catch (error) {
        next(error)
    }
}

 
module.exports = {addAnnouncement , getAnnouncements}