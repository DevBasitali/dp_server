const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image buffer to Cloudinary.
 * @param {Buffer} fileBuffer
 * @param {string} folder
 * @returns {Promise<string>} secure_url
 */
exports.uploadImage = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * Upload a PDF buffer to Cloudinary as a raw file.
 * @param {Buffer} pdfBuffer
 * @param {string} folder
 * @returns {Promise<string>} secure_url
 */
exports.uploadPDF = (pdfBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'raw', format: 'pdf' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(pdfBuffer);
  });
};
