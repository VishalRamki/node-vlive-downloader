# node-vlive-downloader

An automatic Vlive video downloader which, Given the URI:

1. Automatically downloads the `vod_play_videoInfo.json` file which is dynamically loaded.
2. Downloads the Video format specified by a user string.
3. Merges **ALL** the available subtitles with the file specified above into an `*.mkv` file

# Roadmap

- [ ] Command line interface to run globally
- [ ] Write Proper tests

# Changelog

## Hotfix - v0.1.5

- Added a new proper working test, `test/advanced.js`. Disregard `test/basic_test.js`
- Ensures that the library doesn't fail/crash/error out when a video with no captions is selected to download.

## Meta - v0.1.4

- Added the ability to collection additional metadata from the video's page.

Variable Name | typeof | What is it
--- | --- | ---
`plays` | `integer` | Number of times the video has been played.
`likes` | `integer` | Number of times the video has been liked.
`date` | `string` | The approximated date the video was published. Due to the nature of VLive's time backdating we can not get an accurate timestamp, only an estimated **DATE**.

# History

I originally wrote a CLI version of this using `child_process` and `ffmpeg` after seeing @drklee3 's version of a vlive-downloader. Their code was great, but required more than just `ffmpeg` and it required you to manually get the `vod_play_videoInfo.json` file and pass it in as a command function.

The other version I spoke about above required two separate programs installed in other to generate the `*.mkv` files. `node-vlive-downloader` only uses `ffmpeg` to do everything basically.

# Prerequisites

1. Requires `ffmpeg` to be installed on the host machine.
2. [OPTIONAL] Requires an instance of `Chrome`. Sometimes the internal `Chromium` build may not be able to get the data, and `Chrome` might be needed.

# Installation

## Installing the Library

```bash
yarn add node-vlive-downloader
```

# Usage

When using the library in your code, most of the libraries functions can either be used via `Promises` or using `Async/Await`.

## Full Example

This is a general idea of how the library can be used. The API below this code block will explain in detail the features and return values.

```javascript
var browser = (require("node-vlive-downloader")()).vBrowser
var helper = (require("node-vlive-downloader")()).Helper
const url = "YOUR URL HERE";


(async function() {
  // get meta data from browser
  let metadata = await browser.getMetaData(`${url}`)
  // load it into memory
  let memory = await helper.saveToMemory(metadata.vod_url)
  // parse byte data into JS Object
  let vodData = await helper.parseJson(memory)
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
```

## Getting Meta Data from URI

This will launch a headless `Chromium` browser, that will attach listeners to its network requests. Once it detects the `vod_play_videoInfo.json` file it will store its location, and once `networkidle0` fires, it will scrape the page for the additional meta data.

Example code using `Promises`

```javascript
let browser = (require('node-vlive-downloader')()).vBrowser
const url = "YOUR_URL_HERE"

browser.getMetaData(`${url}`).then(metadata => {
  console.log(metadata)
}).catch(error => {
  console.error(error)
})
```

Example code using `Async/Await`

```javascript
let browser = (require('node-vlive-downloader')()).vBrowser
const url = "YOUR_URL_HERE";

(async function() {
  let metadata = await browser.getMetaData(`${url}`)
  console.log(metadata)
})()
```

### `vBrowser.getMetaData` Returns

Variable Name | typeof | What is it
--- | --- | ---
`vod_url` | `string` | A URI to the JSON File which contains the raw meta data that VLive's player uses.
`channel` | `string` | Name of the Channel that uploaded the video.
`title` | `string` | Name of the video being requested.
`plays` | `integer` | Number of times the video has been played.
`likes` | `integer` | Number of times the video has been liked.
`date` | `string` | The approximated date the video was published. Due to the nature of VLive's time backdating we can not get an accurate timestamp, only an estimated **DATE**.

## Downloading The `vod_play_videoInfo.json` file

Once you have the link, you can either save it to disk, or you can save it to memory. You can manually process this file/link, or you can use the built-in model schemas to then filter the data you want.

Example code where you save it to disk

```javascript
(async function() {
  let metadata = await browser.getMetaData(`${url}`)
  console.log(metadata)
  let savetodisk = await helper.saveToDisk(metadata.vod_url)
  console.log(savetodisk)
})()
```

### `Helper.saveToDisk` Returns

Variable Name | typeof | What is it
--- | --- | ---
**returns** | `string` | A path to saved file. Defaults to `tmp/vod_play_videoInfo.json`

Example code where you save it to memory

```javascript
(async function() {
  let metadata = await browser.getMetaData(`${url}`)
  console.log(metadata)
  let memory = await helper.saveToMemory(metadata.vod_url)
  console.log(memory)
})()
```

### `Helper.saveToMemory` Returns

Variable Name | typeof | What is it
--- | --- | ---
**returns** | `json` | Once the buffer is downloaded via the url, it is parsed, and will return a `json` object if successful.

## Parsing the JSON File

Once you have saved the file either to memory or to disk, you will need to reload it for `node-vlive-downloader` to be able to use it to process data. This parsing process loads the varying data from `vod_play_videoInfo.json` into a more structured schema, one that `node-vlive-downloader` understands.

Example parsing the JSON object from disk.

```javascript
(async function() {
  // ...
  // load from browser into memory/disk
  let metadata = JSON.parse(fs.readFileSync('tmp/vod_play_videoInfo.json'))
  let vodData = await helper.parseJson(metadata)
  console.log(vodData)
})()
```

### `Helper.parseJson` Returns

Variable Name | typeof | What is it
--- | --- | ---
**returns** | `json` | Passing in a string, buffer, or JSON object, will yield a `JSON` object if successful, or an error if not.

## Downloading Subtitles

You can download the subtitles either individually or you can download the entire batch. You can pass in a list of language locales, such as `ko_KR`, `ja_JP`, `en_US` etc. and the library will download those and convert them in to appropriate format.

**NB** At this point, the library expects that you have parsed the JSON file into the `Helper` object under `require('node-vlive-downloader')()`.

Example of downloading a single subtitle.

```javascript
(async function() {
  // ...
  // load from browser into memory/disk
  let metadata = JSON.parse(fs.readFileSync('tmp/vod_play_videoInfo.json'))
  let vodData = await helper.parseJson(metadata)
  let subtiles = await helper.downloadSubtitles('en', vodData.video_captions.list)
  console.log(subtiles)
})()
```

### `Helper.downloadSubtitles` Returns

Variable Name | typeof | What is it
--- | --- | ---
**returns** | `array` | Array of `SubtitleMeta` Objects. (See Schemas Sections)

Example of downloading **all** available.

```javascript
(async function() {
  // ...
  // load from browser into memory/disk
  let metadata = JSON.parse(fs.readFileSync('tmp/vod_play_videoInfo.json'))
  let vodData = await helper.parseJson(metadata)
  let subtiles = await helper.downloadAllSubtitles(vodData.video_captions.list)
  console.log(subtiles)
})()
```

### `Helper.downloadAllSubtitles` Returns

Variable Name | typeof | What is it
--- | --- | ---
**returns** | `array` | Array of `SubtitleMeta` Objects. (See Schemas Sections)

## Downloading Video Encodes

The library assumes that you will only want **one** video file. You can pick out the best quality one manually if you know the resolutions off hand. Or you can list the formats and then pick from there.

Example of listing all the video formats available.

```javascript
(async function() {
  // ...
  // load from browser into memory/disk
  let metadata = JSON.parse(fs.readFileSync('tmp/vod_play_videoInfo.json'))
  let vodData = await helper.parseJson(metadata)
  let videoFormats = await helper.getVideoFormatEncodes(vodData.video_list)
  console.log(videoFormats)
})()
```

### `Helper.getVideoFormatEncodes` Returns

Variable Name | typeof | What is it
--- | --- | ---
**returns** | `array` | Array of `VideoMeta` Objects. (See Schemas Sections)

Example Of picking the video format you want.

```javascript
(async function() {
  // ...
  // load from browser into memory/disk
  let metadata = JSON.parse(fs.readFileSync('tmp/vod_play_videoInfo.json'))
  let vodData = await helper.parseJson(metadata)
  let videoFormat = await helper.getVideoEncode('1080')
  console.log(videoFormat)
})()
```
### `Helper.getVideoEncode` Returns

Variable Name | typeof | What is it
--- | --- | ---
**returns** | `VideoMeta` | `VideoObjectSchema` object (See Schemas Sections)

Example of actually downloading the file you want.

```javascript
(async function() {
  // ...
  // load from browser into memory/disk
  let metadata = JSON.parse(fs.readFileSync('tmp/vod_play_videoInfo.json'))
  let vodData = await helper.parseJson(metadata)
  let subtiles = await helper.getVideoEncode('1080')
  let dl = await helper.downloadVideoFile(subtiles, function(progress) {
    console.log(progress)
  })
  console.log(dl)
})()
```

### `Helper.downloadVideoFile` Returns

Variable Name | typeof | What is it
--- | --- | ---
**returns** | `LocalVideoMeta` | `LocalVideoObjectSchema` object (See Schemas Sections)

## Merging Subtitles And Video File

We are basically done here. You can manually load up the video file which was stored under `tmp/video` and the subtitle you want, stored under `tmp/srt`. However, it would be far more convenient to merge them automagically into a container that supports both.

### Function Expectations

The function expects certain objects to be passed into it to work properly.

Variable Name |Schema Name | What Returns It
---|--- | --- |
downloadedFile (arg=0)|`LocalVideoObjectSchema` | `Helper.downloadVideoFile`
srt_subtitles (arg=1)|`SubtitleMeta` | `Helper.downloadAllSubtitles` `Helper.downloadSubtitles`
selectedFile (arg=3)|`VideoObjectSchema` | `Helper.getVideoEncode`

```javascript
async MergeIntoMKV(downloadedFile = LocalVideoObjectSchema,
                   srt_subtitles = array(SubtitleMeta),
                   selectedFile = VideoObjectSchema)
```

Example of using the method.

```javascript
(async function() {
  // ...
  // load from browser into memory/disk
  let metadata = JSON.parse(fs.readFileSync('tmp/vod_play_videoInfo.json'))
  let vodData = await helper.parseJson(metadata)
  let subtiles = await helper.downloadAllSubtitles(vodData.video_captions.list)
  let video2dl = await helper.getVideoEncode('1080')
  let dl = await helper.downloadVideoFile(video2dl, function(progress) {
    console.log(progress)
  })
  await helper.MergeIntoMKV(dl, subtiles, video2dl)
})()
```

# Schemas

## SubtitleMeta

```javascript
{
  path,
  lang,
  locale,
  filename,
  format,
  country,
  label,
  type,
  fan
}
```

## VideoObjectSchema

```javascript
{
  id,
  duration,
  fileSize,
  videoType,
  encodingData = {
    encodeId
    name
    profile
    width
    height
    videoBitrate
    audioBitrate
  },
  source
}
```

## LocalVideoObjectSchema

```javascript
{
  path
}
```

# License/Author Info

Project developed and maintained by VishalRamki. The project is licensed under the MIT license.
