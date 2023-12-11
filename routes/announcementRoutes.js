const {Router} = require("express")
const {addAnnouncement , getAnnouncements} = require("../controllers/announcementControllers")
const verifyAdmin = require("../middlewares/verifyAdmin")

const router = Router()


router.post("/addAnnouncement" , verifyAdmin , addAnnouncement)

router.get("/" , getAnnouncements)


module.exports = router