const Message = require("../models/messageModel");
const File = require("../models/fileModel");
const rimraf = require('rimraf');
const staticFolder = require("../pathConfig");
const Group = require("../models/groupModel");
const User = require("../models/userModel");
const Conversation = require("../models/conversationModel");
const fs = require("fs");
const { default: mongoose } = require("mongoose");
const createError = require("../utils/createError");
const { decryptMessage , encryptMessage , generateEncryptionKey} = require("../utils/messageEncryption");



// prev one
const newMessage = async (req, res, next) => {

  try {

    const { sender, text, conversationId, file , hiddenFor } = req.body;

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


    const pushedUsers = users.filter((usr) => {
      return usr.lastViewedConversationId === msgConverstion._id.toString();
    });


    /////////////////////////////////////////////////////////////////////////////////
    if (conversationDoc.isGroup) {

      if (!conversationDoc.members.includes(sender)) {
        res.status(401).send();
        return;
      }

      // if the user is an admin and there is a hidden users array
      const user = await User.findOne({ _id: req.userId })

      let newMessage = { sender, text, conversationId, file };

      if (user.isAdmin && hiddenFor.length > 0) {
        // to check that there is no duplicated array values
        const uniqueHiddenFor = Array.from(new Set(hiddenFor))
        newMessage.hiddenFor = uniqueHiddenFor
      }else{
        newMessage.hiddenFor = []
      }

      // conversationDoc.readBy.push([...filteredMembers])
      await conversationDoc.save()

      const newMsg = new Message(newMessage)
      await newMsg.save()


      if (!msgConverstion) {
        res.status(400).send();
        return;
      }

      res.status(201).json(newMsg);

    } else {

      msgConverstion.readBy = [];

      pushedUsers.map((pUsr) => msgConverstion.readBy.push(pUsr._id.toString()));

      await msgConverstion.save();

      const newMessage = new Message({ sender, text, conversationId, file });

      await newMessage.save();

      res.status(201).json(newMessage);
    }
  } catch (error) {
    //console.log(error);
    next(error);
  }
};

// const newMessage = async (req, res, next) => {
//   try {
//     const { sender, text, conversationId, file, hiddenFor } = req.body;

//     if (!sender || text === undefined || !conversationId) {
//       res.status(400).send();
//       return;
//     }

//     // Encrypt the message text
//     const encryptedText = await encryptMessage(text);

//     // Get conversation document
//     const conversationDoc = await Conversation.findOne({ _id: conversationId });
//     const msgConverstion = await Conversation.findOne({
//       _id: conversationId,
//     });

//     // Get users who are part of the conversation
//     const users = await Promise.all(
//       conversationDoc.members.map((memberUser) =>
//         User.findOne({ _id: memberUser })
//       )
//     );

//     // Filter users who have last viewed the conversation
//     const pushedUsers = users.filter((usr) => {
//       return usr.lastViewedConversationId === conversationId.toString();
//     });

//     if (conversationDoc.isGroup) {
//       if (!conversationDoc.members.includes(sender)) {
//         res.status(401).send();
//         return;
//       }

//       // Check if the user is an admin and there are hidden users
//       const user = await User.findOne({ _id: req.userId });
//       let newMessageData = { sender, text: encryptedText, conversationId, file };
//       if (user.isAdmin && hiddenFor && hiddenFor.length > 0) {
//         const uniqueHiddenFor = Array.from(new Set(hiddenFor));
//         newMessageData.hiddenFor = uniqueHiddenFor;
//       } else {
//         newMessageData.hiddenFor = [];
//       }

//       // Save the message to the database
//       const newMsg = await Message.create(newMessageData);

//       // Update conversation document to include sender in readBy array
//       await Conversation.findOneAndUpdate(
//         { _id: conversationId },
//         { $addToSet: { readBy: sender } }
//       );

//       res.status(201).json(newMsg);
//     } else {
//       // Update conversation document to include users who have read the message
//       conversationDoc.readBy = [];
//       pushedUsers.map((pUsr) => conversationDoc.readBy.push(pUsr._id.toString()));
//       await conversationDoc.save();

//       // Save the message to the database
//       const newMsg = await Message.create({ sender, text: encryptedText, conversationId, file });

//       res.status(201).json(newMsg);
//     }
//   } catch (error) {
//     next(error);
//   }
// };

// prev one



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
    //////////////////// if ////////////////////////
    if (message_id && newer === undefined) {

      const message = await Message.findOne({ _id: message_id , hiddenFor: { $ne: req.userId }});

      if (!message) {
        return res.status(404).json([]);
      }
      
      const beforeMessages = await Message.aggregate([
        {
          $match: {
            conversationId: message.conversationId,
            createdAt: { $lt: message.createdAt },
            hiddenFor: {
              $not: {
                $elemMatch: { $eq: new mongoose.Types.ObjectId(req.userId) }
              }
            }
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
            hiddenFor: {
              $not: {
                $elemMatch: { $eq: new mongoose.Types.ObjectId(req.userId) }
              }
            }
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

      //////////////////// else if ////////////////////
    } else if (message_id !== undefined && newer !== undefined) {

      const message = await Message.findOne({ _id: message_id , hiddenFor: { $ne: req.userId }});

      if (!message) {
        return res.status(404).json([]);
      }
      
      // scroll down
      if (newer === "true") {
        messages = await Message.aggregate([
          {
            $match: {
              conversationId: message.conversationId,
              createdAt: { $gt: message.createdAt },
              hiddenFor: {
                $not: {
                  $elemMatch: { $eq: new mongoose.Types.ObjectId(req.userId) }
                }
              }
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
              hiddenFor: {
                $not: {
                  $elemMatch: { $eq: new mongoose.Types.ObjectId(req.userId) }
                }
              }
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: 20 }, // Fetch more messages than needed
        ]);

        messages = messages.slice(0, 10).reverse();
      }


    ///////////////////////// else ////////////////////////////
    // to update the conversation in ui based on latest msg that user recived
    } else {
      const temp = await Message.aggregate([
        {
          $match: {
            conversationId: req.params.conversationId,
            hiddenFor: {
              $not: {
                $elemMatch: { $eq: new mongoose.Types.ObjectId(req.userId) }
              }
            }
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
        return User.findById(msg.sender);
      })
    );


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

    res.status(200).json(messages);

  } catch (error) {
    next(error);
  }
};

// const getMessagesInsideConversation = async (req, res, next) => {
//   try {
//     const { message_id, newer } = req.query;
//     const conversationId = req.params.conversationId;

//     const conversation = await Conversation.findOne({
//       _id: conversationId,
//     });

//     const updatedUser = await User.updateOne(
//       { _id: req.userId },
//       { lastViewedConversationId: conversation._id }
//     );

//     if (!conversation.readBy.includes(req.userId)) {
//       conversation.readBy.push(req.userId);
//     }
//     await conversation.save();

//     let messages = null;

//     if (message_id && newer === undefined) {
//       const message = await Message.findOne({ _id: message_id , hiddenFor: { $ne: req.userId }});
//       if (!message) {
//         return res.status(404).json([]);
//       }

//       const beforeMessages = await Message.aggregate([
//         {
//           $match: {
//             conversationId: message.conversationId,
//             createdAt: { $lt: message.createdAt },
//             hiddenFor: {
//               $not: {
//                 $elemMatch: { $eq: new mongoose.Types.ObjectId(req.userId) }
//               }
//             }
//           },
//         },
//         { $sort: { createdAt: -1 } },
//         { $limit: 20 }, // Fetch more messages than needed
//       ]);

//       const afterMessages = await Message.aggregate([
//         {
//           $match: {
//             conversationId: message.conversationId,
//             createdAt: { $gt: message.createdAt },
//             hiddenFor: {
//               $not: {
//                 $elemMatch: { $eq: new mongoose.Types.ObjectId(req.userId) }
//               }
//             }
//           },
//         },
//         { $sort: { createdAt: 1 } },
//         { $limit: 20 }, // Fetch more messages than needed
//       ]);

//       const messagesArr = [...beforeMessages, message, ...afterMessages];

//       const messageIndex = messagesArr.findIndex((msg) => {
//         return msg._id === message._id;
//       });

//       messages = [
//         ...beforeMessages.reverse(),
//         message._doc,
//         ...afterMessages,
//       ].slice(messageIndex - 5 >= 0 ? messageIndex - 5 : 0, messageIndex + 7);

//     } else if (message_id !== undefined && newer !== undefined) {
//       const message = await Message.findOne({ _id: message_id , hiddenFor: { $ne: req.userId }});
//       if (!message) {
//         return res.status(404).json([]);
//       }
      
//       if (newer === "true") {
//         messages = await Message.aggregate([
//           {
//             $match: {
//               conversationId: message.conversationId,
//               createdAt: { $gt: message.createdAt },
//               hiddenFor: {
//                 $not: {
//                   $elemMatch: { $eq: new mongoose.Types.ObjectId(req.userId) }
//                 }
//               }
//             },
//           },
//           { $sort: { createdAt: 1 } },
//           { $limit: 20 }, // Fetch more messages than needed
//         ]);

//         messages = messages.slice(0, 10);
//       } else {
//         const messageTime = new Date(message.createdAt);
//         messages = await Message.aggregate([
//           {
//             $match: {
//               conversationId: message.conversationId,
//               createdAt: { $lt: messageTime },
//               hiddenFor: {
//                 $not: {
//                   $elemMatch: { $eq: new mongoose.Types.ObjectId(req.userId) }
//                 }
//               }
//             },
//           },
//           { $sort: { createdAt: -1 } },
//           { $limit: 20 }, // Fetch more messages than needed
//         ]);

//         messages = messages.slice(0, 10).reverse();
//       }
//     } else {
//       const temp = await Message.aggregate([
//         {
//           $match: {
//             conversationId: req.params.conversationId,
//             hiddenFor: {
//               $not: {
//                 $elemMatch: { $eq: new mongoose.Types.ObjectId(req.userId) }
//               }
//             }
//           },
//         },
//         { $sort: { createdAt: -1 } },
//         { $limit: 20 }, // Fetch more messages than needed
//       ]);

//       messages = temp.slice(0, 10).reverse();
//     }

//     const users = await Promise.all(
//       messages.map((msg) => {
//         return User.findById(msg.sender);
//       })
//     );

//     messages = await Promise.all(messages.map(async (msg) => {
//       const user = users.find((usr) => {
//         return usr._id.toString() === msg.sender;
//       });

//       const decryptedMsg = { ...msg };
//       if (decryptedMsg.text && decryptedMsg.text.encrypted) {
//         decryptedMsg.text = await decryptMessage(decryptedMsg.text, decryptionKey);
//       }

//       return {
//         ...decryptedMsg,
//         senderUsername: user.username,
//         senderAvatar: user.avatar,
//       };
//     }));

//     res.status(200).json(messages);

//   } catch (error) {
//     next(error);
//   }
// };





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
    /////////ssss
    let messages = await Message.find({
      text: { $regex: searchterm, $options: "i" },
      conversationId: userConversation._id,
      hiddenFor: { $ne: req.userId }
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

    /////////ssss
    const fileMessages = await Message.find({
      file: { $ne: null },
      $and: [{ conversationId: userConversation._id }],
      hiddenFor: { $ne: req.userId }
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


    /////////ssss
    const searchedFileMessages = await Message.find({
      file: { $in: searchedFileIds },
      hiddenFor: { $ne: req.userId }
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
        fs.rmdir(`${staticFolder}\\${file?.createdName}`, { recursive: true }, (err) => {
          if (err) {
            console.error(`Failed to delete folder: ${err}`);
          } else {
            console.log(`Folder deleted successfully.`);
          }
        });
      }

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
  } catch (err) { }
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



const forwardMsg = async (req , res , next) => {
  try {
    
    const {msgId} = req.params
    const {forwardedConversationsArr , usersForwardedArr} = req.body

    const forwardedMsg = await Message.findById(msgId)

    if (!forwardedMsg) {
      return res.status(404).json({ success: false, msg: "Forwarded message not found" });
    }

    if(forwardedMsg.hiddenFor.length > 0) return res.status(400).json({success: false, msg: "you can't Forward a hidden message" })
    
    let allForwardedConversations = []
    
    // validation check
    if(!forwardedConversationsArr && !usersForwardedArr) return next(createError(400 , "you must at least choose one conversation or one user"))
    
    
    // forward message for user existing conversations (groups , single chat)
    let forwardedConversations = []
    
    if(forwardedConversationsArr && forwardedConversationsArr.length !== 0){
      
      forwardedConversations = await Promise.all(forwardedConversationsArr.map(async (forwardConvId) => {
        
        const objectId = new mongoose.Types.ObjectId(forwardConvId);

        try {

          const conversation = await Conversation.findById(objectId)
          
          if (!conversation) {
            return next(createError(404 , `Conversation with ID ${forwardConvId} not found`));
        }

          if (conversation && conversation.members.includes(req.userId.toString())) {
            const newMsg = new Message({
              text : forwardedMsg.text ,
              file : forwardedMsg.file ,
              conversationId : conversation._id ,
              sender : req.userId.toString(),
              hiddenFor : forwardedMsg.hiddenFor.length > 0 ? forwardedMsg.hiddenFor : [] ,
              isForwarded : true
            })

            await newMsg.save()

            allForwardedConversations.push({conversation : conversation , newMsg : newMsg})

            return conversation;
          }
          
        } catch (error) {
          throw error;
        }
      
      }
      
    ))};
      
    forwardedConversations = forwardedConversations.filter(singleConver => singleConver !== undefined)
    
    

    // forward message for not existing conversations (create new chat)
    let newCreatedConversations

    if(usersForwardedArr && usersForwardedArr.length !== 0){
      
      newCreatedConversations = await Promise.all(usersForwardedArr.map(async (user) => {
                
        const existingConversation = await Conversation.findOne({
          members: { $all: [user , req.userId.toString()] },
          isGroup: false
      });

        if(existingConversation){
          return false
        }else{
          const newConversation =  new Conversation({
            members : [req.userId.toString() , user],
            isGroup : false ,
            readBy : []
          })
          
          await newConversation.save()

          const newMsg = new Message({
            text : forwardedMsg.text ,
            file : forwardedMsg.file ,
            conversationId : newConversation._id ,
            sender : req.userId.toString(),
            hiddenFor :  forwardedMsg.hiddenFor.length > 0 ? forwardedMsg.hiddenFor : [] ,
            isForwarded : true
          })
          
          await newMsg.save()

          allForwardedConversations.push({conversation : newConversation , newMsg : newMsg , isForwarded : true})
          return newConversation

        }

      }))
    
    }

    res.status(200).json(allForwardedConversations);


  } catch (error) {
    next(error)
  }
}




const favortiteMsg = async (req , res , next) => {
  try {
    
    const message = await Message.findOne({_id : new mongoose.Types.ObjectId(req.params.msgId)})
    
    if(!message) return next(createError(404 , "Message not exist"))

    if(message.sender !== req.userId) return next(createError(400 , "You can favortie your messages only"))

    if(message.isFavorite) return next(createError(400 , "already a favorite message"))
    
    message.isFavorite = true

    await message.save()

    res.status(200).json(message)

  } catch (error) {
    next(error)
  }
}



const removeFavoriteMsg = async (req , res , next) => {
  try {

    const message = await Message.findOne({_id : new mongoose.Types.ObjectId(req.params.msgId)})
    
    if(!message) return next(createError(404 , "Message not exist"))

    if(message.sender !== req.userId || !message.isFavorite) return next(createError(400 , "You can't remove favortie from this message"))

    message.isFavorite = false
    await message.save()

    res.status(200).json(message)

  } catch (error) {
    next(error)
  }
}



const getAllFavoriteMessages = async (req , res , next) => {
  try {
    
    let favoriteMessages = await Message.find({sender : req.params.userId , conversationId : req.params.convId , isFavorite : true})

    let favoriteFileMessages = favoriteMessages.filter(favMsg => favMsg.file !== null)
    
    const favoriteFiles = await Promise.all(favoriteFileMessages.map((fileMsg) => {
      return File.findOne({_id : fileMsg.file})
    }))

    favoriteMessages = favoriteMessages.filter(favMsg => favMsg.file === null)
    
    res.status(200).json([...favoriteMessages , ...favoriteFiles])

  } catch (error) {
    next(error)
  }
}



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
  forwardMsg,
  favortiteMsg,
  removeFavoriteMsg,
  getAllFavoriteMessages
};
