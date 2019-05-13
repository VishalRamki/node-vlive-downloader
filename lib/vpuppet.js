const puppeteer = require('puppeteer')
const moment = require('moment')

class VPuppet {
  constructor(headless = true, path = null) {
    this.headless = headless
    this.path = path //"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  }

  /*
    Due to the nature of VLive's timestamps, we can only get an approximated
    DATE for the video upload, we cannot get the timestamp for the video upload.
    the time stamp exsits on the channel page.
  */
  convertToDate(string) {
    var vars = string.split(' ')
    return moment().subtract(parseInt(vars[0]), vars[1]).format('L')
  }

  async getMetaData (url) {
    var _ = this
    return new Promise(function(resolve, reject) {
      puppeteer.launch({headless: _.headless, executablePath: _.path}).then(async browser => {
        const page = await browser.newPage();
        let obj = {}
        await page.setRequestInterception(true);
        let returnVal = null
        page.on('request', async interceptedRequest =>  {
          if (interceptedRequest.url().includes('vod_play_videoInfo.json')) {
            returnVal = interceptedRequest.url()
            obj.vod_url = returnVal
          }
            interceptedRequest.continue()
        })

        try {
          page.goto(url, {waitUntil: 'networkidle0'}).then(async () => {
            let channel = await page.$eval('a.name:nth-child(1)', function(link) {
              return link.innerText
            })
            let video_title = await page.$eval('.vlive_info > strong:nth-child(1)', function(title) {
              return title.innerText
            })
            let video_plays = await page.$eval('.info_tx > span:nth-child(1) > span:nth-child(2)', function(plays) {
              return plays.innerText
            })
            let likes = await page.$eval('.info_tx > span:nth-child(2) > span:nth-child(2)', function(e) {
              return e.innerText
            })
            let dates_ago = await page.$eval('span.date:nth-child(3)', function(e) {
              return e.innerText
            })
            obj.channel = channel
            obj.title = video_title
            obj.views = video_plays
            obj.likes = likes
            obj.date = _.convertToDate(dates_ago)
            await browser.close()
            resolve(obj)
          })
        } catch(e) {
          reject(e)
        }
      })
    })
  }

  buildPuppeetOptions() {
    return (path == null ?
      {
        headless: headless
      }
      :
      {
        headless: headless,
        executablePath: path
      })
  }
}

module.exports = VPuppet
