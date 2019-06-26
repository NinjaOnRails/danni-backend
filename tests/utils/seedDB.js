const prisma = require ('../../src/db');


export const videoOne = {
  input: {
    originId: '7SWvDHvWXok',
    originTitle: 'TedEd',
    originPlatform: 'YouTube',
    addedBy: 'tester1',
  },
  video: undefined,
};

export const videoTwo = {
  input: {
    originId: '-_GYT9RrkxQ',
    originTitle: 'Rotator cuffs',
    originPlatform: 'YouTube',
    addedBy: 'tester2',
  },
  video: undefined,
};

export const audioOne = {
  input: {
    source: 'audioSource1',
    language: 'VIETNAMESE',
  },
  audio: undefined,
};

export const audioTwo = {
  input: {
    source: 'audioSource2',
    language: 'CZECH',
  },
  audio: undefined,
};

export const captionOne = {
  input: {
    xml: 'capSource1',
    languageTag: 'vn',
  },
  caption: undefined,
};

export const captionTwo = {
  input: {
    xml: 'capSource2',
    languageTag: 'cs',
  },
  caption: undefined,
};

export const tagOne = {
  input: {
    text: 'hashtag',
  },
  tag: undefined,
};
export const tagTwo = {
  input: {
    text: 'swagokawesome',
  },
  tag: undefined,
};

export const seedDB = async () => {
  try {
    await prisma.mutation.deleteManyVideos();
    await prisma.mutation.deleteManyAudios();
    await prisma.mutation.deleteManyCaptions();
    await prisma.mutation.deleteManyTags();

    videoOne.video = await prisma.mutation.createVideo({
      data: videoOne.input,
    });
    videoTwo.video = await prisma.mutation.createVideo({
      data: videoTwo.input,
    });

    captionOne.caption = await prisma.mutation.createCaption({
      data: {
        ...captionOne.input,
        video: {
          connect: {
            id: videoOne.video.id,
          },
        },
      },
    });
    captionTwo.caption = await prisma.mutation.createCaption({
      data: {
        ...captionTwo.input,
        video: {
          connect: {
            id: videoTwo.video.id,
          },
        },
      },
    });
  
    audioOne.audio = await prisma.mutation.createAudio({
      data: {
        ...audioOne.input,
        video: { connect: { id: videoOne.video.id } },
        caption: { connect: { id: captionOne.caption.id } },
      },
    });
    audioTwo.audio = await prisma.mutation.createAudio({
      data: {
        ...audioTwo.input,
        video: { connect: { id: videoTwo.video.id } },
        caption: { connect: { id: captionTwo.caption.id } },
      },
    });
    tagOne.tag = await prisma.mutation.createTag({
      data: {
        ...tagOne.input,
        video: { connect: { id: videoOne.video.id } },
      },
    });
    tagTwo.tag = await prisma.mutation.createTag({
      data: {
        ...tagTwo.input,
        video: { connect: { id: videoTwo.video.id } },
      },
    });
  } catch (e) {
    console.log(e);
  }
};
