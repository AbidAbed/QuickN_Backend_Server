const multer = require("multer");
const staticFolder = require("../pathConfig");
const File = require("../models/fileModel");

//This function should update file record in the database before start uploading
async function updateFileObj(file, fileId, fileName) {
  let path;
  //checking filetype and assigning path to it
  if (
    file.mimetype.split("/")[1] === "png" ||
    file.mimetype.split("/")[1] === "jpg" ||
    file.mimetype.split("/")[1] === "jpeg"
  ) {
    path = `${staticFolder}/images/`;
  } else if (file.mimetype.split("/")[1] === "webm")
    path = `${staticFolder}/voices/`;
  else if (file.mimetype.split("/")[1] === "mp4")
    path = `${staticFolder}/videos/`;
  else path = `${staticFolder}/uploads/`;

  const fileObj = await File.findByIdAndUpdate(
    fileId,
    {
      path:
        path.substring(path.search("\\public") + 7).split(".")[0] +
        (fileName !== undefined ? fileName.split(".")[0] : ""),
      isUploading: true,
      isUploaded: false,
      type: file.mimetype.includes("webm")
        ? "wav"
        : file.mimetype.split("/")[1],
      extension: file.mimetype.includes("webm")
        ? "wav"
        : file.originalname.split(".")[1],
      createdName: fileName !== undefined ? fileName.split(".")[0] : "",
    },
    { new: true }
  );

  return fileObj;
}

const storage = multer.diskStorage({
  filename: async function (req, file, cb) {
    let uniqueSuffix;

    //checking filetype
    if (file.mimetype.split("/")[1] === "webm") uniqueSuffix = "." + "wav";
    else uniqueSuffix = "." + file.mimetype.split("/")[1];

    const fileName = Date.now() + uniqueSuffix;

    const fileObj = await updateFileObj(file, req.body.fileId, fileName);
    return cb(null, `${fileObj.createdName}${uniqueSuffix}`);
  },
  destination: async function (req, file, cb) {
    setTimeout(async () => {
      isCanceled = true;
      const file = await File.findOneAndUpdate(
        { _id: req.body.fileId },
        { isUploaded: false, isUploading: false }
      );
    }, 1000);

    const fileObj = await updateFileObj(file, req.body.fileId);
    return cb(null, `${staticFolder}/${fileObj.path}`);
  },
  fileFilter: function (req, file, callback) {
    req.on("close", () => {
      file.stream.on("close", () => {
        //should delete the file
        callback(new Error("Cancel."), false);
      });
      file.stream.emit("end");
    });

    req.on("abort", () => {
      file.stream.on("abort", () => {
        //should delete the file
        callback(new Error("Cancel."), false);
      });
      file.stream.emit("end");
    });
  },
});

const profileUserImgStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (
      file.mimetype.split("/")[1] === "png" ||
      file.mimetype.split("/")[1] === "jpg" ||
      file.mimetype.split("/")[1] === "jpeg"
    )
      cb(null, `${staticFolder}/images/`);
    else {
      cb(new Error("Unsupported file type for profile image"));
    }
  },

  filename: function (req, file, cb) {
    const fileExtension = file.mimetype.split("/")[1];
    const uniqueSuffix = Date.now() + "." + fileExtension;
    cb(null, uniqueSuffix);
  },
});

const upload = multer({ storage });
const uploadProfileImg = multer({ storage: profileUserImgStorage });

module.exports = { upload, uploadProfileImg };

// const upload = multer({ storage });
// const uploadProfileImg = multer({ profileUserImgStorage });

// module.exports = {upload , uploadProfileImg};

// const multer = require("multer");
// const staticFolder = require("../pathConfig");

// // Define disk storage configuration for general uploads
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     let destinationFolder = ${staticFolder}/uploads/;

//     if (file.mimetype.startsWith("image/")) {
//       destinationFolder = ${staticFolder}/images/;
//     } else if (file.mimetype === "video/mp4") {
//       destinationFolder = ${staticFolder}/videos/;
//     } else if (file.mimetype === "audio/webm") {
//       destinationFolder = ${staticFolder}/voices/;
//     }

//     cb(null, destinationFolder);
//   },
//   filename: function (req, file, cb) {
//     const fileExtension = file.mimetype.split("/")[1];
//     const uniqueSuffix = Date.now() + "." + fileExtension;
//     cb(null, uniqueSuffix);
//   },
// });

// // Define disk storage configuration for profile images
// const profileUserImgStorage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     if (file.mimetype.startsWith("image/")) {
//       cb(null, ${staticFolder}/images/);
//     } else {
//       cb(new Error("Unsupported file type for profile image"));
//     }
//   },
//   filename: function (req, file, cb) {
//     const fileExtension = file.mimetype.split("/")[1];
//     const uniqueSuffix = Date.now() + "." + fileExtension;
//     cb(null, uniqueSuffix);
//   },
// });

// // Initialize multer instances with configured storage
// const upload = multer({ storage });
// const uploadProfileImg = multer({ storage: profileUserImgStorage });

// module.exports = { upload, uploadProfileImg };
