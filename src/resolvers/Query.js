const { forwardTo } = require('prisma-binding');
const cloudinary = require('../utils/cloudinary');

const Query = {
  video: forwardTo('db'),
  videosConnection: forwardTo('db'),
  captions: forwardTo('db'),
  caption: forwardTo('db'),
  tag: forwardTo('db'),
  tags: forwardTo('db'),
  comment: forwardTo('db'),
  comments: forwardTo('db'),
  commentReply: forwardTo('db'),
  commentReplies: forwardTo('db'),
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
  async user(parent, { id }, ctx, info) {
    const {
      createdAt,
      displayName,
      contentLanguage,
      avatar,
      video,
      audio,
      name,
      showName,
      email,
      showEmail,
      bio,
      showBio,
      location,
      showLocation,
    } = await ctx.db.query.user(
      {
        where: {
          id,
        },
      },
      `{
        createdAt
        name
        showName
        email
        showEmail
        bio
        showBio
        location
        showLocation
        displayName
        contentLanguage
        avatar
        video {
          id
          originTitle
          originAuthor
          originThumbnailUrl
          duration
          language
          addedBy { id }
          audio { id }
        }
        audio {
          id
          title
          video {
            id
          originTitle
          originAuthor
          originThumbnailUrl
          duration
          }
          author { id }
        }
      }`
    );
    return {
      createdAt,
      displayName,
      contentLanguage,
      avatar,
      video,
      audio,
      name: showName ? name : null,
      email: showEmail ? email : null,
      bio: showBio ? bio : null,
      location: showLocation ? location : null,
    };
  },
  cloudinaryAuthAudio(
    parent,
    { source, language },
    {
      request: { userId },
    },
    info
  ) {
    // Check if there is current user ID
    if (!userId) throw new Error('Bạn chưa đăng nhập');

    const { signature, timestamp } = cloudinary.audioSign(
      source,
      userId,
      language
    );

    return {
      signature,
      timestamp,
    };
  },
  cloudinaryAuthAvatar(
    parent,
    args,
    {
      request: { userId },
    },
    info
  ) {
    // Check if there is current user ID
    if (!userId) throw new Error('Bạn chưa đăng nhập');

    const { signature, timestamp } = cloudinary.avatarSign(userId);

    return {
      signature,
      timestamp,
    };
  },
  cloudinaryAuthCusThumbnail(
    parent,
    { youtubeId },
    {
      request: { userId },
    },
    info
  ) {
    // Check if there is current user ID
    if (!userId) throw new Error('Bạn chưa đăng nhập');

    const { signature, timestamp } = cloudinary.cusThumbnailSign(userId, youtubeId);

    return {
      signature,
      timestamp,
    };
  },
};

module.exports = Query;
