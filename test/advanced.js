var browser = (require("../index.js")()).vBrowser
var helper = (require("../index.js")()).Helper
const url = "https://www.vlive.tv/video/153001?channelCode=EDBF";


(async function() {
  // get meta data from browser
  let metadata = await browser.getMetaData(`${url}`)
  // load it into memory
  let memory = await helper.saveToMemory(metadata.vod_url)
  //console.log(memory)
  // parse byte data into JS Object
  let vodData = await helper.parseJson(memory)
  //console.log(vodData)
  console.log(vodData.video_captions)

  // just download all the subs
  let subtiles = await helper.downloadAllSubtitles(vodData.video_captions.list)
  // find the meta data of the video we want to download
  let video2dl = await helper.getVideoEncode('1080')
  // download the file, and keep track of its location
  let dl = await helper.downloadVideoFile(video2dl, function(progress) {
    console.log(progress)
  })
  // merge the file.
  await helper.MergeIntoMKV(dl, subtiles, video2dl)

})()
