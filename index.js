import { Castify } from "./modules/Castify.js"

window.Castify = Castify

new Vue({
  // root element
  el: "#app",
  // app data
  data: {
    // app ready status
    ready: false,
    // api unavailability
    error: false,
    // movies array
    movies: [],
    // selected movie
    selected: null,
    // current tab
    tab: "library",
    // play controls
    controls: {
      // active status
      active: false,
      // player status
      state: "PAUSED",
      // buffering status
      buffering: true,
      // current time
      time: 0,
      // selected subtitle track
      track: null
    }
  },
  // app methods
  methods: {
    // creates public media file url
    toURL(id, extension) {
      // get base url
      const baseURL = location.origin + location.pathname
      // create file path with base url
      return baseURL + "assets/media/" + id + "." + extension
    },
    // creates css background image url
    toCSS(item, type) {
      // return if no item
      if (!item) { return null }
      // return background image rule
      return { backgroundImage: `url(${this.toURL(item.id + "." + type, "jpg")})` }
    },
    // method to create time label
    toTime(input) {
      // calculate time values 
      const h = Math.floor(input / 3600)
      const m = Math.floor((input % 3600) / 60)
      const s = Math.floor(input % 60)
      // cover to strings
      const hh = String(h).padStart(2, "0")
      const mm = String(m).padStart(2, "0")
      const ss = String(s).padStart(2, "0")
      // return time label
      return `${hh}:${mm}:${ss}`
    },
    // method to get seek value
    toSeek() {
      return { width: `${100 * this.controls.time / this.selected.duration}%` }
    },
    // loads media item
    async load(item) {
      const status = Castify.session || await Castify.startSession()
      // return if no session
      if (!status) { return }
      // reset controls
      this.controls.active = false
      this.controls.buffering = true
      this.controls.track = null
      this.controls.time = 0
      // load media into session
      Castify.loadMedia(this.toURL(item.id, "mp4"), {
        // movie title
        title: item.title,
        // movie description
        description: item.description,
        // movie poster
        images: [this.toURL(item.id, "poster.jpg")],
        // map subtitle tracks
        subtitles: item.subtitles.map(track => ({
          ...track, url: this.toURL(item.id + "." + track.language, "vtt")
        }))
      })
      // set as selected movie
      this.selected = item
      // switch to player tab
      this.tab = "player"
    },
    // toggles play state
    async play() {
      // return if no media
      if (!Castify.media) { return }
      // get current media state
      if (Castify.media.playerState === "PAUSED") {
        // resume media
        Castify.play()
      } else {
        // pause media
        Castify.pause()
      }
    },
    // seeks media
    seek(event) {
      // get seek bar width
      const width = event.target.getBoundingClientRect().width
      // get seek position on bar
      const position = event.offsetX
      // calculate time
      const time = this.selected.duration * (position / width)
      // seek media
      Castify.seek(time)
    },
    // selects subtitle track
    async subtitle(language) {
      // request subtitle change
      const state = await Castify.selectSubtitle(language)
      // set subtitle language if success
      if (state) { this.controls.track = language }
    }
  },
  async mounted() {
    // fetch and parse movies library
    this.movies = await fetch("index.json").then(resp => resp.json())
    // initialize cast api
    const status = await Castify.initialize()
    // set error based on success status
    this.error = !status
    // set as ready
    setTimeout(() => {
      // get media items
      const items = Castify.session?.media ?? []
      // find current media
      const media = items.find(item => item.playerState !== "IDLE")
      // check if media available
      if (media && media.media) {
        // find movie item from movies
        const item = this.movies.find(movie => media.media.contentId.includes(movie.id))
        // check if item available
        if (item) {
          // set as currently playing movie
          this.selected = item
          // switch to player tab
          this.tab = "player"
        }
      }
      // set as ready
      this.ready = true
    }, 500)
    // player controls loop
    setInterval(() => {
      // get media items
      const items = Castify.session?.media ?? []
      // find current media
      const media = items.find(item => item.playerState !== "IDLE")
      // get player state
      const state = media?.playerState
      // check for current media
      if (media && state !== "IDLE") {
        // set as controls available
        this.controls.active = true
        // check if buffering
        if (state === "BUFFERING") {
          // set as buffering
          this.controls.buffering = true
        } else {
          // store player state
          this.controls.state = state
          // release buffering
          this.controls.buffering = false
        }
        // store current time
        this.controls.time = parseInt(media.getEstimatedTime()) || 0
      } else {
        // set as no controls
        this.controls.active = false
      }
    }, 100)
  }
})
