const {Router} = require("express")
const Conversation = require("../models/conversationModel")
const {createConversation , getUserConversations} = require("../controllers/conversationControllers")
const auth = require("../middlewares/auth");
const User = require("../models/userModel");
const Group = require("../models/groupModel");
const router = Router()


router.post("/" ,auth, createConversation)

router.get("/:userId" , auth , getUserConversations)

router.get(
    "/getConversation/:conversastionId",
    auth,
    async (req, res, next) => {
      try {

        const conversation = await Conversation.findById(
          req.params.conversastionId
        );

        if (conversation.isGroup) {
          const group = await Group.findOne({ conversationId: conversation._id });
          res.status(200).json({ ...conversation._doc, convName: group.groupName });
        } else {
          const users = await Promise.all(
            conversation.members.map((memberUser) =>
              User.findOne({ _id: memberUser })
            )
          );

          const [receiverUser] = users.filter((usr) => usr._id !== req.userId);
          res
            .status(200)
            .json({ ...conversation._doc, convName: receiverUser.username });
        }
        
      } catch (error) {
        next(error);
      }
    }
  );



// router.get("/getConversation/:conversastionId" ,auth, async(req , res , next) => {
//     try {
//         const conversation = await Conversation.findById(req.params.conversastionId)
//         res.status(200).json(conversation)
//     } catch (error) {
//         next(error)
//     }
// })


module.exports = router