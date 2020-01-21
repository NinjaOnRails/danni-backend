const cloudinary = require('cloudinary').v2;

const timestamp = new Date().getTime();

module.exports = {
  audioSign: (source, userId, language) => {
    const params_to_sign = {
      public_id: `${source}_${userId}_${language}`,
      tags: `${userId},${source},${timestamp},${language}`,
      timestamp,
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET_AUDIO,
    };

    return {
      signature: cloudinary.utils.api_sign_request(
        params_to_sign,
        process.env.CLOUDINARY_API_SECRET
      ),
      timestamp,
    };
  },
  avatarSign: userId => {
    const params_to_sign = {
      public_id: `avatar-${userId}`,
      tags: `${userId},${timestamp},user-avatar,user,avatar,profile-picture,picture,image,profile`,
      timestamp,
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET_AVATAR,
    };
    return {
      signature: cloudinary.utils.api_sign_request(
        params_to_sign,
        process.env.CLOUDINARY_API_SECRET
      ),
      timestamp,
    };
  },
  cusThumbnailSign: (userId, youtubeId) => {
    const params_to_sign = {
      public_id: `thumbnail-${userId}-${youtubeId}`,
      tags: `${userId},${youtubeId},${timestamp},custom-thumbnail,custom,thumbnail,audio-thumbnail,picture,image`,
      timestamp,
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET_CUSTOM_THUMBNAIL,
    };
    return {
      signature: cloudinary.utils.api_sign_request(
        params_to_sign,
        process.env.CLOUDINARY_API_SECRET
      ),
      timestamp,
    };
  },
};
