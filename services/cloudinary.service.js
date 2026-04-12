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
exports.uploadPDF = (pdfBuffer, folder, public_id) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'raw', format: 'pdf', public_id },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(pdfBuffer);
  });
};

/**
 * Delete a file from Cloudinary by its URL
 * @param {string} url - The Cloudinary secure_url
 * @param {string} resource_type - 'image' or 'raw'
 */
exports.deleteFile = async (url, resource_type = 'image') => {
  if (!url) return;
  try {
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    if (uploadIndex === -1) return;
    
    let publicId = urlParts.slice(uploadIndex + 2).join('/');
    
    // For images, Cloudinary public_id usually omits the file extension.
    if (resource_type === 'image') {
      const lastDotIndex = publicId.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        publicId = publicId.substring(0, lastDotIndex);
      }
    }
    
    await cloudinary.uploader.destroy(publicId, { resource_type });
  } catch (err) {
    console.error(`Failed to delete Cloudinary file [${url}]:`, err.message);
  }
};
