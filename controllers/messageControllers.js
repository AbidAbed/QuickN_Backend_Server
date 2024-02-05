const Message = require("../models/messageModel");
const File = require("../models/fileModel");

const staticFolder = require("../pathConfig");
const Group = require("../models/groupModel");
const User = require("../models/userModel");
const Conversation = require("../models/conversationModel");
const fs = require("fs");
const { default: mongoose } = require("mongoose");

const newMessage = async (req, res, next) => {
  try {
    const { sender, text, conversationId, file } = req.body;

    if (!sender || text === undefined || !conversationId) {
      res.status(400).send();
      return;
    }

    /////////////////////////////////////////////////////////////////////////////////
    const conversationDoc = await Conversation.findOne({ _id: conversationId });

    const msgConverstion = await Conversation.findOne({
      _id: conversationId,
    });

    const users = await Promise.all(
      conversationDoc.members.map((memberUser) =>
        User.findOne({ _id: memberUser })
      )
    );

    //console.log(users);

    const pushedUsers = users.filter((usr) => {
      return usr.lastViewedConversationId === msgConverstion._id.toString();
    });

    //console.log(pushedUsers);

    msgConverstion.readBy = [];

    pushedUsers.map((pUsr) => msgConverstion.readBy.push(pUsr._id.toString()));

    await msgConverstion.save();

    /////////////////////////////////////////////////////////////////////////////////
    if (conversationDoc.isGroup) {
      if (!conversationDoc.members.includes(sender)) {
        res.status(401).send();
        return;
      }

      const newMessage = new Message({ sender, text, conversationId, file });

      await newMessage.save();
      // $pullAll

      // const groupConversatioPulled = await Conversation.findOneAndUpdate(
      //   {
      //     _id: conversationId,
      //   },
      //   { $set: { readBy: null } }
      // );

      // //console.log(111111112222, groupConversatioPulled);

      // const groupConversation = await Conversation.findOneAndUpdate(
      //   {
      //     _id: conversationId,
      //   },
      //   {
      //     readBy: sender,
      //   },
      //   { overwrite: true }
      // );

      if (!msgConverstion) {
        res.status(400).send();
        return;
      }
      res.status(201).json(newMessage);
    } else {
      const newMessage = new Message({ sender, text, conversationId, file });

      await newMessage.save();

      res.status(201).json(newMessage);
    }
  } catch (error) {
    //console.log(error);
    next(error);
  }
};

const getMessagesInsideConversation = async (req, res, next) => {
  try {
    const { message_id, newer } = req.query;

    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
    });

    const updatedUser = await User.updateOne(
      { _id: req.userId },
      { lastViewedConversationId: conversation._id }
    );

    if (!conversation.readBy.includes(req.userId)) {
      conversation.readBy.push(req.userId);
    }
    await conversation.save();

    let messages = null;

    // get messages with default paging and message_id and newer
    if (message_id && newer === undefined) {
      const message = await Message.findOne({ _id: message_id });

      const beforeMessages = await Message.aggregate([
        {
          $match: {
            conversationId: message.conversationId,
            createdAt: { $lt: message.createdAt },
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 20 }, // Fetch more messages than needed
      ]);

      const afterMessages = await Message.aggregate([
        {
          $match: {
            conversationId: message.conversationId,
            createdAt: { $gt: message.createdAt },
          },
        },
        { $sort: { createdAt: 1 } },
        { $limit: 20 }, // Fetch more messages than needed
      ]);

      // Combine and trim the result to 10 messages
      const messagesArr = [...beforeMessages, message, ...afterMessages];

      const messageIndex = messagesArr.findIndex((msg) => {
        return msg._id === message._id;
      });

      messages = [
        ...beforeMessages.reverse(),
        message._doc,
        ...afterMessages,
      ].slice(messageIndex - 5 >= 0 ? messageIndex - 5 : 0, messageIndex + 7);

      // ...
    } else if (message_id !== undefined && newer !== undefined) {
      const message = await Message.findOne({ _id: message_id });

      // scroll down
      if (newer === "true") {
        messages = await Message.aggregate([
          {
            $match: {
              conversationId: message.conversationId,
              createdAt: { $gt: message.createdAt },
            },
          },
          { $sort: { createdAt: 1 } },
          { $limit: 20 }, // Fetch more messages than needed
        ]);

        messages = messages.slice(0, 10);
      }

      // scroll up
      else {
        const messageTime = new Date(message.createdAt);
        messages = await Message.aggregate([
          {
            $match: {
              conversationId: message.conversationId,
              createdAt: { $lt: messageTime },
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: 20 }, // Fetch more messages than needed
        ]);

        messages = messages.slice(0, 10).reverse();
      }
    } else {
      const temp = await Message.aggregate([
        {
          $match: {
            conversationId: req.params.conversationId,
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 20 }, // Fetch more messages than needed
      ]);

      // Trim the result to 10 messages
      messages = temp.slice(0, 10).reverse();

      // ...
    }
    const users = await Promise.all(
      messages.map((msg) => {
        // const usr = User.findById(msg.sender);
        return User.findById(msg.sender);
      })
    );

    // console.log(users);
    messages = messages.map((msg) => {
      const user = users.find((usr) => {
        return usr._id.toString() === msg.sender;
      });
      return {
        ...msg,
        senderUsername: user.username,
        senderAvatar: user.avatar,
      };
    });

    //console.log(555588888);
    res.status(200).json(messages);
  } catch (error) {
    //console.log(error);
    next(error);
  }
};

const getUserFilesInsideMessage = async (req, res, next) => {
  const { msgId } = req.params;

  try {
    const msg = await Message.findById(msgId);
    res.status(200).json({ fileId: msg.file });
  } catch (error) {
    next(error);
  }
};

const getFile = async (req, res, next) => {
  const { fileId } = req.params;
  try {
    const file = await File.findById(fileId);

    res.status(200).json(file);
  } catch (error) {
    next(error);
  }
};

//should return number of available pages
const getBinaryFile = async (req, res, next) => {
  const { fileId, page } = req.query;

  if (!fileId || !page) {
    res.status(400).send();
    return;
  }
  try {
    const file = await File.findOne({ _id: fileId });

    // console.log(file);
    if (!file) {
      res.status(400).send();
      return;
    }

    //console.log(file, fileId, page);
    if (
      file.type !== "png" &&
      file.type !== "jpg" &&
      file.type !== "jpeg" &&
      file.type !== "wav" &&
      file.type !== "mp4"
    ) {
      res.sendFile(
        `${staticFolder}\\${file.createdName}\\${page}.png`,
        function (err) {
          if (err) {
            //console.log(err);
            res.status(404).send();
          } else {
          }
        }
      );
    } else if (file.type === "wav") {
      //console.log("wav")

      res.sendFile(
        `${staticFolder}\\voices\\${file.createdName}.${file.type}`,
        function (err) {
          if (err) {
            //console.log(err);
            res.status(404).send();
          } else {
          }
        }
      );
    } else if (file.type === "mp4") {
      res.sendFile(
        `${staticFolder}\\videos\\${file.createdName}.${file.type}`,
        function (err) {
          if (err) {
            //console.log(err);
            res.status(404).send();
          } else {
          }
        }
      );
    } else {
      res.sendFile(
        `${staticFolder}\\images\\${file.createdName}.${file.type}`,
        function (err) {
          if (err) {
            //console.log(err);
            res.status(404).send();
          } else {
          }
        }
      );
    }
  } catch (err) {
    //console.log(err);
    next(err);
    res.status(500).send();
  }
};

const searchChat = async (req, res, next) => {
  try {
    //console.log(1);
    const { searchterm, conversationPage, usersPage, messagesPage, user_id } =
      req.query;

    //todo add default values
    if (
      !searchterm ||
      !user_id ||
      !conversationPage ||
      !usersPage ||
      !messagesPage ||
      messagesPage <= 0 ||
      conversationPage <= 0 ||
      usersPage <= 0
    ) {
      res.status(400).send();
      return;
    }

    //getting user converstions

    //returned query : {_id,members:[size of 5],isGroup,createdAt}

    const numberOfUserConversations = await Conversation.countDocuments({
      members: user_id,
    });

    const [userConversation] = await Conversation.find({ members: user_id })
      .sort({ createdAt: 1 })
      .skip(conversationPage - 1)
      .limit(1)
      .select({
        _id: 1,
        members: { $slice: [(usersPage - 1) * 5, 5] },
        isGroup: 1,
        createdAt: 1,
      });

    if (!userConversation) {
      res.status(200).json({ users: [], messages: [] });
      return;
    }

    //getting the users who the user with the user_id is chatting with to search their names

    //returned userChatsIds : ["_id","_id",...]

    const userChatsIds = userConversation.members.filter(
      (usrChat) => usrChat !== user_id
    );

    //getting the conversations ids

    //returned users : [{_id,username,createdAt}]

    let users = await User.find({
      username: { $regex: searchterm, $options: "i" },
      $and: [{ _id: { $in: userChatsIds } }],
    }).select({
      _id: 1,
      username: 1,
    });

    let groupName = false;

    if (userConversation.isGroup) {
      const allGroupData = await Group.findOne({
        conversationId: userConversation._id,
      });
      groupName = allGroupData?.groupName;
    }

    users = users.map((usr) => {
      return {
        _id: usr._id,
        username: usr.username,
        conversationId: userConversation._id,
        groupName: groupName ? groupName : null,
        members: userConversation.members,
      };
    });

    //returned messages : [{_id,sender,text,createdAt}]
    // //console.log(userConversation);
    let messages = await Message.find({
      text: { $regex: searchterm, $options: "i" },
      conversationId: userConversation._id,
    })
      .sort({ createdAt: 1 })
      .skip((messagesPage - 1) * 5)
      .limit(5)
      .select({
        _id: 1,
        sender: 1,
        text: 1,
        createdAt: 1,
      });

    const fileMessages = await Message.find({
      file: { $ne: null },
      $and: [{ conversationId: userConversation._id }],
    })
      .sort({ createdAt: 1 })
      .skip((messagesPage - 1) * 5)
      .limit(5)
      .select({
        _id: 1,
        sender: 1,
        text: 1,
        createdAt: 1,
      })
      .select("file");

    const fileMessagesCastedToObjectId = fileMessages.map((fMsg) => {
      return fMsg.file.toString();
    });

    //console.log(fileMessagesCastedToObjectId);
    const searchedFile = await File.find({
      filename: { $regex: searchterm, $options: "i" },
      _id: { $in: fileMessagesCastedToObjectId },
    })
      .sort({ createdAt: 1 })
      .skip((messagesPage - 1) * 5)
      .limit(5);

    const searchedFileIds = searchedFile.map(
      (searchedFileObj) => searchedFileObj._id
    );

    const searchedFileMessages = await Message.find({
      file: { $in: searchedFileIds },
    });

    const fileAndMessagesSearchedMerged = searchedFileMessages.map(
      (fileMsg) => {
        const foundItem = searchedFile.find(
          (item) => item._id.toString() === fileMsg.file.toString()
        );

        //console.log(foundItem);
        if (foundItem)
          return {
            ...fileMsg._doc,
            text: foundItem.filename,
          };
        else return null;
      }
    );
    //console.log(fileAndMessagesSearchedMerged);
    messages = [...messages, ...fileAndMessagesSearchedMerged];

    if (!messages) {
      res.status(200).json({ users: [...users], messages: [] });
      return;
    }
    const sendersIds = messages.map((msg) => msg.sender);

    const senders = await User.find({ _id: { $in: sendersIds } }).select({
      username: 1,
      _id: 1,
    });

    let group = null;
    if (userConversation.isGroup) {
      [group] = await Group.find({
        conversationId: userConversation._id,
      }).select({ groupName: 1, groupMembers: 1 });
    }
    const combinedMsgsAndSenders = messages.reduce((prev, cur) => {
      const senderObj = senders.find(
        (sendr) => sendr._id.toString() === cur.sender
      );

      return [
        ...prev,
        {
          sender_id: senderObj._id,
          text: cur.text,
          message_id: cur._id,
          sender_username: senderObj.username,
          isGroup: userConversation.isGroup ? true : false,
          groupName: userConversation.isGroup ? group.groupName : null,
          groupMembers: userConversation.isGroup ? group.groupMembers : null,
          conversation_Id: userConversation._id,
          messageCreatedAt: cur.createdAt,
          members: userConversation.members,
        },
      ];
    }, []);

    res.status(200).json({
      users: [...users],
      messages: [...combinedMsgsAndSenders],
      numberOfUserConversations,
    });
  } catch (error) {
    next(error);
  }
};

const updateMessage = async (req, res, next) => {
  try {
    const { conversationId, msgId } = req.params;
    const { newText } = req.body;
    //console.log(conversationId, msgId, newText);
    if (!conversationId || !msgId || !newText) {
      res.status(400).send();
      return;
    }

    const message = await Message.findOneAndUpdate(
      {
        _id: msgId,
        $and: [{ conversationId: conversationId, sender: req.userId }],
      },
      {
        text: newText,
      }
    );

    //console.log(message);
    if (message) res.status(200).send();
    else res.status(400).send();
  } catch (err) {
    //console.log(err);
    res.status(500).send();
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    const { conversationId, msgId } = req.params;

    if (!conversationId || !msgId) {
      res.status(400).send();
      return;
    }

    const message = await Message.findOne({
      _id: msgId,
      $and: [{ conversationId: conversationId }],
    });

    if (message.file) {
      const file = await File.findById(message.file);

      if (
        !file.type.includes("png") &&
        !file.type.includes("jpg") &&
        !file.type.includes("jpeg") &&
        !file.type.includes("wav") &&
        !file.type.includes("mp4")
      ) {
        try {
          fs.rmdirSync(`${staticFolder}\\${file.createdName}`);
          console.log(`folder deleted successfully`);
        } catch (error) {
          console.log(`failed to delete the folder`);
        }
      }

      // fs.rmdir(
      //   ${staticFolder}\\${file.createdName},
      //   {
      //     recursive: true,
      //   },
      //   (err) => {
      //     if (err) {
      //       console.error("Error removing directory:", err);
      //     } else {
      //       //console.log("Directory removed successfully.");
      //     }
      //   }
      // );

      fs.unlink(`${staticFolder}\\${file.path}.${file.type}`, (err) => {
        if (err) {
          res.status(400).send();
        }
      });

      const deletedFile = await File.deleteOne({ _id: message.file });
      if (!deletedFile) {
        res.status(400).send();
        return;
      }
    }

    const deletedMessage = await Message.deleteOne({ _id: msgId });

    if (deletedMessage) res.status(200).send();
    else res.status(400).send();
  } catch (err) {
    //console.log(err);
    res.status(500).send();
  }
};

const getFileByAdmin = async (req, res, next) => {
  try {
    const { fileId } = req.params;

    const file = await File.findById(fileId);

    const fileName = `${file._doc.filename}.${file._doc.extension}`;

    // console.log(file._doc.type);
    let contentTypeHeader = "application/" + file._doc.type;
    // if (
    //   file._doc.type ===
    //   "vnd.openxmlformats-officedocument.presentationml.presentation"
    // )
    //   contentTypeHeader =
    //     "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    // else if (file._doc.type === "msword")
    //   contentTypeHeader = "application/msword";
    // else if (file._doc.type === "vnd.ms-excel")
    //   contentTypeHeader = "application/vnd.ms-excel";
    // else if (file._doc.type === "pdf") contentTypeHeader = "application/pdf";
    // else if (file._doc.type === "png") contentTypeHeader = "image/png";
    // else if (file._doc.type === "wav") contentTypeHeader = "audio/wav";
    // else if (file._doc.type === "mp4") contentTypeHeader = "video/mp4";
    res
      .status(200)
      .sendFile(`${staticFolder}\\${file._doc.path}.${file._doc.type}`, {
        headers: {
          "Content-Type": `${contentTypeHeader}`,
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
  } catch (error) {
    next(error);
  }
};

//API that discards unploaded files
const discardUserFiles = async (req, res, next) => {
  try {
    console.log(req.body);
    const { userId } = req.body;

    //validate userId
    if (!userId) {
      res.status(400).send();
      return;
    }

    const user = await User.findOne({ _id: userId });

    //extra validation
    if (!user._id) {
      res.status(400).send();
      return;
    }

    // Select file messages that were sent after the last login time for the user
    const fileMessages = await Message.find({
      sender: user._id,
      file: { $ne: null },
      createdAt: { $gte: new Date(user.lastloginTime) },
    });

    // Select files which are not uploaded and isUploading, then, change isUploading and uploaded to false
    const files = await Promise.all(
      fileMessages.map((fileMessage) => {
        return File.findOneAndUpdate(
          { _id: fileMessage.file, isUploading: true },
          {
            isUploading: false,
            isUploaded: false,
          }
        );
      })
    );

    //
    res.status(200).send();
    console.log(files);

    // 2024-02-01T08:37:21.472+00:00 ,
    // 2024-02-01T08:37:24.622+00:00
  } catch (err) {}
};

const discardUserFile = async (req, res, next) => {
  try {
    //get fileId from request body
    const { fileId } = req.body;

    //validation
    if (!fileId) {
      res.status(400).send();
      return;
    }

    const file = await File.findOneAndUpdate(
      { _id: fileId },
      {
        isUploading: false,
        isUploaded: false,
      }
    );

    if (!file) {
      res.status(400).send();
      return;
    }
    res.status(200).send();
  } catch (err) {
    res.status(500).send();
  }
};

module.exports = {
  newMessage,
  getMessagesInsideConversation,
  getUserFilesInsideMessage,
  getFile,
  getBinaryFile,
  searchChat,
  updateMessage,
  deleteMessage,
  getFileByAdmin,
  discardUserFiles,
  discardUserFile,
};
