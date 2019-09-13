const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const faker = require('faker');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const extractYoutubeId = require('../utils/extractYoutubeId');
const validateVideoInput = require('../utils/validateVideoInput');
const validateAudioInput = require('../utils/validateAudioInput');
const captionDownload = require('../utils/captionsDownload');
const sendGridResetToken = require('../utils/sendGridResetToken');
// const languageTags = require('../config/languageTags');
const youtube = require('../utils/youtube');
const moment = require('moment');

const mutations = {
  async createVideo(parent, { source, language }, ctx, info) {
    // Check if user is logged in
    if (!ctx.request.userId) throw new Error('Please Sign In to continue');

    // Check if source is YouTube and extract ID from it
    const originId = extractYoutubeId(source);

    // Check if video exists
    let video = await ctx.db.query.video({
      where: { originId },
    });
    if (video) return video;

    // Validate other input arguments
    const videoCreateInput = await validateVideoInput(originId, ctx);

    // Save video to db
    video = await ctx.db.mutation.createVideo(
      {
        data: {
          addedBy: {
            connect: {
              id: ctx.request.userId,
            },
          },
          ...videoCreateInput,
          language,
        },
      },
      info
    );
    if (!video) throw new Error('Saving video to db failed');

    return video;
  },
  async updateVideo(parent, { id, password, data }, ctx, info) {
    // Check if edit password matches
    if (password !== 'dracarys') throw new Error('Invalid password');

    // Get Video originId
    let { originId } = await ctx.db.query.video({
      where: { id },
    });

    // New source
    if (data.source) {
      // Check if source is YouTube and extract ID from it
      originId = extractYoutubeId(data.source);

      // Check if new video exists
      const video = await ctx.db.query.video({
        where: { originId },
      });
      if (video && data.source !== originId)
        throw new Error('Video already exists');
      originId = data.source;
    }

    // Validate other input arguments
    const videoUpdateInput = await validateVideoInput(originId, data, ctx, id);

    // Update video in db
    return ctx.db.mutation.updateVideo(
      {
        data: {
          ...videoUpdateInput,
        },
        where: {
          id,
        },
      },
      info
    );
  },
  async deleteVideo(parent, { id, password }, ctx, info) {
    if (!id || !(password === 'dracarys'))
      throw new Error('Invalid delete password');
    return ctx.db.mutation.deleteVideo({
      where: {
        id,
      },
    });
  },

  async createAudio(parent, { data }, ctx, info) {
    // Check if user is logged in
    if (!ctx.request.userId) throw new Error('Please Sign In to continue');

    // Check if user already added Audio to this Video in the same language
    const audios = await ctx.db.query.audios({
      where: {
        AND: [
          { video: { id: data.video } },
          { author: { id: ctx.request.userId } },
          { language: data.language },
        ],
      },
    });
    if (audios.length)
      throw new Error(
        'Each user can only post 1 audio file for each video in given language'
      );

    // Validate other input argumentsma
    const audioCreateInput = await validateAudioInput(data, ctx);

    // Save audio to db
    return ctx.db.mutation.createAudio(
      {
        data: {
          ...audioCreateInput,
          language: data.language,
          author: {
            connect: {
              id: ctx.request.userId,
            },
          },
          video: {
            connect: {
              id: data.video,
            },
          },
        },
      },
      info
    );
  },
  async updateAudio(
    parent,
    {
      id,
      data: { source, language, author },
    },
    ctx,
    info
  ) {
    return ctx.db.mutation.updateAudio(
      {
        data: {
          source,
          language,
          author,
        },
        where: {
          id,
        },
      },
      info
    );
  },
  async createCaption(
    parent,
    {
      data: { languageTag, xml, author, video },
    },
    ctx,
    info
  ) {
    // Check if video exists
    const videoExists = await ctx.db.query.video({ where: { id: video } });
    if (!videoExists) throw new Error('Video not found');

    // Save given XML captions to db
    if (xml) {
      var captions = await ctx.db.mutation.createCaption(
        {
          data: {
            languageTag,
            xml,
            video: {
              connect: {
                id: video,
              },
            },
          },
        },
        info
      );
      if (!captions) throw new Error('Saving captions to db failed');
      return captions;
    }

    // Download captions and save them to db
    const xmlYoutube = await captionDownload(videoExists.originId, languageTag);
    if (!xmlYoutube) throw new Error('Captions not found on Youtube');

    captions = await ctx.db.mutation.createCaption(
      {
        data: {
          languageTag,
          xml: xmlYoutube,
          video: {
            connect: {
              id: video,
            },
          },
        },
      },
      info
    );
    if (!captions) throw new Error('Saving captions to db failed');
    return captions;
  },
  async createTag(parent, { text, video }, ctx, info) {
    const tag = ctx.db.mutation.createTag({
      data: {
        text: text.trim(),
        video: {
          connect: {
            id: video,
          },
        },
      },
    });
    if (!tag) throw new Error('Saving tag to db failed');

    return tag;
  },
  async createComment(parent, { video, text }, ctx, info) {
    if (!ctx.request.userId) throw new Error('Bạn chưa đăng nhập');
    const comment = await ctx.db.mutation.createComment({
      data: {
        author: {
          connect: {
            id: ctx.request.userId,
          },
        },
        text,
        video: {
          connect: {
            id: video,
          },
        },
      },
    });
    if (!comment) throw new Error('Saving comment to db failed');
    return comment;
  },
  async updateComment(parent, data, ctx, info) {
    if (!ctx.request.userId) throw new Error('Bạn chưa đăng nhập');
    const existingComment = await ctx.db.query.comment(
      {
        where: {
          id: data.comment,
          // author: { connect: { id: ctx.request.userId } },
        },
      },
      `{id text author{id} }`
    );
    if (existingComment.author.id !== ctx.request.userId)
      throw new Error('Comment not found');
    const { comment, text } = data;
    if (!text) return existingComment;
    return ctx.db.mutation.updateComment({
      data: {
        text,
      },
      where: {
        id: comment,
      },
    });
  },
  async deleteComment(parent, { comment }, ctx, info) {
    if (!ctx.request.userId) throw new Error('Bạn chưa đăng nhập');
    const existingComment = await ctx.db.query.comment(
      {
        where: {
          id: comment,
          // author: { connect: { id: ctx.request.userId } },
        },
      },
      `{ author{id} }`
    );
    if (existingComment.author.id !== ctx.request.userId)
      throw new Error('Comment not found');
    return ctx.db.mutation.deleteComment({
      where: {
        id: comment,
      },
    });
  },

  async createCommentReply(parent, { comment, text }, ctx, info) {
    if (!ctx.request.userId) throw new Error('Bạn chưa đăng nhập');
    const commentReply = await ctx.db.mutation.createCommentReply({
      data: {
        author: {
          connect: {
            id: ctx.request.userId,
          },
        },
        text,
        comment: {
          connect: {
            id: comment,
          },
        },
      },
    });
    if (!commentReply) throw new Error('Saving comment reply to db failed');
    return commentReply;
  },
  async updateCommentReply(parent, data, ctx, info) {
    if (!ctx.request.userId) throw new Error('Bạn chưa đăng nhập');
    const existingReply = await ctx.db.query.commentReply(
      {
        where: {
          id: data.commentReply,
          // author: { connect: { id: ctx.request.userId } },
        },
      },
      `{id text author{id} }`
    );
    if (existingReply.author.id !== ctx.request.userId)
      throw new Error('Reply not found');
    if (!data.text) return existingReply;
    const { commentReply, text } = data;
    return ctx.db.mutation.updateCommentReply({
      data: {
        text,
      },
      where: {
        id: commentReply,
      },
    });
  },
  async deleteCommentReply(parent, { commentReply }, ctx, info) {
    if (!ctx.request.userId) throw new Error('Bạn chưa đăng nhập');
    const existing = await ctx.db.query.commentReply(
      {
        where: {
          id: commentReply,
          // author: { connect: { id: ctx.request.userId } },
        },
      },
      `{ author{id} }`
    );
    if (existing.author.id !== ctx.request.userId)
      throw new Error('Reply not found');
    return ctx.db.mutation.deleteCommentReply({
      where: {
        id: commentReply,
      },
    });
  },
  async signup(parent, { data }, ctx, info) {
    // Lowercase email and trim arguments
    data.email = data.email.toLowerCase().trim();
    data.name = data.name ? data.name.trim() : '';

    // Check if Email taken
    const emailTaken = await ctx.db.exists.User({ email: data.email });
    if (emailTaken) throw new Error('Email you provided is already in use');

    if (!data.displayName) data.displayName = faker.name.findName();
    data.displayName = data.displayName.trim();

    // Check if display name taken
    const displayNameTaken = await ctx.db.exists.User({
      displayName: data.displayName,
    });
    if (displayNameTaken)
      throw new Error('Display Name you provided is already in use');

    // Hash password
    const password = await bcrypt.hash(data.password, 10);

    // Save user to db
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          ...data,
          password,
          permissions: { set: ['USER'] },
        },
      },
      info
    );

    // Create JWT
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET, {
      expiresIn: '365d',
    });

    // Set jwt as cookie on response
    ctx.response.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie,
    });

    // Return the user to the browser
    return user;
  },
  async signin(parent, { email, password }, ctx, info) {
    email = email.toLowerCase().trim();

    // Check if there is user with that email
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      throw new Error('Invalid Email or Password!');
    }

    // Check if password is correct
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error('Invalid Email or Password!');
    }

    // Generate JWT Token
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET, {
      expiresIn: '365d',
    });

    // Set the cookie with the token
    ctx.response.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });

    // Return the user
    return user;
  },
  signout(parent, args, ctx, info) {
    ctx.response.clearCookie('token');
    return { message: 'Đăng Xuất thành công.' };
  },
  async requestReset(parent, { email }, ctx, info) {
    // 1. Check if real user
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      return { message: 'Reset token sent!' };
    }

    // 2. Set reset token and expiry
    const randomBytesPromiseified = promisify(randomBytes);
    const resetToken = (await randomBytesPromiseified(20)).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
    await ctx.db.mutation.updateUser({
      where: { email },
      data: { resetToken, resetTokenExpiry },
    });

    // 3. Email reset token
    try {
      await sendGridResetToken(user.email, resetToken);
    } catch (error) {
      console.log(error);
    }

    // 4. Return message
    return { message: 'Reset token sent!' };
  },
  async resetPassword(
    parent,
    { password, confirmPassword, resetToken },
    ctx,
    info
  ) {
    // 1. Check if passwords match
    if (password !== confirmPassword) throw new Error('Passwords do not match');

    // 2. Check token and expiration
    const [user] = await ctx.db.query.users({
      where: {
        resetToken,
        resetTokenExpiry_gte: Date.now() - 3600000,
      },
    });
    if (!user) {
      throw new Error('Token is invalid or expired!');
    }

    // 3. Hash new password
    const newPassword = await bcrypt.hash(password, 10);

    // 4. Save new password and remove old resetToken fields from db
    const updatedUser = await ctx.db.mutation.updateUser({
      where: { email: user.email },
      data: {
        password: newPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // 5. Generate JWT
    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);

    // 6. Set JWT cookie
    ctx.response.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });

    // 7. return the new user
    return updatedUser;
  },
  async updateVideoDuration(parent, args, ctx, info) {
    const videos = await ctx.db.query.videos();
    videos.forEach(async video => {
      let {
        data: {
          items: [
            {
              contentDetails: { duration },
            },
          ],
        },
      } = await youtube.get('/videos', {
        params: {
          id: video.originId,
          part: 'contentDetails',
          key: process.env.YOUTUBE_API,
        },
      });
      duration = moment.duration(duration, moment.ISO_8601).asSeconds();
      return ctx.db.mutation.updateVideo({
        data: {
          duration,
        },
        where: { id: video.id },
      });
    });
    return { message: 'Finished' };
  },
  async updateVideoStats(parent, args, ctx, info) {
    const videos = await ctx.db.query.videos();
    videos.forEach(async video => {
      let {
        data: {
          items: [
            {
              statistics: { viewCount, likeCount, dislikeCount },
            },
          ],
        },
      } = await youtube.get('/videos', {
        params: {
          id: video.originId,
          part: 'statistics',
          key: process.env.YOUTUBE_API,
        },
      });
      return ctx.db.mutation.updateVideo({
        data: {
          originViewCount: parseInt(viewCount),
          originLikeCount: parseInt(likeCount),
          originDislikeCount: parseInt(dislikeCount),
        },
        where: { id: video.id },
      });
    });
    return { message: 'Finished' };
  },
  updateAudioDuration(parent, { source, duration }, ctx, info) {
    return ctx.db.mutation.updateAudio(
      { data: { duration }, where: { source } },
      info
    );
  },
};

module.exports = mutations;
