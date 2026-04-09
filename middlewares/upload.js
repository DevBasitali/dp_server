const multer = require('multer');
const AppError = require('../lib/errors');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only jpg, png, and webp images are allowed', 400));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// Accept any field — item images come as items[0][image], items[1][image], etc.
exports.uploadOrderImages = upload.any();
