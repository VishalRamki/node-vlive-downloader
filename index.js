const puppet = require('./lib/vpuppet')
const helper = require('./lib/vhelper')
const fs = require('fs')

function checkOrCreateDir(path) {
  if (!fs.existsSync(path)){
      fs.mkdirSync(path);
  }
}

module.exports = function(helperOpts = null, browserOpts = {headless: true}) {
  /*
    Setup Folder structure.
  */
  var paths = ['tmp/', 'tmp/srt/', 'tmp/vtt/', 'tmp/video/']
  for (var path of paths) {
    console.log(path)
    checkOrCreateDir(path)
  }
  return {
    vBrowser: new puppet(browserOpts.headless),
    Helper: new helper()
  }
}
