const {Router} = require("express")
const {signUp , signIn , getUser , updateUserProfile} = require("../controllers/authControllers")
const auth = require("../middlewares/auth")
const User = require("../models/userModel")

const router = Router()


router.post("/signup" , signUp)

router.post("/signin" , signIn)

router.get("/getUser/:userId" , getUser)

router.post("/updateUserProfile/:userId" , auth , updateUserProfile)



router.get('/getUsersDetails', async (req, res) => {
    try {
      const { userIds } = req.query;
      // Fetch user details for the provided IDs
      const users = await User.find({ _id: { $in: userIds } });
      res.json(users);
    } catch (error) {
      next(error)
    }
  });





module.exports = router