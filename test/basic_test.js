const puppet = require('../lib/vpuppet')
const helper = require('../lib/vhelper')
const fs = require('fs')
var VP = new puppet(false)
var Helper = new helper()



async function runner() {
  // get the data from the url;
  let data = await VP.getMetaData('https://www.vlive.tv/video/122622?channelCode=EDBF')
  console.log('Meta data collected')
  let processed = await Helper.saveVODJson(data.vod_url)
  console.log('vod_play_videoInfo.json file has been saved')
  let rawdata = fs.readFileSync('./tmp/vod_play_videoInfo.json');
  Helper.parseJson(rawdata).then(async helper => {
    console.log('vod meta data has been read into memory')
    await helper.downloadSubtitles(helper.voddata.video_captions.list)
    console.log('subtitles downaloded and converted')
    await helper.findEncode('1080P')
    console.log('encode founded')
    await helper.downloadFile()
    console.log('downloaded file')
    await helper.MergeIntoMKV()
    console.log('merge completed.')

  })
}
//runner()

async function metaCollection() {
  let data = await VP.getMetaData('https://www.vlive.tv/video/122622?channelCode=EDBF')
  console.log(data)
}

metaCollection()
