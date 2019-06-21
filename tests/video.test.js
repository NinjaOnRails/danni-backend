require('cross-fetch/polyfill');


const { gql } = require ('apollo-boost');
const {seedDB, videoOne, videoTwo, captionOne } =  require('./utils/seedDB')
const getClient = require('./utils/getClient');
const prisma = require ('../src/db');
const extractYoutubeId = require('../src/utils/extractYoutubeId');



jest.setTimeout(100000);

const client = getClient();

const password = 'dracarys';

const ytIds = [
  'yrDdavDaGSI',
  'TuZ5An350sU',
  'vV5v2Ikfiqc',
  '0ssySdK98zk',
  'lGnLulWwmx0',
];

beforeAll(seedDB);



// test('Should return 2 videos', async () => {
//   const getVideos = gql`
//     query {
//       videos {
//         id
//         originId
//         originTitle
//         titleVi
//       }
//     }
//   `;
//   const response = await client.query({ query: getVideos });
//   expect(response.data.videos.length).toBe(2);
// });

test('Should create video with 3 tags', async () => {
  const createVideo = gql`
    mutation {
      createVideo(data:
       { source: "wYoxNbQGS94",
        titleVi: "Hound",
         tags: "first second third",
        
         defaultVolume: 20 }) {
        id
        originId
        originTitle
        addedBy
        originPlatform
        titleVi
        startAt
        defaultVolume
        tags{
          text
        }
        
      }
    }
  `;
  const {data} = await client.mutate({ mutation: createVideo });

  expect(data.createVideo.originId).toBe('wYoxNbQGS94');
  expect(data.createVideo.addedBy).toBe('Anonymous');
  expect(data.createVideo.originPlatform).toBe('YouTube');
  expect(data.createVideo.titleVi).toBe('Hound');
  expect(data.createVideo.defaultVolume).toBe(20);
  expect(data.createVideo.tags.length).toBe(3)
});

test('Should delete John video', async () => {
  const deleteVideo = gql`
  mutation{
    deleteVideo(
      id: "${videoOne.video.id}"
      password: "${password}"
      ){
        originId
        originTitle
      }
  }`;
  const response = await client.mutate({ mutation: deleteVideo });
  const exist = await prisma.exists.Video({ id: videoOne.video.id });

  expect(response.data.deleteVideo.originId).toBe(videoOne.video.originId);
  expect(exist).toBe(false);
});

test('Should update training video, and return 3 tags', async () => {
  const updateVideo = gql`
  mutation{
    updateVideo(
      id: "${videoTwo.video.id}"
      password: "${password}"
      data:{
        source: "ICnUJl0t0Xw"
        titleVi: "Updated by testing"
        tags: "ok swag awesome"
      }
    ){
      originId
      tags{
        text
      }
    }
  }`;
  const response = await client.mutate({ mutation: updateVideo });
  const exist = await prisma.exists.Video({
    originId: videoTwo.video.originId,
  });
  expect(response.data.updateVideo.originId).toBe('ICnUJl0t0Xw');
  expect(response.data.updateVideo.tags.length).toBe(3);
  expect(response.data.updateVideo.tags[0].text).toBe("ok");

  expect(exist).toBe(false);
});

// test('Should not create video with invalid url', async () => {
//   const createVideo = gql`
//     mutation {
//       createVideo(data: { source: "0w1utU", titleVi: "Hong Kog" }) {
//         id
//         originId
//         originTitle
//         addedBy
//         originPlatform
//         titleVi
//       }
//     }
//   `;
//   await expect(client.mutate({ mutation: createVideo })).rejects.toThrow();
// });

// test('Should not delete training video w/ invalid password', async () => {
//   const deleteVideo = gql`
//   mutation{
//     deleteVideo(
//       id: "${videoTwo.video.id}"
//       password: "dracary"
//       ){
//         originId
//         originTitle
//       }
//   }`;
//   const exist = await prisma.exists.Video({ id: videoTwo.video.id });
//   expect(exist).toBe(true);
//   await expect(client.mutate({ mutation: deleteVideo })).rejects.toThrow();
// });

// test('Should not update training video w/ password', async () => {
//   const updateVideo = gql`
//   mutation{
//     updateVideo(
//       id: "${videoTwo.video.id}"
//       password: "dracary"
//       data:{
//         source: "ICnUJl0t0Xw"
//         titleVi: "Updated by test"
//       }
//     ){
//       originId
//     }
//   }`;
//   await expect(client.mutate({ mutation: updateVideo })).rejects.toThrow();
//   const exist = await prisma.exists.Video({
//     originId: 'ICnUJl0t0Xw',
//   });
//   expect(exist).toBe(false);
// });

test('Should add tag to videoTwo', async () => {
  const createTag = gql`
  mutation{
    createTag(text: "tagfromtest"
    video: "${videoTwo.video.id}"){
      id
      text
      
    }
  }
  `;
  const response = await client.mutate({ mutation: createTag });
  expect(response.data.createTag.text).toBe('tagfromtest');
  const tagsAmount = await prisma.query.tags(null)
  expect(tagsAmount.length).toBe(9)
});


test('Should add caption to videoTwo', async () => {
  const createCaption = gql`
    mutation {
      createCaption(
        data: { languageTag: "en", video: "${videoTwo.video.id}" }
      ) {
        id
        languageTag
      }
    }
  `;
  const response = await client.mutate({ mutation: createCaption });
  expect(response.data.createCaption.languageTag).toBe('en');
});

test('Should add audio to videoTwo', async () => {
  const createAudio = gql`
  mutation{
    createAudio(data:{
      source: "www.audio.com",
      language: VIETNAMESE,
      video: "${videoTwo.video.id}",
      caption: "${captionOne.caption.id}",
    }){
      id
      source
      language

    }
  }
  `;

  const response = await client.mutate({ mutation: createAudio });
  expect(response.data.createAudio.source).toBe('www.audio.com');
  expect(response.data.createAudio.language).toBe('VIETNAMESE');
});

test('Should return correct originId', async () => {
  const vidIndex = Math.floor(Math.random() * 4);
  const inputId = ytIds[vidIndex];
  const originId = await extractYoutubeId(inputId);
  expect(originId).toBe(inputId);
});
