const { Router } = require("express");
const {
  signUp,
  signIn,
  getUser,
  updateUserProfile,
  resetLastViewedConversation,
  updateLastLoginTimeUser,
  checkIsuserAdmin,
  getUserByToken,
  addContact,
  getContactList,
  removeContact
} = require("../controllers/authControllers");


const auth = require("../middlewares/auth");
const User = require("../models/userModel");
const Conversation = require("../models/conversationModel");
const { default: mongoose } = require("mongoose");
const createError = require("../utils/createError");


const router = Router();


router.post("/signup", signUp);

router.post("/signin", signIn);


router.get("/getUser/:userId", getUser);


router.post("/updateUserProfile/:userId", auth, updateUserProfile);


router.get("/getUsersDetails", auth, async (req, res) => {
  try {
    const { userIds } = req.query;
    // Fetch user details for the provided IDs
    const users = await User.find({ _id: { $in: userIds } });
    res.json(users);
  } catch (error) {
    next(error);
  }
});


router.post("/getUsers", auth, async (req, res, next) => {
  try {
    const { userIds } = req.body;

    const users = await Promise.all(
      userIds.map((userId) => {
        return User.findOne({ _id: userId });
      })
    );

    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
});


router.get("/getAllUsers", auth, async (req, res, next) => {
  try {
    const users = await User.find();

    res.status(200).json(users);
  } catch (error) {
    next();
  }
});


router.get("/users/search", auth, async (req, res, next) => {
  try {
    const { searchterm, page } = req.query;

    const users = await User.find({
      username: { $regex: searchterm, $options: "i" },
    })
      .sort("-createdAt")
      .skip((page - 1) * 10)
      .limit(10);

    res.status(200).json(users);
  } catch (err) {
    //console.log(err);
    res.status(500).send();
  }
});


router.put("/user/resetLastViewedConversation", resetLastViewedConversation);


router.put("/user/lastlogintime/update", auth, updateLastLoginTimeUser);


router.get("/getOnlineUsers/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params
    const { isOnline } = req.query


    let user = await User.findOne({ _id: userId })

    if (!user) {
      return next(createError(404, "User not exist"))
    }

    user.isOnline = isOnline

    await user.save()


    if (user.lastViewedConversationId === null) {
      return res.status(400)
    }

    const userLastConv = await Conversation.findOne({ _id: new mongoose.Types.ObjectId(user.lastViewedConversationId) })

    let lastConvUsers = await Promise.all(userLastConv?.members?.map((memberId) => {
      return User.findOne({ _id: new mongoose.Types.ObjectId(memberId) })
    }))

    lastConvUsers = lastConvUsers.filter(singleUser => singleUser._id.toString() !== userId)

    lastConvUsers = lastConvUsers.filter(singleUser => singleUser.lastViewedConversationId === userLastConv._id.toString() && singleUser.isOnline)

    const onLineUsersIds = lastConvUsers.map((converUser) => {
      return converUser._id.toString()
    })

    res.status(200).json(onLineUsersIds)

  } catch (error) {
    console.log(error);
    next(error)
  }
})


router.get("/user/isAdmin", auth, checkIsuserAdmin);


router.get("/users/singleUser/bytoken", auth, getUserByToken)


router.post("/add-contact-user" , auth , addContact)
router.get("/get-contact-list" , auth , getContactList)
router.patch("/remove-contact/:userId" , auth , removeContact)


module.exports = router;
