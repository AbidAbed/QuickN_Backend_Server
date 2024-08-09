const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require('body-parser');

const mongoSanitize = require("express-mongo-sanitize")
const helmet = require("helmet")
const xss = require("xss-clean")
const {rateLimit} = require("express-rate-limit")

const connectDB = require("./db/connectDB");

//library for debugging 
const morgan = require("morgan");

const path = require("path");
const fs = require("fs");

require("dotenv").config();

const app = express();

// middlewares

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


//library for debugging 
app.use(morgan("dev"));

app.use(express.json());
app.use(cors());
app.use(cookieParser());


// security middlwares
// to prevent no-sql injection 
// add extra secure headers , protect the website from cross site scripting (xss)
app.use(mongoSanitize())
app.use(helmet())
app.use(xss())


// to limit our req rate , could be used for specific routes
// const limit = rateLimit({
//   windowMs : 10 * 60 * 1000 ,
//   max : 1 
// })
// app.use(limit)




// app.use('/public', express.static(path.join(__dirname, 'public')));

// api for download files from client side
app.get("/download/:filename", (req, res) => {
  const fileName = req.params.filename;

  const filePath = path.join(__dirname, "public", "images", fileName);

  if (fs.existsSync(filePath)) {
    res.setHeader("Content-disposition", `attachment; filename=${fileName}`);

    res.setHeader("Content-type", `application/octet-stream`);

    const fileStream = fs.createReadStream(filePath);

    fileStream.pipe(res);
  } else {
    res.status(404).send("File not found");
  }
});


// routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/v1/auth", authRoutes);

const conversationRoutes = require("./routes/conversationRoutes");
app.use("/api/v1/conversation", conversationRoutes);

const messageRoutes = require("./routes/messageRoutes");
app.use("/api/v1/message", messageRoutes);

const announcementRoutes = require("./routes/announcementRoutes");
app.use("/api/v1/announcement", announcementRoutes);

const groupRoutes = require("./routes/groupRoutes");
app.use("/api/v1/group", groupRoutes);

// use custom errorHandler middleware
const errorHandler = require("./middlewares/errorHandler");
app.use(errorHandler);



const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    app.listen(PORT, () => console.log(`server started on port ${PORT}`));
    await connectDB();
  } catch (error) {
    console.log(error);
  }
};

start();
