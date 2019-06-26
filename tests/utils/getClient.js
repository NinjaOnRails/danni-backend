const ApolloBoost = require('apollo-boost').default;

jest.setTimeout(10000);

function getClient () {
  return new ApolloBoost({
    uri: 'http://localhost:5000',
   
  });
};

module.exports =  getClient;
