const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim : true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: validator.isEmail,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    avatar: {
      type: String,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isAnnouncing: {
      type: Boolean,
      default: false,
    },
    adminOfAdmins : {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: String,
      default: "false",
    },
    lastViewedConversationId: {
      type: String,
    },
    lastloginTime: {
      type: Number,
      default: Date.now(),
    },
    isOnline : {
      type : Boolean ,
      default : false
    },
    phoneNumber: {
      type: String,
      validate: {
        validator: function(v) {
          return /^(07)[0-9]{8}$/.test(v);
        },
        message: props => `${props.value} is not a valid phone number starting with "07"!`
      }
    },
    contactList: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  { timestamps: true }
);




// userSchema.pre("save" , async function(){

//     if(!this.isModified("password")) return

//     const salt = await bcrypt.genSalt(10)
//     const hashedPassword = await bcrypt.hash(this.password , salt)
//     this.password = hashedPassword

// })

userSchema.methods.createJWT = function () {
  const token = jwt.sign(
    {
      userId: this._id,
      isAdmin: this.isAdmin,
      isAnnouncing: this.isAnnouncing,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_TIME }
  );
  return token;
};

const User = mongoose.model("users", userSchema);

module.exports = User;
