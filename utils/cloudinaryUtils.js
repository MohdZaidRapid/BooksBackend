// utils/cloudinaryUtils.js
const fs = require("fs");
const { cloudinary } = require("../config/cloudinary");

/**
 * Upload file to Cloudinary
 * @param {string} filePath - Path to file for upload
 * @return {Promise} Cloudinary upload result
 */
const uploadToCloudinary = async (filePath) => {
  try {
    // Upload to Cloudinary in books folder
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "bookstore/books",
      use_filename: true,
      unique_filename: true,
    });

    // Remove file from server after upload
    fs.unlinkSync(filePath);

    return result;
  } catch (error) {
    // Remove file from server if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} imageUrl - The Cloudinary URL of the image to delete
 * @return {Promise} Cloudinary deletion result
 */
const deleteFromCloudinary = async (imageUrl) => {
  try {
    // Extract public ID from the Cloudinary URL
    if (!imageUrl || !imageUrl.includes("cloudinary.com")) {
      return { result: "not a cloudinary image" };
    }

    // Parse the public ID from URL
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/bookstore/books/image.jpg
    const splittedUrl = imageUrl.split("/");
    const publicIdWithExtension = splittedUrl
      .slice(splittedUrl.indexOf("upload") + 2)
      .join("/");
    const publicId = publicIdWithExtension.split(".")[0]; // Remove file extension

    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw error;
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
};
