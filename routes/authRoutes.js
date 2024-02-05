const { Router } = require("express");
const {
  signUp,
  signIn,
  getUser,
  updateUserProfile,
  resetLastViewedConversation,
  updateLastLoginTimeUser,
} = require("../controllers/authControllers");
const auth = require("../middlewares/auth");
const User = require("../models/userModel");

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

module.exports = router;
