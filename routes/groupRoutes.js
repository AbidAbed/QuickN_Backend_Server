const {Router} = require("express")
const {createGroup , updateGroup , deleteGroup , sendMsgInGroup , getAllMessagesInsideGroup} = require("../controllers/groupControllers")
const auth = require("../middlewares/auth")
const Group = require("../models/groupModel")

const router = Router()


router.post("/createGroup/:creatorId" , auth , createGroup)

router.put("/updateGroup/:groupId/:memberId" , auth , updateGroup)

router.post("/sendMsgInGroup/:groupId/:userId" , sendMsgInGroup)

router.delete("/deleteGroup/:groupId" , auth , deleteGroup)

router.get("/getAllMessagesInsideGroup/:groupId" , getAllMessagesInsideGroup)


router.get("/getGroup/:conversationId" , async (req , res , next) => {
    try {
        const group = await Group.findOne({conversationId : req.params.conversationId})
        res.status(200).json(group)
    } catch (error) {
        next(error)
    }
})



router.get("/getAllUserGroups/:userId" , async (req , res , next) => {
    try {
        const {userId} = req.params
        const groups = await Group.find({groupMembers : userId })
        res.status(200).json(groups)
    } catch (error) {
        next(error)
    }
})



router.get('/getGroupsDetails', async (req, res) => {
    try {
      const { groupIds } = req.query;
      // Fetch group details for the provided IDs
      const groups = await Group.find({ _id: { $in: groupIds } });
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  



module.exports = router