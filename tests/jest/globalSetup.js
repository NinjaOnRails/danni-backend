require("babel-register")
require('@babel/polyfill/noConflict')

const createServer = require("../../src/createServer")
const server = createServer()
module.exports = async ()=>{
  global.httpServer = await server.start({port: 5000})
}