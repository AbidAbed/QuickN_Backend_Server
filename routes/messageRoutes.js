const { Router } = require("express");
const {
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
} = require("../controllers/messageControllers");
const { upload, uploadProfileImg } = require("../middlewares/multer");
const File = require("../models/fileModel");
const Message = require("../models/messageModel");
const auth = require("../middlewares/auth");
const Conversation = require("../models/conversationModel");
const mongoose = require("mongoose");

// post /upload reqs
//------------------------------------------------------
const { pdf } = require("pdf-to-img");
const fs = require("fs");
const dfs = require("fs").promises;

const { promisify } = require("util");
const libre = require("libreoffice-convert");

libre.convertAsync = require("util").promisify(libre.convert);

const staticFolder = require("../pathConfig");
const verifyAdmin = require("../middlewares/verifyAdmin");
const createError = require("../utils/createError");
const User = require("../models/userModel");
const { encryptMessage } = require("../utils/messageEncryption");
// -----------------------------------------------------

const router = Router();

router.post("/", auth, newMessage);

router.get("/:conversationId", auth, getMessagesInsideConversation);

//////////////////////////////////////////////////////////////////////

router.put("/archiveMsg/:msgId" , auth , async (req , res , next) => {
  try {

    const {usersInGroup} = req.body

    const msg = await Message.findByIdAndUpdate(req.params.msgId , 
    {
      $push : {hiddenFor : usersInGroup}
    }  
    , {new : true})

    res.status(200).json(msg)

  } catch (error) {
    next(error)
  }
})


router.put("/resetArchivedMsg/:msgId" , auth , async (req , res , next) => {
  try {

    const {usersInGroup} = req.body

    const msg = await Message.findById(req.params.msgId)

    if(!msg) {
      return next(createError(404 , "Message not exist"))
    }

    msg.hiddenFor = []

    await msg.save()

    res.status(200).json(msg)

  } catch (error) {
    next(error)
  }
})


router.put("/hidePrevMsg/:msgId" , auth , async (req , res , next) => {
  try {
   
    const {msgId} = req.params
    const {hiddenArr} = req.body

    const msg = await Message.findById(msgId)

    if(!msg){
      return next(createError(404 , "Message not exist"))
    }

    const user = await User.findById(req.userId)

    if(!user || !user.isAdmin) return next(createError(401 , "Access denied"))

    if(hiddenArr.length === 0) return next(createError(400 , "you must at least provide one member"))

    const updatedMsg = await Message.findByIdAndUpdate(msgId , {
      $addToSet : {hiddenFor : hiddenArr}
    } , {new : true})

    res.status(200).json(updatedMsg)

  } catch (error) {
    next(error)
  }
})


router.put("/resetHiddenMsg/:msgId" , auth  , async (req , res , next) => {
  try {
    
    const {msgId} = req.params

    const msg = await Message.findById(msgId)

    if(!msg) return next(createError(404 , "Message not exist"))
    
    const user = await User.findById(req.userId)

    if(!user || !user.isAdmin) return next(createError(401 , "Access Denied"))

    if(msg.hiddenFor.length === 0) return next(createError(400 , "not a hidden message"))
  
    msg.hiddenFor = []

    await msg.save()

    res.status(200).json(msg)

  } catch (error) {
    next(error)
  }
})


router.post("/forwardMsg/:msgId" , auth , forwardMsg)


///////////////////////////////////////////////////////////////////////


router.post("/createFileObj", auth, async (req, res, next) => {
  try {
    if (!req.body.filename) {
      res.status(400).send();
      return;
    }

    const newFile = new File({
      filename: req.body.filename,
      path: "",
      createdName: "",
      type: "",
      extension: "",
      numberOfPages: 0,
      isUploading: true,
    });

    await newFile.save();

    res.status(201).json(newFile);
  } catch (error) {
    next(error);
  }
});


router.post("/upload", auth, upload.single("file"), async (req, res, next) => {
  // let filename = req.file.originalname === "blob" ? req.file.originalname = req.file.originalname + Math.floor(Math.random() * 100) + ".wav" : req.file.originalname
  // let path = req.file.originalname.includes("blob") ? req.file.path = `public/images/${filename}` : req.file.path
  try {
    let isCanceled = false;
    if (!req.file) {
      res.status(400).send({ file: "file is required" });
      return;
    } else {
      req.socket.on("close", function () {
        // code to handle connection abort
        isCanceled = true;
      });

      setTimeout(async () => {
        isCanceled = true;
        const file = await File.findOne({ _id: req.body.fileId });
        if (file?.isUploading) {
          await File.findOneAndUpdate(
            { _id: req.body.fileId },
            { isUploaded: false, isUploading: false }
          );
        }
        res.status(400).send();
        next();
      }, process.env.SET_TIME_OUT_LIMIT);

      let numberOfPages = 0;
      if (
        req.file.originalname.toLocaleLowerCase().includes("ppt") ||
        req.file.originalname.toLocaleLowerCase().includes("pptx") ||
        req.file.originalname.toLocaleLowerCase().includes("docx") ||
        req.file.originalname.toLocaleLowerCase().includes("doc") ||
        req.file.originalname.toLocaleLowerCase().includes("xlsx") ||
        req.file.originalname.toLocaleLowerCase().includes("xls") ||
        req.file.originalname.toLocaleLowerCase().includes("pdf")
      ) {
        if (isCanceled) {
          res.status(400).send();
          return;
        }
        if (
          !fs.existsSync(
            `${staticFolder}\\
                ${req.file.filename.split(".")[0]}`
          )
        )
          fs.mkdirSync(`${staticFolder}\\${req.file.filename.split(".")[0]}`);

        if (isCanceled) {
          res.status(400).send();
          return;
        }
        if (!req.file.mimetype.includes("pdf")) {
          const docxBuf = await dfs.readFile(
            `${staticFolder}\\uploads\\${req.file.filename}`
          );

          // Convert it to pdf format with undefined filter (see Libreoffice docs about filter)
          let pdfBuf = await libre.convertAsync(docxBuf, ".pdf", undefined);

          // Here in done you have pdf file which you can save or transfer in another stream
          if (isCanceled) {
            res.status(400).send();
            return;
          }

          await dfs.writeFile(
            `${staticFolder}\\generatedPdfs\\${
              req.file.filename.split(".")[0]
            }.pdf`,
            pdfBuf
          );
        }
        let counter = 1;
        if (isCanceled) {
          res.status(400).send();
          return;
        }
        const document = await pdf(
          `${staticFolder}\\${
            req.file.mimetype.includes("pdf")
              ? `uploads\\${req.file.filename}`
              : `generatedPdfs\\${req.file.filename.split(".")[0]}.pdf`
          }`,
          { scale: 1 }
        );
        if (isCanceled) {
          res.status(400).send();
          return;
        }
        for await (const image of document) {
          if (isCanceled) {
            res.status(400).send();
            return;
          }
          await dfs.writeFile(
            `${staticFolder}\\${
              req.file.filename.split(".")[0]
            }\\${counter}.png`,
            image
          );
          // result.push(`${req.file.filename.split(".")[0]}\\${counter}.png`);
          counter++;
          numberOfPages++;
        }
        if (isCanceled) {
          res.status(400).send();
          return;
        }
        if (!req.file.mimetype.includes("pdf"))
          fs.unlink(
            `${staticFolder}\\generatedPdfs\\${
              req.file.filename.split(".")[0]
            }.pdf`,
            (err) => {
              if (err) {
                res.status(400).send();
              }
            }
          );
      } else {
        numberOfPages = 0;
      }

      if (isCanceled) {
        res.status(400).send();
        return;
      }

      // console.log(req.file.mimetype.includes("webm"));
      if (
        !req.file.originalname.toLocaleLowerCase().includes("ppt") &&
        !req.file.originalname.toLocaleLowerCase().includes("pptx") &&
        !req.file.originalname.toLocaleLowerCase().includes("docx") &&
        !req.file.originalname.toLocaleLowerCase().includes("doc") &&
        !req.file.originalname.toLocaleLowerCase().includes("xlsx") &&
        !req.file.originalname.toLocaleLowerCase().includes("xls") &&
        !req.file.originalname.toLocaleLowerCase().includes("pdf") &&
        !req.file.originalname.toLocaleLowerCase().includes("mp4") &&
        !req.file.originalname.toLocaleLowerCase().includes("png") &&
        !req.file.originalname.toLocaleLowerCase().includes("jpg") &&
        !req.file.originalname.toLocaleLowerCase().includes("jpeg") &&
        !req.file.mimetype.includes("webm")
      ) {
        res.status(400).send({ msg: "File is not allowed" });
        return;
      }

      if (isCanceled) {
        res.status(400).send();
        return;
      }

      // const newFile = new File({
      //   createdName: req.file.filename.split(".")[0],
      //   filename: req.file.originalname.split(".")[0],
      //   path: req.file.path
      //     .substring(req.file.path.search("\\public") + 7)
      //     .split(".")[0],
      //   type: req.file.mimetype.includes("webm")
      //     ? "wav"
      //     : req.file.mimetype.split("/")[1],
      //   numberOfPages: numberOfPages,
      //   extension: req.file.mimetype.includes("webm")
      //     ? "wav"
      //     : req.file.originalname.split(".")[1],
      // });

      if (isCanceled) {
        res.status(400).send();
        return;
      }

      //original file object
      const ogFile = await File.findOne({ _id: req.body.fileId });

      console.log(ogFile, req.body.fileId);

      if (ogFile.isUploading && !ogFile.isUploaded) {
        const updatedFileObj = await File.findByIdAndUpdate(req.body.fileId, {
          numberOfPages: numberOfPages,
          extension: req.file.mimetype.includes("webm")
            ? "wav"
            : req.file.originalname.split(".")[1],
          isUploading: false,
          isUploaded: true,
          createdAt: new Date().toISOString(),
        });

        const fileMsg = await Message.findOne({ file: updatedFileObj._id });
        fileMsg.createdAt = updatedFileObj.createdAt;
        await fileMsg.save();
        res.status(200).json(fileMsg);
        return;
      } else {
        res.status(200).send(ogFile);
        return;
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }

});


//might need edit
router.post(
  "/upload/profilePic",
  auth,
  uploadProfileImg.single("file"),
  async (req, res, next) => {
    try {
      if (req.file === null)
        return next(createError(400, "file type not allowed"));

      const newFile = await new File({
        createdName: req.file.filename.split(".")[0],
        filename: req.file.originalname,
        path: req.file.path
          .substring(req.file.path.search("\\public") + 7)
          .split(".")[0],
        type: req.file.mimetype.split("/")[1],
        numberOfPages: 0,
        extension: req.file.originalname.split(".")[1],
      }).save();

      res.status(201).json(newFile);
    } catch (error) {
      next(error);
    }
  }
);

router.get("/getFileInMsg/:msgId", auth, getUserFilesInsideMessage);

router.get("/getFile/:fileId", auth, getFile);

router.get("/file/binary", getBinaryFile);

router.put("/:conversationId/:msgId", verifyAdmin, updateMessage);

router.delete("/:conversationId/:msgId", verifyAdmin, deleteMessage);

router.get("/admin/file/:fileId", verifyAdmin, getFileByAdmin);

//Discards files that the user has uploaded but didn't upload successfully
router.delete("/file/uploading/discard", discardUserFiles);

router.delete("/file/singleFile/uploading/discard", discardUserFile);

router.get("/users/search", auth , searchChat);

router.patch("/favortite-msg/:msgId" , auth , favortiteMsg)

router.patch("/remove-favorite-msg/:msgId" , auth , removeFavoriteMsg)

router.get("/get-favorite-messages/:userId/:convId" , auth , getAllFavoriteMessages)

// router.post('/encrypt-message', async (req, res) => {
//   const { message } = req.body; 
//   try {
//     const encryptedMessage = await encryptMessage(message);
//     res.json({ encryptedMessage });
//   } catch (error) {
//     console.error('Encryption failed:', error);
//     res.status(500).json({ error: 'Encryption failed' });
//   }
// });

 
module.exports = router;
