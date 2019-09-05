const { forwardTo } = require('prisma-binding');
const cloudinary = require('../utils/cloudinary');

const Query = {
  videos: forwardTo('db'),
  video: forwardTo('db'),
  audios: forwardTo('db'),
  captions: forwardTo('db'),
  caption: forwardTo('db'),
  tag: forwardTo('db'),
  tags: forwardTo('db'),
  comment: forwardTo('db'),
  comments: forwardTo('db'),
  currentUser(parent, args, ctx, info) {
    // Check if there is current user ID
    if (!ctx.request.userId) return null;

    return ctx.db.query.user(
      {
        where: {
          id: ctx.request.userId,
        },
      },
      info
    );
  },
  cloudinaryAuth(
    parent,
    { source, language },
    {
      request: { userId },
    },
    info
  ) {
    // Check if there is current user ID
    if (!userId) throw new Error('Bạn chưa đăng nhập');

    const { signature, timestamp } = cloudinary(source, userId, language);

    return {
      signature,
      timestamp,
    };
  },
};

module.exports = Query;
