export const Castify = {
  /** Current session */
  session: null,
  /** Current status */
  status: null,
  /** Current media */
  media: null,
  /**
   * Initializes Google Cast API
   * @returns {Promise<boolean>} Success state
   */
  initialize() {
    return new Promise(resolve => {
      // attach availability callback method
      window.__onGCastApiAvailable = isAvailable => {
        // return if not available
        if (!isAvailable) { return resolve(false) }
        // get receiver app id
        const id = chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID
        // create session request
        const request = new chrome.cast.SessionRequest(id)
        // create api config with callback listeners
        const config = new chrome.cast.ApiConfig(request, session => {
          // set as current session
          this.session = session
          // get media items
          const media = session.media ?? []
          // set current media
          this.media = media.find(item => item.playerState !== "IDLE")
        }, status => {
          // set as current session
          this.status = status
        })
        // initialize casting
        chrome.cast.initialize(config, () => {
          // success callback
          resolve(true)
        })
      }
      // create script element
      const script = document.createElement("script")
      // set google cast api module url
      script.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js"
      // append on head element
      document.head.appendChild(script)
    })
  },
  /**
   * Establishes a casting session
   * @returns {Promise<boolean>} Success state
   */
  startSession() {
    return new Promise(resolve => {
      // check if any ongoing session
      if (this.session) {
        // ongoing session found
        resolve(true)
      } else {
        // request new session
        chrome.cast.requestSession(session => {
          // set as current session
          this.session = session
          // session created
          resolve(true)
        }, () => {
          // session request failed
          resolve(false)
        })
      }
    })
  },
  /**
   * Terminates ongoing session
   * @returns {Promise<boolean>} Success state
   */
  stopSession() {
    return new Promise(resolve => {
      // return if no session
      if (!this.session) { return resolve(false) }
      // stop ongoing session
      this.session.stop(() => {
        // clear current session
        this.session = null
        // clear current media
        this.media = null
        // success callback
        resolve(true)
      }, () => {
        // request failed
        resolve(false)
      })
    })
  },
  /**
   * Loads media stream to session
   * @param {string} url Public media url
   * @param {{
   *  title?: string,
   *  description?: string,
   *  images?: string[],
   *  subtitles?: { name: string, language: string, url: string }[]
   * }} options Media options
   * @returns {Promise<boolean>} Success state
   */
  loadMedia(url, options) {
    return new Promise(resolve => {
      // return if no session
      if (!this.session) { return resolve(false) }
      // return if session is disconnected
      if (this.session.status !== "connected") { return resolve(false) }
      // create media info with url
      const media = new chrome.cast.media.MediaInfo(url)
      // set media type as buffered stream
      media.streamType = chrome.cast.media.StreamType.BUFFERED
      // check for options
      if (options) {
        // create generic metadata
        const metadata = new chrome.cast.media.GenericMediaMetadata()
        // set media title
        metadata.title = options.title ?? ""
        // set media subtitle
        metadata.subtitle = options.description ?? ""
        // check for media images
        if (options.images) {
          // map into cast images
          metadata.images = options.images.map(url => (
            new chrome.cast.Image(url)
          ))
        }
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
            track.name = item.name
            track.language = item.language
            track.customData = null
            // push to tracks on media
            media.tracks.push(track)
          }
        }
      }
      // create lod request for media
      const request = new chrome.cast.media.LoadRequest(media)
      // load media into receiver
      this.session.loadMedia(request, media => {
        // set as current media
        this.media = media
        // success callback
        resolve(true)
      }, () => {
        // request failed
        resolve(false)
      })
    })
  },
  /**
   * Displays subtitle track by language
   * @param {string | null} language language code
   * @returns {Promise<boolean>} Success state
   */
  selectSubtitle(language) {
    return new Promise(resolve => {
      // return if no media
      if (!this.media) { return resolve(false) }
      // find track by language code
      const track = this.media.media.tracks.find(item => item.language === language)
      // return if no such track
      if (language && !track) { return resolve(false) }
      // get track ids
      const ids = language ? [track.trackId] : []
      // create tracks request
      const request = new chrome.cast.media.EditTracksInfoRequest(ids)
      // send request to media receiver
      this.media.editTracksInfo(request, () => resolve(true), () => resolve(false))
    })
  },
  /**
   * Plays current media
   * @returns {Promise<boolean>} Success state
   */
  play() {
    return new Promise(resolve => {
      // return if no media
      if (!this.media) { return resolve(false) }
      // create play request
      const request = new chrome.cast.media.PlayRequest()
      // send request to media receiver
      this.media.play(request, () => resolve(true), () => resolve(false))
    })
  },
  /**
   * Pauses current media
   * @returns {Promise<boolean>} Success state
   */
  pause() {
    return new Promise(resolve => {
      // return if no media
      if (!this.media) { return resolve(false) }
      // create pause request
      const request = new chrome.cast.media.PauseRequest()
      // send request to media receiver
      this.media.pause(request, () => resolve(true), () => resolve(false))
    })
  },
  /**
   * Seeks current media
   * @param {number} time required time
   * @returns {Promise<boolean>} Success state
   */
  seek(time) {
    return new Promise(resolve => {
      // return if no media
      if (!this.media) { return resolve(false) }
      // create seek request
      const request = new chrome.cast.media.SeekRequest()
      // set request time
      request.currentTime = parseFloat(time) || 0
      // update receiver volume
      this.media.seek(request, () => resolve(true), () => resolve(false))
    })
  }
}
