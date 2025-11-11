// helper to fetch content
const fetchData = (path, type = "json") => (
  fetch(path + "?t=" + Date.now()).then(resp => resp[type]())
)

// regular expression to find time line from vtt content
const timeRegex = /(\d{2}:\d{2}:\d{2}.\d{3}) --> (\d{2}:\d{2}:\d{2}.\d{3})/

// helper convert time string to seconds of vtt time line
function toSeconds(timeStr) {
  const [hours, minutes, seconds] = timeStr.split(':')
  return (
    parseInt(hours, 10) * 3600 +
    parseInt(minutes, 10) * 60 +
    parseFloat(seconds)
  )
}

// helper to parse subtitle content
const toSubtitles = (input = "") => {
  // split into lines
  const lines = input.split("\n")
  // output array
  const output = []
  // for each line
  for (let i = 0; i < lines.length; i++) {
    // current line
    const line = lines[i]
    // check for time line
    if (timeRegex.test(line)) {
      // texts array
      const texts = []
      // until find the next time line
      for (let t = i + 1; t < lines.length && !timeRegex.test(lines[t + 1]); t += 1) {
        // push each text line
        texts.push(lines[t])
      }
      // get time parts
      const times = line.split(" --> ")
      // push segment with time
      output.push({
        // start time in seconds
        from: toSeconds(times[0]),
        // end time in seconds
        to: toSeconds(times[1]),
        // ignore empty lines while joining
        text: texts.filter(text => text !== "").join("<br>")
      })
    }
  }
  // return subtitles
  return output
}

// get movie id
const id = new URLSearchParams(window.location.search).get("id")

// fetch movie library
const library = await fetchData("/library/data.json")

// find movie by slug
const data = library.find(item => {
  // get movie title
  const title = item.title.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, "")
  // create slug
  const slug = title.replace(/  /g, " ").replace(/ /g, "-") + "-" + item.year
  // match with params id
  return slug === id
})

// return to home if no movie
if (!data) { window.location = "/" }

// captions array
const captions = []

// for each caption in movie
for (let i = 0; i < data.subtitles.length; i++) {
  // current caption language
  const lang = data.subtitles[i]
  // subtitle file path
  const path = `/library/subtitles/${data.source}.${lang}.vtt`
  // fetch subtitle content
  const text = await fetchData(path, "text")
  // push to captions
  captions.push({ lang, data: toSubtitles(text) })
}

new Vue({
  // app element
  el: "#app",
  // app data
  data: {
    // movie details
    movie: data,
    // captions array
    captions,
    // selected caption
    caption: null,
    // current caption text
    text: "",
    // playing state
    playing: false,
    // current time
    current: 0,
    // duration
    duration: 0,
    // overlay visible status
    overlay: false,
    // fullscreen mode
    fullscreen: false
  },
  // computed values
  computed: {
    // movie source url
    source() { return `/library/movies/${data.source}` },
    // current video element
    video() { return this.$refs.video }
  },
  // methods
  methods: {
    // method to initialize player
    init(event) {
      // store video duration
      this.duration = event.target.duration
    },
    // method to toggle play and pause
    toggle() {
      // return if no video
      if (!this.video) return
      // toggle video playing state
      this.video.paused ? this.video.play() : this.video.pause()
    },
    // method to seek video
    seek(event) {
      // return if no video
      if (!this.video) return
      // get seek element width
      const width = event.target.clientWidth
      // get seek position
      const position = event.offsetX
      // get seeking time
      const time = this.duration * (position / width)
      // update time on video
      this.video.currentTime = Math.min(Math.max(time, 0), this.duration)
    },
    // method to generate time string
    time(input = 0) {
      // get unit values
      const h = Math.floor(input / 3600)
      const m = Math.floor((input % 3600) / 60)
      const s = Math.floor(input % 60)
      // apply pad starts
      return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
    },
    // method to switch fullscreen mode
    screen() {
      // check fullscreen status
      if (!document.fullscreenElement) {
        // enable full screen
        document.documentElement.requestFullscreen()
        this.fullscreen = true
      } else {
        // disable fullscreen
        document.exitFullscreen()
        this.fullscreen = false
      }
    },
    // method to switch between subtitles
    subtitle() {
      // return if no captions
      if (!this.captions.length) return
      // check for current caption
      if (!this.caption) {
        // set first caption
        this.caption = this.captions[0]
      } else {
        // get current caption index
        const index = this.captions.findIndex(item => (
          item.lang === this.caption.lang
        ))
        // set next available caption
        this.caption = this.captions[index + 1]
      }
      // reset caption text
      this.text = ""
    },
    // method to show controls
    controls() {
      // clear previous timer
      clearTimeout(this.timer)
      // show overlay
      this.overlay = true
      // set timer to fade out overlay
      this.timer = setTimeout(() => {
        // hide overlay
        this.overlay = false
      }, 1500)
    },
    // method to update player
    update() {
      // request next frame
      requestAnimationFrame(this.update)
      // return if no video
      if (!this.video) return
      // store current time
      this.current = this.video.currentTime
      // store playing state
      this.playing = !this.video.paused
      // return if no captions
      if (!this.caption) return
      // find caption line by time
      const line = this.caption.data.find(item => (
        this.current > item.from && this.current < item.to
      ))
      // set as current caption text
      this.text = line ? line.text : ""
    }
  },
  // mounted
  mounted() {
    // set page title
    document.title = `${data.title} (${data.year})`
    // start player update loop
    this.update()
    // window pointer event listener
    window.addEventListener("pointerdown", () => {
      // return if no video
      if (!this.video) return
      // return if not muted
      if (!this.video.muted) return
      // unmute video
      this.video.muted = false
    })
    // window pointer move listener
    window.addEventListener("pointermove", this.controls)
    // window key event listener
    window.addEventListener("keydown", event => {
      // fade in overlay controls
      this.controls()
      // get key code
      const key = event.key.toUpperCase()
      // toggle if space key
      if (key === " ") this.toggle()
      // toggle fullscreen
      if (key === "F") this.screen()
      // toggle captions
      if (key === "C") this.subtitle()
      // return if no video
      if (!this.video) return
      // seek forward
      if (event.key === "ArrowRight") { this.video.currentTime += 10 }
      // seek backward
      if (event.key === "ArrowLeft") { this.video.currentTime -= 10 }
    })
  }
})
