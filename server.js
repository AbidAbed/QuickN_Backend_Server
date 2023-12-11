const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")

const connectDB = require("./db/connectDB")
const auth = require("./middlewares/auth")
const path = require("path")
const fs = require("fs")

require("dotenv").config() 

const app = express()


// middlewares
app.use(express.json())
app.use(cors())
app.use(cookieParser())  
app.use('/public', express.static(path.join(__dirname, 'public')));


// api for download files from client side
app.get('/download/:filename', (req, res) => {

    const fileName = req.params.filename;

    const filePath = path.join(__dirname, 'public', 'images', fileName);
  
    if (fs.existsSync(filePath)) {

      res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
      
      res.setHeader('Content-type', `application/octet-stream`);
  
      const fileStream = fs.createReadStream(filePath);

      fileStream.pipe(res);


    } else {
      res.status(404).send('File not found');
    }
  });



// routes
const authRoutes = require("./routes/authRoutes")
app.use("/api/v1/auth" , authRoutes)

const conversationRoutes = require("./routes/conversationRoutes")
app.use("/api/v1/conversation" , conversationRoutes)

const messageRoutes = require("./routes/messageRoutes")
app.use("/api/v1/message" , messageRoutes)

const announcementRoutes = require("./routes/announcementRoutes")
app.use("/api/v1/announcement" , announcementRoutes)


// use custom errorHandler middleware
const errorHandler = require("./middlewares/errorHandler")
app.use(errorHandler)


const PORT = 5000 || process.env.PORT

const start = async () => {
    try {
        app.listen(PORT , () => console.log(`server started on port ${PORT}`))
        await connectDB()
    } catch (error) {
        console.log(error)
    }
}


start()
