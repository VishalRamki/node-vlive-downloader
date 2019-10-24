const fs = require('fs')
const download = require('download')
const ffmpeg = require('fluent-ffmpeg')

const VTT = 'vtt', SRT = 'srt', VIDEO = 'video'

class VHelper {
  constructor(tmp) {
    this.srt_subtitles = []
    //this.vtt_subtitles = []
    this.video_meta = []
    this.voddata = null

    if (tmp != null && tmp[tmp.length-1] == '/') tmp = tmp.slice(0, -1)
    this.tmpFolder = tmp || 'tmp/'

    this.selectedFile = null
    this.downloadedFile = {}
  }

  async parseJson(json) {
    var _ = this
    return new Promise(function(resolve, reject) {
      try {
        let object = null
        if (json && typeof json == 'object') {
          object = json
        } else {
          JSON.parse(json)
        }
        _.voddata = _.processIntoInternalModel(object)
        resolve(_.voddata)
      } catch(e) {
        reject(e)
      }
    })
  }

  async getVideoFormatEncodes(video_list = this.voddata.video_list) {
    let _ = this
    let encode_list = []
    return new Promise(function(resolve, reject) {
      try {
        for (let i = 0; i < video_list.length; i++) {
          _.video_meta.push(_.processRawVideoMetaIntoInternalModel(video_list[i]))
        }
        resolve(_.video_meta)
      } catch(e) {
        reject(e)
      }
    })
  }

  processIntoInternalModel(json) {
    var model = {}

    model.meta = {}
    model.meta.title = json.meta.subject
    model.meta.url = json.meta.url


    model.image_data = {}
    model.image_data.cover = json.meta.cover.source

    model.video_list = json.videos.list
    model.video_streams = json.streams
    model.video_captions = (json.captions == undefined ? {list: []} : json.captions)
    model.video_thumbs = json.thumbnails
    return model
  }

  processRawVideoMetaIntoInternalModel(video_meta) {
    var model = {}
    model.id = video_meta.id
    model.duration = video_meta.duration
    model.fileSize = video_meta.size
    model.videoType = video_meta.type
    model.encodingData = {
      encodeId: video_meta.encodingOption.id,
      name: video_meta.encodingOption.name,
      profile: video_meta.encodingOption.profile,
      width: video_meta.encodingOption.width,
      height: video_meta.encodingOption.height,
      videoBitrate: video_meta.bitrate.video,
      audioBitrate: video_meta.bitrate.audio,
    }
    model.source = video_meta.source
    return model
  }


  async downloadAllSubtitles(list = this.voddata.video_captions.list) {
    var _ = this
    if (list == null || !list || list.length <= 0) {
      return []
    }

    return new Promise(async function(resolve, reject) {
      try {
        for (var i = 0; i < list.length;i++) {
          await _.saveSingleSubtitle(list[i].source, list[i])
        }

        resolve(_.srt_subtitles)
      } catch(e) {
        reject(e)
      }

    })
  }

  getSubtitleObject(locale, subtitlepool = this.voddata.video_captions.list) {
    for (let i = 0; i < subtitlepool.length; i++) {
      if (subtitlepool[i].locale.toLowerCase().includes(locale.toLowerCase())) {
        return subtitlepool[i]
      }
    }
    return null
  }

  async downloadSubtitles(localeList, subtitlePool = this.voddata.video_captions) {
    var _ = this
    if (!localeList || localeList.length <= 0) {
      return null
    }

    return new Promise(async function(resolve, reject) {
      try {

        // single locale
        if (typeof localeList == "string") {
          let subtitle = _.getSubtitleObject(localeList, subtitlePool)
          await _.saveSingleSubtitle(subtitle.source, subtitle)
          resolve(_.srt_subtitles)
          return
        }

        // multiple locales
        for (var i = 0; i < localeList.length;i++) {
          let currSub = _.getSubtitleObject(localeList[i], subtitlePool)
          console.log(currSub)
          if (currSub != null)
            await _.saveSingleSubtitle(currSub.source, currSub)
        }

        resolve(_.srt_subtitles)
      } catch(e) {
        reject(e)
      }

    })
  }

  saveSingleSubtitle(url, subtitle) {
    let _ = this
    return new Promise(function(resolve, reject) {
      download(url).then(data => {
        let subtitleMeta = {
          path: _.getTmpFileLocation(`subtitle-${subtitle.locale}.vtt`, VTT),
          lang: subtitle.language,
          filename: `subtitle-${subtitle.locale}.vtt`,
          format: 'vtt'
        }
        // writes *.vtt to path
        fs.writeFileSync(subtitleMeta.path,data)
        let srtMeta = {
          path: _.getTmpFileLocation(`subtitle-${subtitle.locale}.srt`, SRT),
          lang: subtitle.language,
          locale: subtitle.locale,
          filename: `subtitle-${subtitle.locale}.srt`,
          format: 'srt',
          country: subtitle.country,
          label: subtitle.label,
          type: subtitle.type,
          fan: subtitle.fanName ? subtitle.fanName : "",
        }
        // convert to *.srt
        let ff = new ffmpeg()
        ff.addInput(subtitleMeta.path)
          .outputOptions(['-y'])
          .output(`${_.getTmpFileLocation(`subtitle-${subtitle.locale}.srt`, SRT)}`)
          .run()
        // removes tmp file;
        //fs.unlinkSync(subtitleMeta.path)
        //_.vtt_subtitles.push(subtitleMeta)
        _.srt_subtitles.push(srtMeta)
        resolve(true)
      }).catch(e => {
        reject(e)
      })
    })
  }

  async getVideoEncode(encode) {
    let _ = this
    return new Promise(function(resolve, reject) {
      try {
        for(var i = 0; i < _.voddata.video_list.length; i++) {
          if (_.voddata.video_list[i].encodingOption.name.toLowerCase()
                .includes(encode.toLowerCase())) {
            _.selectedFile = _.voddata.video_list[i]
          }
        }
        resolve(_.selectedFile)
      } catch(e) {
        reject(e)
      }
    });
  }

  async MergeIntoMKV(downloadedFile = this.downloadedFile,
                     srt_subtitles = this.srt_subtitles,
                     selectedFile = this.selectedFile) {
    let _ = this
    return new Promise(function(resolve, reject) {
      let ff = new ffmpeg()
      ff.addInput(downloadedFile.path)
      let i = 0
      // add subtitles
      for (i = 0; i < srt_subtitles.length; i++) {
        ff.addInput(srt_subtitles[i].path)
      }
      let oo = []
      // map subs
      for (i = 0; i < srt_subtitles.length; i++) {
        oo.push(`-map ${i}`)
      }

      for (i = 0; i < srt_subtitles.length; i++) {
        oo.push(`-metadata:s:s:${i} language=${_.getLang(srt_subtitles[i].locale)}`)
      }
      oo.push(`-c copy`)
      ff.outputOptions(oo)
        .output(`tmp/\[${selectedFile.id}\].mkv`)
        .run()
    });
  }

  getLang(sub) {
      if (sub.includes('en_US')) {
          return 'eng';
      } else if (sub.includes('es_ES') || sub.includes('es_PA')) {
          return 'spa';
      } else if (sub.includes('ar_AE')) {
          return 'ara';
      } else if (sub.includes('in_ID')) {
          return 'ind';
      } else if (sub.includes('ja_JP')) {
          return 'jpn';
      } else if (sub.includes('ko_KR')) {
          return 'kor';
      } else if (sub.includes('pt_PT') || sub.includes('pt_BR')) {
          return 'por';
      } else if (sub.includes('th_TH')) {
          return 'tha';
      } else if (sub.includes('ru_RU')) {
          return 'rus';
      } else if (sub.includes('pl_PL')) {
          return 'pol';
      } else if (sub.includes('fr_FR')) {
          return 'fre';
      } else if (sub.includes('tr_TR')) {
          return 'tur';
      } else if (sub.includes('vi_VN')) {
          return 'vie';
      } else if (sub.includes('zh_TW') || sub.includes('zh_CN')) {
          return 'chi';
      }
      return false;
  };

  async downloadFile(selectedFile = this.selectedFile, progress = null) {
    let _ = this
    return new Promise(function(resolve, reject) {
      download(selectedFile.source).on('downloadProgress', (z) => {
        if (progress!=null) progress(z)
      })
      .then(data => {
        let vmeta = {
          path: _.getTmpFileLocation(`${selectedFile.id}.mp4`, VIDEO)
        }
        fs.writeFileSync(vmeta.path,data)
        _.downloadedFile = vmeta
        resolve(_)
      }).catch(e => {
        reject(e)
      })
    })
  }

  async downloadVideoFile(cb, progress = null) {
    let _ = this
    return new Promise(function(resolve, reject) {
      download(_.selectedFile.source).on('downloadProgress', (z) => {
        if (progress!=null) progress(z)
      })
      .then(data => {
        let vmeta = {
          path: _.getTmpFileLocation(`${_.selectedFile.id}.mp4`, VIDEO)
        }
        fs.writeFileSync(vmeta.path,data)
        _.downloadedFile = vmeta
        resolve(_.downloadedFile)
      }).catch(e => {
        reject(e)
      })
    })
  }

  async saveToDisk(url) {
    let _ = this
    return new Promise(function(resolve, reject) {
      download(url).then(data => {
        fs.writeFileSync(_.getTmpFileLocation('vod_play_videoInfo.json'),data)
        resolve(_.getTmpFileLocation('vod_play_videoInfo.json'))
      }).catch(e => {
        reject(e)
      })
    })
  }

  async saveToMemory(url) {
    let _ = this
    return new Promise(function(resolve, reject) {
      download(url).then(data => {
        try {
          let mem = JSON.parse(data)
          resolve(mem)
        } catch(e) {
          reject(e)
        }
      }).catch(e => {
        reject(e)
      })
    })
  }

  getTmpFileLocation(filename, filter = null) {
    if (!filter) return this.tmpFolder + filename
    return `${this.tmpFolder}${filter}/${filename}`
  }
}

module.exports = VHelper
