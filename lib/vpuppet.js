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
          if (interceptedRequest.url().includes('https://apis.naver.com/rmcnmv/rmcnmv/vod/play/v2.0/')) {
            returnVal = interceptedRequest.url()
            obj.vod_url = returnVal
          }
            interceptedRequest.continue()
        })

        try {
          page.goto(url, {waitUntil: 'networkidle0'}).then(async () => {
            let channel = await page.$eval('html body div#wrap div#root div.layout--2CJge div.layout_main--2iozc div.snb--dI3H2 nav.nav--Lwe6x div.channel_area--3-r0f a.channel_link--3kVMW strong.channel_name--1VIVt', function(link) {
              return link.innerText
            })
            let video_title = await page.$eval('html body div#wrap div#root div.layout--2CJge div.layout_main--2iozc div.layout_content--3-hGQ.-vod_end--2Jvzg div.video_wrap--3MjrH.-vod--2KRkA div.vod_main--1Yx22 div.video_content--2NTB_ div.video_detail--37R_3 div.detail_content_wrap--A4_IF div.text_area--1z8D6 span.video_title--3Vd9y', function(title) {
              return title.innerText.replace("REPLAY ", "").replace("REPLAY\n", "")
            })
            let video_plays = await page.$eval('html body div#wrap div#root div.layout--2CJge div.layout_main--2iozc div.layout_content--3-hGQ.-vod_end--2Jvzg div.video_wrap--3MjrH.-vod--2KRkA div.vod_main--1Yx22 div.video_content--2NTB_ div.video_detail--37R_3 div.detail_content_wrap--A4_IF div.text_area--1z8D6 span.play_count--3NwBL', function(plays) {
              return plays.innerText.replace("Play ", "")
            })
            let likes = await page.$eval('html body div#wrap div#root div.layout--2CJge div.layout_main--2iozc div.layout_content--3-hGQ.-vod_end--2Jvzg div.video_wrap--3MjrH.-vod--2KRkA div.vod_main--1Yx22 div.video_content--2NTB_ div.video_detail--37R_3 div.post_add_info--at4I0 div.reaction_wrap div.reaction_item--2jbbr button.emotion_icon--27Hbu span.count--3fVHm', function(e) {
              return e.innerText
            })
            let dates_ago = await page.$eval('html body div#wrap div#root div.layout--2CJge div.layout_main--2iozc div.layout_content--3-hGQ.-vod_end--2Jvzg div.video_wrap--3MjrH.-vod--2KRkA div.vod_main--1Yx22 div.video_content--2NTB_ div.video_detail--37R_3 div.post_header--7D-xg.-video--3Fg6w div.writer_info--3Sw41 div.writer_info_textarea_wrap--1x9m_ div.post_info_wrap--3oPz4 span.post_info--3AqO0', function(e) {
              return e.innerText
            })
            obj.channel = channel
            obj.title = video_title
            obj.views = video_plays
            obj.likes = likes
            obj.date = dates_ago
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
