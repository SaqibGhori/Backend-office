const multer = require('multer');
const path   = require('path');

// Where and how to store proof images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/proofs');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.userId}-${Date.now()}${ext}`);
  }
});

// Only accept images
const fileFilter = (req, file, cb) => {
  if (/image\/(jpeg|png|jpg)/.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG/PNG images allowed'), false);
  }
};

module.exports = multer({ storage, fileFilter });
