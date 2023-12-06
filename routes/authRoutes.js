const {Router} = require("express")
const {signUp , signIn , checkAuth} = require("../controllers/authControllers")
const auth = require("../middlewares/auth")

const router = Router()


router.post("/signup" , signUp)

router.post("/signin" , signIn)

router.get("/validAuth" , auth , checkAuth)


module.exports = router