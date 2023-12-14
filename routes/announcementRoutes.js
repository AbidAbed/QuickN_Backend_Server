const {Router} = require("express")
const {addAnnouncement , getAnnouncements} = require("../controllers/announcementControllers")
const verifyAdmin = require("../middlewares/verifyAdmin")
const Announcement = require("../models/announcementModel")
const User = require("../models/userModel")

const router = Router()


router.post("/addAnnouncement" , verifyAdmin , addAnnouncement)


router.get("/" , getAnnouncements)


router.get("/getAnnouncement" , async (req , res, next) => {
    try {
        const announcementsDocNum = await Announcement.countDocuments()
        res.status(200).json(announcementsDocNum)
    } catch (error) {
        next(error)
    }
})


router.put("/userChecked/:userId/:announcementId" , async (req , res , next) => {

    const {announcementId , userId} = req.params

    try {
        
        const user = await User.findById(userId)

        let announcement = await Announcement.findById(announcementId)
                
        announcement = await Announcement.findByIdAndUpdate(announcementId , {
            $push : {checkedUsers : user.username}
        },{new : true})

        res.status(200).json(announcement)

    } catch (error) {
        next(error)
    }
})





module.exports = router