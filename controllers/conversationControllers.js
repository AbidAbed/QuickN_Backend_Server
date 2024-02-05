const Conversation = require("../models/conversationModel");

const createConversation = async (req, res, next) => {
  const { senderId, receiverId } = req.body;

  try {
    const conversation = new Conversation({
      members: [senderId, receiverId],
    });

    await conversation.save();

    res.status(201).json(conversation);
  } catch (error) {
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

    // console.log(userConversations);
    res.status(200).json(userConversations);
  } catch (error) {
    next(error);
  }
};

module.exports = { createConversation, getUserConversations };
