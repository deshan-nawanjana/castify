import { Caster } from "./assets/modules/Caster.js"

// create caster module
const caster = new Caster()

// chrome cast available callback
window.__onGCastApiAvailable = isAvailable => {
  // return if no available
  if (!isAvailable) { return }
  // initialize caster
  caster.initialize()
}

// create vue app
window.app = new Vue({
  // root element
  el: "#app",
  // app data
  data: {
    // ready state
    ready: false,
    // caster module
    caster: caster,
    // all movies
    library: [],
    // filter options
    options: {},
    // source urls
    sources: {
      // local ip address
      local: localStorage.getItem("server") || "",
      // public endpoint for subtitles
      public: "https://deshan-nawanjana.github.io/castify"
    },
    // search filters
    filters: {
      // search keyword
      keyword: "",
      // selected category
      category: "All Movies",
      // sort mode
      sort: "Year"
    },
    // current values
    current: {
      // current time
      time: 0,
      // device volume
      volume: 0,
      // subtitle index
      subtitle: null,
      // pending movie
      pending: null
    }
  },
  computed: {
    results() {
      // get all movies
      let results = [...this.library]
      // get filters
      const filters = this.filters
      // get search keyword
      const keyword = filters.keyword.toLowerCase().trim()
      // filter by keyword
      results = keyword !== ""
        ? results.filter(item => item.query.includes(keyword))
        : results
      // filter by category
      results = filters.category !== "All Movies"
        ? results.filter(item => item.categories.includes(filters.category))
        : results
      // sort results
      results = filters.sort === "Year"
        ? results.sort((a, b) => b.year - a.year)
        : results
      // return results
      return results
    },
    currentSession() {
      // return if no session
      if (!this.caster.session) { return }
      // return if session not connected
      if (this.caster.session.status !== "connected") { return }
      // return current session
      return this.caster.session
    },
    currentMedia() {
      // return if no session
      if (!this.currentSession) { return }
      // return if no media
      if (!this.currentSession.media.length) { return }
      // return current media
      return this.currentSession.media.find(item => item.playerState !== "IDLE")
    },
    currentMovie() {
      // return pending movie if no media
      if (!this.currentMedia) { return this.current.pending }
      // return if no media details
      if (!this.currentMedia.media) { return }
      // get media url
      const url = this.currentMedia.media.contentId
      // get media source
      const source = url.split("/").pop()
      // return library item by source id
      return this.library.find(item => item.source === source)
    },
    currentRuntime() {
      // return if no media
      if (!this.currentMedia) { return }
      // calculate time
      const time = this.current.time / parseInt(this.currentMedia.media.duration)
      // return runtime ratio
      return isNaN(time) ? 0 : time
    },
    currentDuration() {
      // return if no media
      if (!this.currentMedia) { return }
      // return media duration
      return this.currentMedia.media.duration
    },
    currentSubtitle() {
      // return if no movie
      if (!this.currentMedia) { return }
      // get active tracks
      const tracks = this.currentMedia.activeTrackIds
      // return subtitle track index
      return tracks.length ? tracks[0] - 1 : null
    }
  },
  methods: {
    // method to create cover image url
    image(source) {
      // return background image rule
      return { backgroundImage: `url(library/covers/${source}.jpg)` }
    },
    // method to get movie status
    status(source) {
      // return idle if no current movie
      if (!this.currentMovie) { return "idle" }
      // check for current movie
      return this.currentMovie.pending
        ? this.currentMovie.source === source
          ? "pending" : "idle"
        : this.currentMovie.source === source
          ? this.currentMedia.playerState === 'PLAYING'
            ? "playing" : "paused"
          : "idle"
    },
    // method to create time label
    time(input) {
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
    // method to select movie
    async select(item) {
      // return if no local ip
      if (!this.sources.local) { return this.address() }
      // get item status
      const status = this.status(item.source)
      // return if pending
      if (status === "pending") { return }
      // play if paused
      if (status === "paused") { return this.play() }
      // pause if playing
      if (status === "playing") { return this.play() }
      // check for current media
      if (this.currentMedia) {
        // clear any ongoing subtitles
        await this.caster.subtitle(false)
        // stop ongoing media
        this.currentMedia.stop()
      }
      // get local ip address
      const local = !this.sources.local.startsWith("http")
        ? `http://${this.sources.local}`
        : this.sources.local
      // get public host url
      const host = this.sources.public
      // reset current time
      this.current.time = 0
      // reset subtitle index
      this.current.subtitle = null
      // set as pending movie
      this.current.pending = { ...item, pending: true }
      // load media into receiver
      const media = await this.caster.load({
        url: `${local}/${item.source}`,
        cover: `${host}/library/covers/${item.source}.jpg`,
        title: `${item.title} (${item.year})`,
        description: item.description,
        subtitles: item.subtitles.map(lang => ({
          lang, url: `${host}/library/subtitles/${item.source}.${lang}.vtt`
        }))
      })
      // clear pending if failed
      if (!media) { this.current.pending = null }
    },
    // method to load subtitle
    async subtitle(lang) {
      // return if no current movie
      if (!this.currentMovie) { return }
      // load subtitle into receiver
      await this.caster.subtitle(lang)
    },
    // method to seek
    async seek() {
      // return if no current media
      if (!this.currentMedia) { return }
      // set as seeking
      this.isSeek = true
      // suspend previous seek request
      clearTimeout(this.seekId)
      // set seek trigger timeout
      this.seekId = setTimeout(async () => {
        // request seek change
        await this.caster.seek(this.current.time)
        // stop seeking
        setTimeout(() => this.isSeek = false, 1000)
      }, 100)
    },
    // method to change volume level
    async volume() {
      // return if no current session
      if (!this.currentSession) { return }
      // set as volume changing
      this.isVolume = true
      // suspend previous volume request
      clearTimeout(this.volumeId)
      // set volume trigger timeout
      this.volumeId = setTimeout(async () => {
        // request volume change
        await this.caster.volume(this.current.volume)
        // stop volume
        setTimeout(() => this.isVolume = false, 1000)
      }, 100)
    },
    // method to change local address
    address() {
      // prompt ip address input
      const ip = prompt("Input server address for streaming", this.sources.local)
      // update ip address
      this.sources.local = ip || this.sources.local || ""
      // store address locally
      localStorage.setItem("server", this.sources.local)
    },
    // method to play toggle
    play() {
      // return if no media
      if (!this.currentMedia) { return }
      // switch by media state
      if (this.currentMedia.playerState === 'PLAYING') {
        // pause media
        this.currentMedia.pause()
      } else {
        // play media
        this.currentMedia.play()
      }
    },
    // method to stop session
    stop() {
      // return if no current session
      if (!this.currentSession) { return }
      // clear pending movie
      this.current.pending = null
      // stop current session
      this.caster.stop()
    },
    // method to toggle subtitles
    subtitles() {
      // return if no media
      if (!this.currentMedia) { return }
      // get tracks array
      const tracks = this.currentMovie.subtitles
      // get current index
      const current = this.currentSubtitle
      // get possible subtitle index
      const index = current === null ? 0
        : current === tracks.length - 1 ? null
          : current + 1
      // send subtitle to caster
      this.caster.subtitle(tracks[index])
      // store current subtitle index
      this.current.subtitle = index
    }
  },
  // method on mount
  async mounted() {
    // load library options
    this.options = await fetch("index.json").then(resp => resp.json())
    // load library movies
    const movies = await fetch("library/data.json").then(resp => resp.json())
    // map movies into library items
    this.library = movies.map(item => {
      // get query values
      const title = item.title.toLowerCase()
      const description = item.description.toLowerCase()
      const categories = item.categories.join(" ").toLowerCase()
      const cast = item.cast.join(" ").toLowerCase()
      // return with query option
      return ({
        ...item, query: `${title} ${description} ${categories} ${cast}`,
      })
    })
    // time interval loop
    setInterval(() => {
      // check if not seek changing
      if (this.currentMedia && !this.isSeek) {
        // store current time
        this.current.time = parseInt(this.currentMedia.getEstimatedTime())
      }
      // check if not volume changing
      if (this.currentSession && !this.isVolume) {
        // store current time
        this.current.volume = this.currentSession.receiver.volume.level
      }
    }, 1000)
    // set as ready
    setTimeout(() => this.ready = true, 500)
  }
})
