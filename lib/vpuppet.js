const puppeteer = require('puppeteer')

class VPuppet {
  constructor(headless = true, path = null) {
    this.headless = headless
    this.path = path //"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
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
            obj.channel = channel
            obj.title = video_title
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
