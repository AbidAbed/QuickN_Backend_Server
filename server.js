const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")

const connectDB = require("./db/connectDB")

require("dotenv").config() 

const app = express()


// middlewares
app.use(express.json())
app.use(cors())
app.use(cookieParser())  


// routes
const authRoutes = require("./routes/authRoutes")
app.use("/api/v1/auth" , authRoutes) 


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
