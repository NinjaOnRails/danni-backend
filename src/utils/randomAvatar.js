const avatars = {
  0: 'christian.jpg',
  1: 'elliot.jpg',
  2: 'helen.jpg',
  3: 'joe.jpg',
  4: 'matt.jpg',
  5: 'matthew.png',
  6: 'molly.png',
  7: 'nan.jpg',
  8: 'rachel.png',
  9: 'steve.jpg',
  10: 'stevie.jpg',
  11: 'zoe.jpg',
};

module.exports = () => {
  return `../../static/avatar/large/${
    avatars[Math.floor(Math.random() * Math.floor(12))]
  }`;
};
