const { Router } = require("express");
const {
  createGroup,
  updateGroup,
  freezGroup,
  sendMsgInGroup,
  getAllMessagesInsideGroup,
  removeSingleUser,
} = require("../controllers/groupControllers");
const auth = require("../middlewares/auth");
const Group = require("../models/groupModel");
const Conversation = require("../models/conversationModel");
const verifyAdmin = require("../middlewares/verifyAdmin");
const router = Router();

router.post("/createGroup/:creatorId", verifyAdmin, createGroup);

router.put("/updateGroup/:conversationId", verifyAdmin, updateGroup);

router.delete("/deleteGroup/:conversationId", verifyAdmin, freezGroup);

router.post("/sendMsgInGroup/:groupId/:userId", auth, sendMsgInGroup);

router.get(
  "/getAllMessagesInsideGroup/:groupId",
  auth,
  getAllMessagesInsideGroup
);

router.get("/getGroup/:conversationId", auth, async (req, res, next) => {
  try {
    const group = await Group.findOne({
      conversationId: req.params.conversationId,
    });
    res.status(200).json(group);
  } catch (error) {
    next(error);
  }
});

router.get("/getAllUserGroups/:userId", auth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const groups = await Group.find({ groupMembers: userId });
    res.status(200).json(groups);
  } catch (error) {
    next(error);
  }
});

router.get("/getGroupsDetails", auth, async (req, res) => {
  try {
    const { groupIds } = req.query;
    // Fetch group details for the provided IDs
    const groups = await Group.find({ _id: { $in: groupIds } });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get(
  "/getAllConversationInsideGroup/:groupId",
  auth,
  async (req, res, next) => {
    const conversationInsideGroup = await Conversation.findById(
      req.params.groupId
    );

    res.status(200).json(conversationInsideGroup);
  }
);

router.delete("/deleteGroups", verifyAdmin, async (req, res, next) => {
  try {
    await Group.deleteMany();
  } catch (error) {
    next(error);
  }
});

router.delete("/user", verifyAdmin, removeSingleUser);

module.exports = router;
