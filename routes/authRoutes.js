const {Router} = require("express")
const {signUp , signIn , getUser} = require("../controllers/authControllers")

const router = Router()


router.post("/signup" , signUp)

router.post("/signin" , signIn)

router.get("/getUser" , getUser)


module.exports = router