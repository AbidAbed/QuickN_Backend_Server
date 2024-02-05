const Group = require("../models/groupModel");
const User = require("../models/userModel");
const Message = require("../models/messageModel");
const Conversation = require("../models/conversationModel");

const createError = require("../utils/createError");

const createGroup = async (req, res, next) => {
  const { groupName, addedGroupMembers } = req.body;

  const { creatorId } = req.params;

  try {
    if (
      !creatorId ||
      !groupName ||
      !addedGroupMembers ||
      !addedGroupMembers.length ||
      addedGroupMembers.length === 0
    ) {
      res.status(400).send();
      return;
    }

    const user = await User.findById(creatorId);

    const users = await Promise.all(
      addedGroupMembers.map((usr) => {
        return User.findOne({ _id: usr });
      })
    );

    //console.log(users);
    const usersIds = users.map((usr) => usr._id);

    const newGroup = new Group({
      groupName,
      groupMembers: [...usersIds],
      groupCreatorId: user._id,
    });

    const conversation = new Conversation();

    newGroup.groupMembers.unshift(user._id);
    newGroup.conversationId = conversation._id;

    conversation.isGroup = true;

    if (!conversation.members.includes(user._id)) {
      conversation.members.unshift(creatorId);
    }

    addedGroupMembers.map((userId) => {
      if (!conversation.members.includes(userId)) {
        conversation.members.unshift(userId);
      }
    });

    await conversation.save();
    await newGroup.save();

    res.status(201).json({ newGroup, conversation });
  } catch (error) {
    next(error);
  }
};

const updateGroup = async (req, res, next) => {
  const { membersId, newGroupName, avatar } = req.body;

  const { conversationId } = req.params;
  try {
    if (!conversationId)
      return next(createError(400, "conversationId must be provided"));

    const conversationGroup = await Conversation.findOne({
      _id: conversationId,
      $and: [{ members: req.userId }],
    });

    //console.log(conversationGroup);
    const group = await Group.findOne({
      conversationId: conversationGroup._id,
      $and: [{ groupMembers: req.userId }],
    });

    // //console.log(group);
    // if (req.userId !== group.groupCreatorId)
    //   return next(
    //     createError(
    //       401,
    //       "you are not authorized to update this group , admin only"
    //     )
    //   );

    if (!membersId && !newGroupName)
      return next(
        createError(401, "memberId or newGroupName at least must be provided")
      );

    if (membersId && (!membersId.length || membersId.length === 0)) {
      return next(createError(400, "membersId must be a non empty array"));
    }

    let updatedGroup;

    if (membersId) {
      const newMembers = membersId.filter((member) => {
        const foundMember = group.groupMembers.find((usr) => usr === member);
        // if (member === group.groupCreatorId) return false; , // group member reported or freezed by the group owner
        // else {
        if (foundMember) return false;
        else return true;
        // }
      });

      if (newMembers.length !== membersId.length)
        return next(createError(400, "User already in this group"));

      //console.log(1111111, newMembers, membersId);

      updatedGroup = await Group.findOneAndUpdate(
        { _id: group._id, $and: [{ groupMembers: req.userId }] },
        {
          $push: { groupMembers: [...newMembers] },
        },
        { new: true }
      );

      const rslt = Promise.all(
        newMembers.map((member) => {
          return Conversation.findOneAndUpdate(
            { _id: group.conversationId, $and: [{ members: req.userId }] },
            {
              $push: { members: member },
            },
            { new: true }
          );
        })
      );
    }

    if (newGroupName) {
      updatedGroup = await Group.findByIdAndUpdate(
        group._id,
        {
          groupName: newGroupName,
        },
        { new: true }
      );
    }

    if (avatar) {
      updatedGroup = await Group.findOneAndUpdate(
        { _id: group._id },
        {
          avatar: avatar,
        }
      );
    }

    console.log(updatedGroup.groupMembers);
    res.status(200).json([...updatedGroup.groupMembers]);
  } catch (error) {
    next(error);
  }
};

const sendMsgInGroup = async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;

    const { text } = req.body;

    const group = await Group.findById(groupId);

    const msg = new Message({
      text,
      sender: userId,
      groupId,
      conversationId: group.conversationId,
    });

    await msg.save();

    if (!group.groupMembers.includes(userId))
      return next(
        createError(
          401,
          "you are not a group member , you can't send a message"
        )
      );

    group.groupMessages.unshift(msg);

    await group.save();

    res.status(201).json({ group, msg });
  } catch (error) {
    next(error);
  }
};

const freezGroup = async (req, res, next) => {
  const { conversationId } = req.params;

  try {
    const user = await User.findOne({ _id: req.userId });

    //console.log(user);

    const groupMembers = await Conversation.findOne({
      _id: conversationId,
      $and: [{ members: user._id.toString() }],
    });

    const groupConversation = await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        $and: [{ members: user._id.toString() }],
      },
      {
        members: user._id.toString(),
      }
    );

    //console.log(groupConversation);

    const group = await Group.findOneAndUpdate(
      {
        conversationId: groupConversation._id,
        $and: [{ groupMembers: user._id.toString() }],
      },
      {
        groupMembers: user._id.toString(),
      }
    );
    //console.log(18181818181818, group);

    if (group && groupConversation)
      res.status(200).send([...groupMembers.members]);
    else res.status(400).send();
  } catch (error) {
    next(error);
  }
};

const getAllMessagesInsideGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);

    const groupMessages = await Promise.all(
      group.groupMessages.map((groupMessage) => {
        return Message.findById(groupMessage);
      })
    );

    res.status(200).json(groupMessages);
  } catch (error) {
    next(error);
  }
};

const removeSingleUser = async (req, res, next) => {
  try {
    const { conversationId, userId } = req.body;

    const conversation = await Conversation.findOne({ _id: conversationId });

    const newConversationMembers = conversation.members.filter(
      (mem) => mem !== userId
    );

    const updatedConversationMembers = await Conversation.updateOne(
      {
        _id: conversationId,
        members: userId,
      },
      { members: newConversationMembers }
    );

    const group = await Group.findOne({ conversationId: conversationId });

    const newGroupMembers = group.groupMembers.filter(
      (gMem) => gMem !== userId
    );

    group.groupMembers = newGroupMembers;

    await group.save();

    //console.log(conversationId,newGroupMembers, group.groupMembers);

    // const updatedGroup = await Group.updateOne(
    //   { conversatioId: conversationId, groupMembers: userId },
    //   { groupMembers: newGroupMembers }
    // );

    // //console.log(updatedGroup);

    if (group && updatedConversationMembers) res.status(200).send();
    else res.status(400).send();
  } catch (err) {
    //console.log(err);
    res.status(500);
  }
};
module.exports = {
  createGroup,
  updateGroup,
  freezGroup,
  sendMsgInGroup,
  getAllMessagesInsideGroup,
  removeSingleUser,
};
