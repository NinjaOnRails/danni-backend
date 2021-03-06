const bcrypt = require('bcryptjs');
const faker = require('faker');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const moment = require('moment');
const extractYoutubeId = require('../utils/extractYoutubeId');
const validateVideoInput = require('../utils/validateVideoInput');
const validateAudioInput = require('../utils/validateAudioInput');
const captionDownload = require('../utils/captionsDownload');
const randomAvatar = require('../utils/randomAvatar');
const sendGridResetToken = require('../utils/sendGridResetToken');
// const languageTags = require('../config/languageTags');
const youtube = require('../utils/youtube');
const getFacebookUser = require('../utils/getFacebookUser');
const setCookie = require('../utils/cookie');

const mutations = {
  async createVideo(parent, { source, language, VideoPlatform }, ctx, info) {
    // Check if user is logged in
    if (!ctx.request.userId) throw new Error('Please log in to continue');

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

  async createVideoVote(parent, { video, type }, ctx, info) {
    if (!ctx.request.userId) throw new Error('Please log in to continue');
    const query = `{
      id
      type
      user {
        id
      }
    }`;

    const votingVideo = await ctx.db.query.video(
      {
        where: { id: video },
      },
      `{
        vote{
          id
          type
          user { id }
        }
      
      }`
    );
    const existingVote =
      votingVideo.vote.length > 0
        ? votingVideo.vote.find(vote => vote.user.id === ctx.request.userId)
        : null;
    let vote;
    if (!existingVote) {
      vote = ctx.db.mutation.createVideoVote(
        {
          data: {
            type,
            video: { connect: { id: video } },
            user: {
              connect: {
                id: ctx.request.userId,
              },
            },
          },
        },
        query
      );
    } else if (existingVote.type !== type) {
      ctx.db.mutation.deleteVideoVote(
        {
          where: {
            id: existingVote.id,
          },
        },
        query
      );
      vote = ctx.db.mutation.createVideoVote(
        {
          data: {
            type,
            video: { connect: { id: video } },
            user: {
              connect: {
                id: ctx.request.userId,
              },
            },
          },
        },
        query
      );
    } else if (existingVote.type === type) {
      vote = ctx.db.mutation.deleteVideoVote(
        {
          where: {
            id: existingVote.id,
          },
        },
        query
      );
    }

    return vote;
  },

  async updateVideo(parent, { id, source, language }, ctx, info) {
    if (!ctx.request.userId) throw new Error('Please log in to continue');
    // Get Video originId
    let { originId, addedBy } = await ctx.db.query.video(
      {
        where: { id },
      },
      `{
        addedBy { id }
        originId
      }`
    );

    if (addedBy.id !== ctx.request.userId)
      throw new Error('You do not have permission to do that');

    videoCreateInput = {};
    // New source
    if (source && source !== originId) {
      // Check if source is YouTube and extract ID from it
      originId = extractYoutubeId(source);
      // Check if new video exists
      const video = await ctx.db.query.video({
        where: { originId },
      });
      if (video) throw new Error('This video has already been added');
      // Validate other input arguments

      videoCreateInput = await validateVideoInput(originId, ctx);
    }
    // Update video in db
    const updatedVideo = await ctx.db.mutation.updateVideo(
      {
        data: {
          language,
          ...videoCreateInput,
        },
        where: {
          id,
        },
      },
      info
    );
    if (!updatedVideo) throw new Error('Saving video to db failed');
    return updatedVideo;
  },
  async createAudio(parent, { data }, ctx, info) {
    // Check if user is logged in
    if (!ctx.request.userId) throw new Error('Please log in to continue');
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
        'You can only add one audio per video per language'
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
  async updateAudio(parent, { id, data }, ctx, info) {
    if (!ctx.request.userId) throw new Error('Please log in to continue');
    // Get Video originId
    const { author } = await ctx.db.query.audio(
      {
        where: { id },
      },
      `{ author { id } }`
    );

    if (author.id !== ctx.request.userId)
      throw new Error('You do not have permission to do that');
    const audioCreateInput = await validateAudioInput(data, ctx, id);
    if (data.language) audioCreateInput.language = data.language;
    const audio = await ctx.db.mutation.updateAudio(
      {
        data: {
          ...audioCreateInput,
        },
        where: {
          id,
        },
      },
      info
    );

    if (!audio) throw new Error('Saving audio to db failed');
    return audio;
  },
  async deleteAudVid(parent, { id, audioId }, ctx, info) {
    const { userId } = ctx.request;
    if (!userId) throw new Error('Please log in to continue');

    if (audioId) {
      // Get Audio author
      const { author } = await ctx.db.query.audio(
        {
          where: { id: audioId },
        },
        `{ author { id } }`
      );

      if (author.id !== userId)
        throw new Error('You do not have permission to do that');

      await ctx.db.mutation.deleteAudio(
        {
          where: {
            id: audioId,
          },
        },
        `{
          video {
            audio { id }
          }
        }`
      );
    }

    // Get Video addedBy and audio list
    const video = await ctx.db.query.video(
      {
        where: { id },
      },
      `{
        addedBy { id }
        audio { id }
      }`
    );

    if (!video.audio.length && video.addedBy.id === userId) {
      return ctx.db.mutation.deleteVideo({
        where: {
          id,
        },
      });
    }
    return video;
  },

  async createAudioVote(parent, { audio, type }, ctx, info) {
    if (!ctx.request.userId) throw new Error('Please log in to continue');
    const query = `{
      id
      type
      user {
        id
      }
    }`;
    const votingAudio = await ctx.db.query.audio(
      {
        where: { id: audio },
      },
      `{
        vote {
          id
          type
          user { id }
        }
      }`
    );
    const existingVote =
      votingAudio.vote.length > 0
        ? votingAudio.vote.find(vote => vote.user.id === ctx.request.userId)
        : null;
    let vote;
    if (!existingVote) {
      vote = ctx.db.mutation.createAudioVote(
        {
          data: {
            type,
            audio: { connect: { id: audio } },
            user: {
              connect: {
                id: ctx.request.userId,
              },
            },
          },
        },
        query
      );
    } else if (existingVote.type !== type) {
      ctx.db.mutation.deleteAudioVote(
        {
          where: {
            id: existingVote.id,
          },
        },
        query
      );
      vote = ctx.db.mutation.createAudioVote(
        {
          data: {
            type,
            audio: { connect: { id: audio } },
            user: {
              connect: {
                id: ctx.request.userId,
              },
            },
          },
        },
        query
      );
    } else if (existingVote.type === type) {
      vote = ctx.db.mutation.deleteAudioVote(
        {
          where: {
            id: existingVote.id,
          },
        },
        query
      );
    }
    return vote;
  },

  async updateVideo(parent, { id, source, language }, ctx, info) {
    if (!ctx.request.userId) throw new Error('Please log in to continue');
    // Get Video originId
    let { originId, addedBy } = await ctx.db.query.video(
      {
        where: { id },
      },
      `{
        addedBy { id }
        originId
      }`
    );

    if (addedBy.id !== ctx.request.userId)
      throw new Error('You do not have permission to do that');
    let videoCreateInput = {};
    // New source
    if (source && source !== originId) {
      // Check if source is YouTube and extract ID from it
      originId = extractYoutubeId(source);
      // Check if new video exists
      const video = await ctx.db.query.video({
        where: { originId },
      });
      if (video) throw new Error('This video has already been added');
      // Validate other input arguments
      videoCreateInput = await validateVideoInput(originId, ctx);
    }
    // Update video in db
    if (language) videoCreateInput.language = language;
    const updatedVideo = await ctx.db.mutation.updateVideo(
      {
        data: {
          ...videoCreateInput,
        },
        where: {
          id,
        },
      },
      info
    );
    if (!updatedVideo) throw new Error('Saving video to db failed');
    return updatedVideo;
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
    if (!videoExists) throw new Error('Video does not exist');

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
    if (!ctx.request.userId) throw new Error('Please log in to continue');
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
    if (!ctx.request.userId) throw new Error('Please log in to continue');
    const existingComment = await ctx.db.query.comment(
      {
        where: {
          id: data.comment,
        },
      },
      `{
        id
        text
        author { id }
      }`
    );
    if (existingComment.author.id !== ctx.request.userId)
      throw new Error('You do not have permission to do that');
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
    if (!ctx.request.userId) throw new Error('Please log in to continue');
    const existingComment = await ctx.db.query.comment(
      {
        where: {
          id: comment,
        },
      },
      `{ author { id } }`
    );
    if (existingComment.author.id !== ctx.request.userId)
      throw new Error('You do not have permission to do that');
    return ctx.db.mutation.deleteComment({
      where: {
        id: comment,
      },
    });
  },

  async createCommentReply(parent, { comment, text }, ctx, info) {
    if (!ctx.request.userId) throw new Error('Please log in to continue');
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
    if (!ctx.request.userId) throw new Error('Please log in to continue');
    const existingReply = await ctx.db.query.commentReply(
      {
        where: {
          id: data.commentReply,
        },
      },
      `{
        id
        text
        author { id }
      }`
    );
    if (existingReply.author.id !== ctx.request.userId)
      throw new Error('You do not have permission to do that');
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
    if (!ctx.request.userId) throw new Error('Please log in to continue');
    const existing = await ctx.db.query.commentReply(
      {
        where: {
          id: commentReply,
        },
      },
      `{ author { id } }`
    );
    if (existing.author.id !== ctx.request.userId)
      throw new Error('Reply not found');
    return ctx.db.mutation.deleteCommentReply({
      where: {
        id: commentReply,
      },
    });
  },
  async createCommentVote(parent, { comment, type }, ctx, info) {
    if (!ctx.request.userId) throw new Error('Please log in to continue');
    const query = `{
      id
      type
      user { id }
    }`;
    const votingComment = await ctx.db.query.comment(
      {
        where: { id: comment },
      },
      `{
        vote {
          id
          type
          user { id }
        }
      }`
    );
    const existingVote =
      votingComment.vote.length > 0
        ? votingComment.vote.find(vote => vote.user.id === ctx.request.userId)
        : null;
    let vote;
    if (!existingVote) {
      vote = ctx.db.mutation.createCommentVote(
        {
          data: {
            type,
            comment: { connect: { id: comment } },
            user: {
              connect: {
                id: ctx.request.userId,
              },
            },
          },
        },
        query
      );
    } else if (existingVote.type !== type) {
      // Just updating vote create issue with Optimistic UI
      // vote = await ctx.db.mutation.updateCommentVote(
      //   {
      //     data: {
      //       type,
      //     },
      //     where: {
      //       id: existingVote.id,
      //     },
      //   },
      //   query
      // );
      ctx.db.mutation.deleteCommentVote(
        {
          where: {
            id: existingVote.id,
          },
        },
        query
      );
      vote = ctx.db.mutation.createCommentVote(
        {
          data: {
            type,
            comment: { connect: { id: comment } },
            user: {
              connect: {
                id: ctx.request.userId,
              },
            },
          },
        },
        query
      );
    } else if (existingVote.type === type) {
      vote = ctx.db.mutation.deleteCommentVote(
        {
          where: {
            id: existingVote.id,
          },
        },
        query
      );
    }
    return vote;
  },
  async createCommentReplyVote(parent, { commentReply, type }, ctx, info) {
    if (!ctx.request.userId) throw new Error('Please log in to continue');
    const query = `{
      id
      type
      user { id }
    }`;
    let vote;
    const votingCommentReply = await ctx.db.query.commentReply(
      {
        where: { id: commentReply },
      },
      `{
        vote {
          id
          type
          user { id }
        }
      }`
    );
    const existingVote =
      votingCommentReply.vote.length > 0
        ? votingCommentReply.vote.find(
            vote => vote.user.id === ctx.request.userId
          )
        : null;
    if (!existingVote) {
      vote = ctx.db.mutation.createCommentReplyVote(
        {
          data: {
            type,
            commentReply: { connect: { id: commentReply } },
            user: {
              connect: {
                id: ctx.request.userId,
              },
            },
          },
        },
        query
      );
    } else if (existingVote.type !== type) {
      // vote = await ctx.db.mutation.updateCommentReplyVote(
      //   {
      //     data: {
      //       type,
      //     },
      //     where: {
      //       id: existingVote.id,
      //     },
      //   },
      //   query
      // );
      ctx.db.mutation.deleteCommentReplyVote(
        {
          where: {
            id: existingVote.id,
          },
        },
        query
      );
      vote = ctx.db.mutation.createCommentReplyVote(
        {
          data: {
            type,
            commentReply: { connect: { id: commentReply } },
            user: {
              connect: {
                id: ctx.request.userId,
              },
            },
          },
        },
        query
      );
    } else if (existingVote.type === type) {
      vote = ctx.db.mutation.deleteCommentReplyVote(
        {
          where: {
            id: existingVote.id,
          },
        },
        query
      );
    }
    return vote;
  },
  async signup(parent, { data }, ctx, info) {
    if (!data.email || !data.password)
      throw new Error('Required fields must not be empty');

    if (data.password.length < 6)
      throw new Error('Password must be at least 6 characters long');

    // Lowercase email and trim arguments
    data.email = data.email.toLowerCase().trim();
    data.name = data.name ? data.name.trim() : '';

    // Check if Email taken
    const emailTaken = await ctx.db.exists.User({ email: data.email });
    if (emailTaken) throw new Error('Email already in use');

    if (!data.displayName) data.displayName = faker.name.findName();
    data.displayName = data.displayName.trim();

    // Check if display name taken
    const displayNameTaken = await ctx.db.exists.User({
      displayName: data.displayName,
    });
    if (displayNameTaken) throw new Error('Display name already in use');

    // Hash password
    const password = await bcrypt.hash(data.password, 10);

    // Save user to db
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          ...data,
          password,
          contentLanguage: { set: data.contentLanguage },
          permissions: { set: ['USER'] },
          avatar: randomAvatar(),
        },
      },
      info
    );

    setCookie({ userId: user.id, ctx });

    // Return the user to the browser
    return user;
  },
  async signin(parent, { email, password }, ctx, info) {
    email = email.toLowerCase().trim();

    // Check if there is user with that email
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      throw new Error('Wrong email or password');
    }

    // Check if password is correct
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error('Wrong email or password');
    }

    setCookie({ userId: user.id, ctx });

    // Return the user
    return user;
  },
  async updateUser(parent, { data }, ctx, info) {
    const { password, newPassword, confirmPassword } = data;
    const { userId } = ctx.request;

    // Take a copy of the updates
    const updates = { ...data };

    // Check signed in
    if (!userId) throw new Error('Please log in to continue');

    // Validate password change
    if (newPassword || confirmPassword) {
      // Check if old password is correct
      const user = await ctx.db.query.user({ where: { id: userId } });
      const valid = await bcrypt.compare(password, user.password);

      if (!confirmPassword || !newPassword || !password) {
        throw new Error('You must fill in all fields');
      } else if (!valid) {
        throw new Error('Old password wrong');
      } else if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      } else if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      } else {
        // Hash new password
        updates.password = await bcrypt.hash(newPassword, 10);
        delete updates.confirmPassword;
        delete updates.newPassword;
      }
    } else {
      // Remove passwords from the updates
      delete updates.password;
      delete updates.newPassword;
      delete updates.confirmPassword;
    }

    // Remove the ID from the updates
    delete updates.id;

    // Run the update method
    return ctx.db.mutation.updateUser(
      {
        data: updates,
        where: {
          id: userId,
        },
      },
      info
    );
  },
  async updateAvatar(parent, { avatar }, ctx, info) {
    // Check signed in
    const { userId } = ctx.request;
    if (!userId) throw new Error('Please log in to continue');

    // Run the update method
    return ctx.db.mutation.updateUser(
      {
        data: {
          avatar,
        },
        where: {
          id: userId,
        },
      },
      info
    );
  },
  signout(parent, args, ctx, info) {
    ctx.response.clearCookie('token');
    return { message: 'Đăng xuất thành công' };
  },
  async requestReset(parent, { email }, ctx, info) {
    // 1. Check if real user
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      return { message: 'Please check your email to continue' };
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
    return { message: 'Please check your email to continue' };
  },
  async resetPassword(
    parent,
    { password, confirmPassword, resetToken },
    ctx,
    info
  ) {
    // 1. Check if passwords match
    if (password.length < 6)
      throw new Error('Password must be at least 6 characters long');
    if (password !== confirmPassword) throw new Error('Passwords do not match');

    // 2. Check token and expiration
    const [user] = await ctx.db.query.users({
      where: {
        resetToken,
        resetTokenExpiry_gte: Date.now() - 3600000,
      },
    });
    if (!user) throw new Error('Token is invalid or expired');

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

    setCookie({ userId: user.id, ctx });

    // 7. return the new user
    return updatedUser;
  },
  async facebookLogin(
    parent,
    {
      data: { accessToken, contentLanguage, facebookUserId },
    },
    ctx,
    info
  ) {
    // Verify access token by fetching user data
    const userData = await getFacebookUser(facebookUserId, accessToken);
    const { id, name, picture } = userData;
    if (!userData) throw new Error('Could not authenticate with Facebook');

    // Check if user exists
    let user = await ctx.db.query.user(
      {
        where: { facebookUserId: id },
      },
      `{
        id
        displayName
        avatar
      }`
    );

    firstLogin = Boolean(!user);

    // If not create him
    if (firstLogin) {
      // Save new user to db
      user = await ctx.db.mutation.createUser(
        {
          data: {
            facebookUserId: id,
            facebookName: name || null,
            displayName: name || null,
            facebookPicture: picture ? picture.data.url : null,
            avatar: picture ? picture.data.url : null,
            contentLanguage: { set: contentLanguage },
            permissions: { set: ['USER'] },
          },
        },
        `{
          id
          displayName
          avatar
        }`
      );
    } else {
      const avatar =
        user.avatar.startsWith(
          'https://platform-lookaside.fbsbx.com/platform/profilepic/?asid='
        ) && picture
          ? picture.data.url
          : user.avatar;
      user = await ctx.db.mutation.updateUser(
        {
          data: {
            facebookPicture: picture ? picture.data.url : null,
            avatar,
          },
          where: { facebookUserId: id },
        },
        `{
        id
        displayName
        avatar
      }`
      );
    }

    setCookie({ userId: user.id, ctx });

    return { user, firstLogin };
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
  async updateContentLanguage(parent, { contentLanguage }, ctx, info) {
    if (!ctx.request.userId) throw new Error('Please log in to continue');

    // Update content language
    return ctx.db.mutation.updateUser(
      {
        data: {
          contentLanguage: {
            set: contentLanguage,
          },
        },
        where: { id: ctx.request.userId },
      },
      info
    );
  },
};

module.exports = mutations;
