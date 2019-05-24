const youtube = require('../utils/youtube');
const captionDownload = require('../utils/captionsDownload');
const languageTags = require('../config/languageTags');

const mutations = {
  async createVideo(parent, { youtubeId }, ctx, info) {
    const res = await youtube.get('/videos', {
      params: {
        id: youtubeId,
      },
    });

    const {
      thumbnails: {
        medium: { url },
      },
      channelTitle,
      localized: { title },
      defaultAudioLanguage,
    } = res.data.items[0].snippet;

    const video = await ctx.db.mutation.createVideo(
      {
        data: {
          youtubeId,
          title,
          channelTitle,
          defaultLanguage: defaultAudioLanguage,
          thumbnailUrl: url,
        },
      },
      info
    );

    // Attempt to download captions given the list of languageTags and then save them to the db
    if (video) {
      languageTags.forEach(languageTag => {
        captionDownload(video.youtubeId, languageTag)
          .then(caption => {
            ctx.db.mutation.createCaption(
              {
                data: {
                  languageTag,
                  xml: caption,
                  video: {
                    connect: {
                      id: video.id,
                    },
                  },
                },
              },
              info
            );
          })
          .catch(err => {});
      });
    }

    return video;
  },
  async createAudio(
    parent,
    {
      data: { source, language, video },
    },
    ctx,
    info
  ) {
    const audio = await ctx.db.mutation.createAudio(
      {
        data: {
          source,
          language,
          video: {
            connect: {
              id: video,
            },
          },
        },
      },
      info
    );

    return audio;
  },
  async createCaption(
    parent,
    {
      data: { languageTag, xml, json, author, video },
    },
    ctx,
    info
  ) {
    const caption = await ctx.db.mutation.createCaption(
      {
        data: {
          languageTag,
          xml,
          json,
          author,
          video: {
            connect: {
              id: video,
            },
          },
        },
      },
      info
    );

    return caption;
  },
};

module.exports = mutations;
