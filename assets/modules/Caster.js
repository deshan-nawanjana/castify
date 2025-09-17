// method to request session
const requestSession = () => (
  new Promise(resolve => {
    try {
      // request session
      chrome.cast.requestSession(resolve, () => resolve(null))
    } catch (err) {
      resolve(null)
    }
  })
)

export class Caster {
  // constructor
  constructor() {
    /** Current status */
    this.status = "unavailable"
    /** Current session */
    this.session = null
    /** Current media details */
    this.media = null
    /** queue values */
    this.queue = { volume: null }
  }
  /** Initialize interface */
  initialize(callback) {
    // get receiver app id
    const id = chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID
    // create session request
    const request = new chrome.cast.SessionRequest(id)
    // create api config
    const config = new chrome.cast.ApiConfig(request, session => {
      // store as current session
      this.session = session || null
      // callback current session
      if (callback) { callback(this.session) }
    }, status => {
      // store as current status
      this.status = status || "unavailable"
    })
    // initialize api
    chrome.cast.initialize(config)
  }
  /** Load media into receiver */
  load(options) {
    // return promise
    return new Promise(async resolve => {
      // get current session
      const session = this.session && this.session.status === "connected"
        ? this.session : await requestSession()
      // set as current session
      this.session = session
      // return if no session
      if (!session) { return resolve(false) }
      // create media info
      const media = new chrome.cast.media.MediaInfo(options.url)
      // set buffered stream type
      media.streamType = chrome.cast.media.StreamType.BUFFERED
      // create generic metadata
      const metadata = new chrome.cast.media.GenericMediaMetadata()
      // attach available metadata
      if (options.title) { metadata.title = options.title }
      if (options.description) { metadata.subtitle = options.description }
      if (options.cover) { metadata.images = [new chrome.cast.Image(options.cover)] }
      // set metadata into media
      media.metadata = metadata
      // check for subtitles
      if (options.subtitles) {
        // initiate tracks
        media.tracks = []
        // for each subtitle track
        for (let i = 0; i < options.subtitles.length; i++) {
          // current track item
          const item = options.subtitles[i]
          // create track
          const track = new chrome.cast.media.Track(i + 1, chrome.cast.media.TrackType.TEXT)
          // set track options
          track.trackContentId = item.url
          track.trackContentType = 'text/vtt'
          track.subtype = chrome.cast.media.TextTrackType.SUBTITLES
          track.name = item.lang
          track.language = item.lang
          track.customData = null
          // push to tracks on media
          media.tracks.push(track)
        }
      }
      // create lod request for media
      const request = new chrome.cast.media.LoadRequest(media)
      // load media into receiver
      session.loadMedia(request, media => resolve(media), () => resolve(false))
    })
  }
  /** Load subtitle into session */
  subtitle(lang) {
    // return promise
    return new Promise(async resolve => {
      // return if no session
      if (!this.session) { return resolve(false) }
      // get none idle media
      const media = this.session.media.find(item => item.playerState !== "IDLE")
      // return if no media
      if (!media) { return resolve(false) }
      // find track by lang code
      const track = media.media.tracks.find(item => item.language === lang)
      // get track ids
      const ids = track ? [track.trackId] : []
      // create tracks request
      const request = new chrome.cast.media.EditTracksInfoRequest(ids)
      // send request to media receiver
      media.editTracksInfo(request, () => resolve(true), () => resolve(false))
    })
  }
  /** Seek media by time */
  seek(time) {
    // return promise
    return new Promise(resolve => {
      // return if no session
      if (!this.session) { return resolve(false) }
      // get none idle media
      const media = this.session.media.find(item => item.playerState !== "IDLE")
      // return if no media
      if (!media) { return resolve(false) }
      // create seek request
      const request = new chrome.cast.media.SeekRequest()
      // set request time
      request.currentTime = parseFloat(time) || 0
      // update receiver volume
      media.seek(request, () => resolve(true), () => resolve(false))
    })
  }
  /** Change receiver volume */
  volume(level) {
    // return promise
    return new Promise(resolve => {
      // return if no session
      if (!this.session) { return resolve(false) }
      // get value with boundaries
      const value = Math.max(0, Math.min(1, parseFloat(level) || 0))
      // update receiver volume
      this.session.setReceiverVolumeLevel(value, () => resolve(true), () => resolve(false))
    })
  }
  /** Stop current session */
  stop() {
    // return if no session
    if (!this.session) { return }
    // stop current session
    this.session.stop()
    // reset session
    this.session = null
  }
}
