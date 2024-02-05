const Joi = require("joi");
const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const createError = require("../utils/createError");
const Conversation = require("../models/conversationModel");
const Message = require("../models/messageModel");

const signUp = async (req, res, next) => {
  const signUpSchema = Joi.object({
    username: Joi.string().required().min(3),
    email: Joi.string().email().required(),
    password: Joi.string().required().min(8),
    cpassword: Joi.ref("password"),
  });

  const { value, error } = signUpSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return next(createError(500, "Inavlid Credentials"));
  }

  const { username, email, password, cpassword } = value;

  try {
    if (username.includes(" ")) {
      res.status(400).send({ msg: "Empty space in username is not allowed" });
      return;
    }

    const isUserAlreadyExist = await User.findOne({ email });

    if (isUserAlreadyExist) {
      return next(createError(500, "User already exist"));
    }

    if (password !== cpassword)
      return next(createError(400, "password fileds not matched"));

    const user = new User({
      username,
      email,
      password,
    });

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(user.password, salt);

    user.password = hashedPassword;

    await user.save();

    user.password = undefined;

    // or
    // const {password , ...rest : rest} = user
    // res.json(rest)

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

const signIn = async (req, res, next) => {
  const signInSchema = Joi.object({
    username: Joi.string().required().min(3),
    password: Joi.string().required().min(8),
  });

  const { value, error } = signInSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return next(createError(400, "Invalid Credentials"));
  }

  const { username, password } = value;

  try {
    const user = await User.findOne({ username }).select("+password");

    if (!user) {
      return next(createError(404, "User not exist"));
    }

    if (user.isBlocked === "true")
      return next(createError(401, "User is blocked"));

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
      return next(createError(400, "Incorrect password"));
    }

    user.password = undefined;

    const token = user.createJWT();

    const { isAdmin, isAnnouncing } = user;

    res
      .cookie("access_token", token, { httpOnly: true })
      .status(200)
      .json({ user, isAdmin, isAnnouncing, token });
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) {
      return next(createError(404, "User with this id not found"));
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

const updateUserProfile = async (req, res, next) => {
  if (req.userId !== req.params.userId)
    return next(createError(401, "You can only update your profile"));

  try {
    let { username, email, password, avatar } = req.body;

    if (username?.includes(" ")) {
      // console.log(username);
      res.status(400).send({ msg: "Empty space in username is not allowed" });
      return;
    }
    if (password) {
      password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        $set: {
          username,
          email,
          password,
          avatar,
        },
      },
      { new: true }
    );

    user.password = undefined;

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

/*an API that gets called by the socket when a user connects to it, it sets the lastLoginTime for 
a user 
*/
const updateLastLoginTimeUser = async (req, res, next) => {
  try {
    const { userId, loginTime } = req.body;

    //validating userId
    if (!userId) {
      res.status(400).send();
      return;
    }

    const user = await User.findOne({ _id: userId });

    //extra validation
    if (!user._id) {
      res.status(400).send();
      return;
    }

    user.lastloginTime = loginTime;

    await user.save();

    res.status(200).send();
  } catch (err) {
    res.status(500).send();
  }
};
// const searchAll = async (req, res, next) => {
//   try {
//     const { page, searchTerm, user_id } = req.query;
//     if (!page) {
//       res.status(400).send;
//       return;
//     }
//     const users = await User.find({
//       username: { $regex: searchTerm, $options: "i" },
//     })
//       .skip((page - 1) * 10)
//       .limit(10)
//       .sort("+createdAt");

//     const conversation = await Conversation.findById(user_id);

//     const messages = await Message.find({})

//   } catch (err) {}
// };

const resetLastViewedConversation = async (req, res) => {
  try {
    const updatedUser = await User.updateOne(
      { _id: req.body.userId },
      {
        lastViewedConversationId: null,
      }
    );

    if (updatedUser) res.status(200).send();
    res.status(400).send();
  } catch (err) {
    res.status(500).send();
    // console.log(err);
  }
};
module.exports = {
  signUp,
  signIn,
  getUser,
  updateUserProfile,
  resetLastViewedConversation,
  updateLastLoginTimeUser,
};
