const { Router } = require("express");
const {
  addAnnouncement,
  getAnnouncements,
} = require("../controllers/announcementControllers");
const verifyAdmin = require("../middlewares/verifyAdmin");
const Announcement = require("../models/announcementModel");
const User = require("../models/userModel");
const createError = require("../utils/createError");
const auth = require("../middlewares/auth");
const router = Router();
const pdfkit = require("pdfkit");
router.put(
  "/userChecked/:userId/:announcementId",
  auth,
  async (req, res, next) => {
    const { announcementId, userId } = req.params;

    try {
      const user = await User.findById(userId);

      let announcement = await Announcement.findById(announcementId);

      // check if the user already checked this announcement
      if (announcement.checkedUsers.includes(user._id))
        return next(createError(400, "user already checked"));

      announcement = await Announcement.findByIdAndUpdate(
        announcementId,
        {
          $push: {
            checkedUsers: {
              userId,
              username: user.username,
              checkedAt: new Date(),
            },
          },
        },
        { new: true }
      );

      res.status(200).json(announcement);
    } catch (error) {
      next(error);
    }
  }
);

router.post("/addAnnouncement", verifyAdmin, addAnnouncement);

router.get("/", auth, getAnnouncements);

router.get("/getAnnouncement", auth, async (req, res, next) => {
  try {
    const announcementsDocNum = await Announcement.countDocuments();
    res.status(200).json(announcementsDocNum);
  } catch (error) {
    next(error);
  }
});

router.post("/generate-pdf", auth, async (req, res, next) => {
  try {
    const pdfData = req.body;

    console.log("Received PDF Data:", pdfData);

    const doc = new pdfkit();

    // Set font size and style
    doc.fontSize(12).font("Times-Roman");
    doc.moveDown();

    // Add title
    doc.text("Announcement Signed Members Info", { align: "center" });
    doc.moveDown(1);

    // Add announcement title
    doc.text(`Announcement Title: ${pdfData.announcementTitle}`, {
      underline: true,
      marginTop: "40px",
    });
    doc.moveDown(1); // Move down two lines act as marginTop style property 1 : 20px

    // Add checked users
    pdfData.checkedUsers.forEach((user, index) => {
      doc.text(`User ${index + 1}: ${user.username}`);
      doc.text(`Signed At: ${user.checkedAt}`);
      doc.moveDown();
    });

    // Finalize PDF to send it as response
    doc.end();

    const buffers = [];

    // add events on the pdf doc

    doc.on("data", buffers.push.bind(buffers));

    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      const fileName = `${pdfData.announcementTitle}.pdf`; // Set file name to announcement title from request body
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      ); // Set file name in response header
      res.send(pdfData);
    });
  } catch (error) {
    next(error);
  }
});

// generate a full announcements pdf report for all announcements
router.post("/generate-full-pdf-report", auth, async (req, res, next) => {
  try {
    const pdfData = req.body; // Array of announcement objects

    console.log(pdfData);

    const doc = new pdfkit();

    doc.fontSize(12).font("Times-Roman");

    doc.fontSize(20);
    doc.text("Full Announcements Report");
    doc.moveDown(2);

    // Iterate over all announcements and get every single announcement
    pdfData.forEach((announcement, index) => {
      doc.fontSize(16);
      doc.text(`Announcement ${index + 1}: ${announcement.announcementTitle}`, {
        underline: true,
      });
      doc.moveDown();

      // change color , font size
      doc.fontSize(14);
      doc.fillColor("red").strokeColor("red");

      doc.text(`Created at : ${announcement.announcement_created_time}`);

      doc.moveDown();

      // reset color , font size
      doc.fontSize(12);
      doc.fillColor("black");

      // Add checked users
      announcement.checkedUsers.forEach((user, userIndex) => {
        doc.text(`Signed User ${userIndex + 1}: ${user.username}`);
        doc.text(`Signed At: ${user.checkedAt}`);
        doc.moveDown();
      });

      doc.moveDown();
      doc.moveDown();
    });

    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));

    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="announcement-report.pdf"'
      );
      res.send(pdfData);
    });

    doc.end();
  } catch (error) {
    next(error);
  }
});
// router.delete("/delete/allanoun" , async (req  , res , next) => {
//     try {
//         await Announcement.deleteMany()
//     } catch (error) {
//         next(error)
//     }
// } )

module.exports = router;
