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

const mutations = {
  async createVideo(parent, { source, language }, ctx, info) {
    // Check if user is logged in
    if (!ctx.request.userId) throw new Error('Bạn chưa đăng nhập');

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
    if (!ctx.request.userId) throw new Error('Bạn chưa đăng nhập');

    // Check if user already added Audio to this Video in the same language
    const audios = await ctx.db.query.audios({
      where: {
        AND: [
          { video: { id: data.video } },
          { author: { id: ctx.request.userId } },
          { language: data.language}
        ],
      },
    });
    if (audios.length) throw new Error('Mỗi người chỉ được đăng 1 audio cho mỗi video trong ngôn ngữ này');

    // Validate other input arguments
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
  async signup(parent, { data }, ctx, info) {
    // Lowercase email and trim arguments
    data.email = data.email.toLowerCase().trim();
    data.name = data.name ? data.name.trim() : '';

    // Check if Email taken
    const emailTaken = await ctx.db.exists.User({ email: data.email });
    if (emailTaken) throw new Error('Email đã có người khác sử dụng');

    if (!data.displayName) data.displayName = faker.name.findName();
    data.displayName = data.displayName.trim();

    // Check if display name taken
    const displayNameTaken = await ctx.db.exists.User({
      displayName: data.displayName,
    });
    if (displayNameTaken)
      throw new Error('Tên hiển thị đã có người khác sử dụng');

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
    const token = jwt.sign({ userId: user.id }, process.env.COOKIE_SECRET, {
      expiresIn: '365d',
    });

    // Set jwt as cookie on response
    ctx.response.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: true,
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
    const token = jwt.sign({ userId: user.id }, process.env.COOKIE_SECRET, {
      expiresIn: '365d',
    });

    // Set the cookie with the token
    ctx.response.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: true,
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
    if (password !== confirmPassword)
      throw new Error('Hai mật khẩu không khớp');

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
    const token = jwt.sign(
      { userId: updatedUser.id },
      process.env.COOKIE_SECRET
    );

    // 6. Set JWT cookie
    ctx.response.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: true,
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });

    // 7. return the new user
    return updatedUser;
  },
};

module.exports = mutations;
