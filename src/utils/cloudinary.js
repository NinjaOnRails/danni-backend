const cloudinary = require('cloudinary').v2;

module.exports = (source, userId, language) => {
  const timestamp = new Date().getTime();
  const params_to_sign = {
    public_id: `${source}_${userId}_${language}`,
    tags: `${userId},${source},${timestamp},${language}`,
    timestamp,
    upload_preset: 'danni-audio',
  };

  return {
    signature: cloudinary.utils.api_sign_request(
      params_to_sign,
      process.env.CLOUDINARY_API_SECRET
    ),
    timestamp,
  };
};
