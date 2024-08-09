const Conversation = require("../models/conversationModel");
const Group = require("../models/groupModel");
const User = require("../models/userModel");
const Message = require("../models/messageModel");
const mongoose = require("mongoose")

// const createConversation = async (req, res, next) => {
//   const { senderId, receiverId } = req.body;

//   try {
//     const conversation = new Conversation({
//       members: [senderId, receiverId],
//     });

//     await conversation.save();

//     res.status(201).json(conversation);
//   } catch (error) {
//     next(error);
//   }
// };


const createConversation = async (req, res, next) => {
  const { senderId, receiverId } = req.body;

  try {
    const conversation = new Conversation({
      members: [senderId, receiverId],
    });

    await conversation.save();

    const receiveruser = await User.findOne({ _id: receiverId });

    res.status(201).json({ ...conversation._doc, convName: receiveruser.username });

  } catch (error) {
    console.log(error);
    next(error);
  }
};



const getUserConversations = async (req, res, next) => {
  try {
    // find all conversation that the userId param exist inside the members array key

    let userConversations = await Conversation.find({
      members: req.params.userId,
    });

    userConversations = userConversations.map((userConver) => {
      return {
        ...userConver._doc,
        isUnread: !userConver.readBy.includes(req.userId),
      };
    });

    let userConvs = await Promise.all(
      userConversations.map(async (curr) => {
        let convName, convAvatar, latestMessage;


        // b3d el break
        [latestMessage] = await Message.aggregate([
          {
            $match: {
              conversationId: curr._id.toString(),
              hiddenFor: {
                $not: {
                  $elemMatch: { $eq: new mongoose.Types.ObjectId(req.userId) }
                }
              }
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: 1 }, // Fetch more messages than needed
        ]);

        if (curr.isGroup) {
          const group = await Group.findOne({ conversationId: curr._id });
          convName = group.groupName;
          convAvatar = group.avatar;
        } else {
          const [userId] = curr.members.filter(
            (usrId) => usrId !== req.params.userId
          );
          const user = await User.findOne({ _id: userId });
          convName = user.username;
          convAvatar = user.avatar;
        }

        if (latestMessage === undefined) {
          return {
            ...curr,
            convName,
            convAvatar,
            latestMessage: { createdAt: curr.createdAt }
          };
        } else {
          return {
            ...curr,
            convName,
            convAvatar,
            latestMessage
          };
        }

      })
    );

    userConvs = userConvs.sort((a, b) => {

      const dateA = new Date(a.latestMessage.createdAt).getTime()
      const dateB = new Date(b.latestMessage.createdAt).getTime()

      return dateB - dateA

    })

    console.log(userConvs);

    res.status(200).json(userConvs);

  } catch (error) {
    console.log(error);
    next(error);
  }
};



// const getUserConversations = async (req, res, next) => {
//   try {
//     // find all conversation that the userId param exist inside the members array key

//     let userConversations = await Conversation.find({
//       members: req.params.userId,
//     });

//     userConversations = userConversations.map((userConver) => {
//       return {
//         ...userConver._doc,
//         isUnread: !userConver.readBy.includes(req.userId),
//       };
//     });

//     // console.log(userConversations);
//     res.status(200).json(userConversations);
//   } catch (error) {
//     next(error);
//   }
// };


module.exports = { createConversation, getUserConversations };
