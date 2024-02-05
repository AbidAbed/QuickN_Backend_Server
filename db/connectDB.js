const mongoose =require("mongoose")

const connectDB = () => {
    return mongoose.connect(process.env.MONGO_DB_URL)
            .then(() => console.log('CHAT-APP DATABASE CONNECTED SUCCESSFULLY'))
            .catch((err) => console.log(`FAILED IN CONNECTION TO THE DATABASE : ${err}`))
}


module.exports = connectDB  