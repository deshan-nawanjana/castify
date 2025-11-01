import fs from "fs"
import jszip from "jszip"

// get source path
const sourcePath = process.argv[2]
// api endpoints
const searchEndpoint = "https://yts.mx/api/v2/list_movies.json?limit=50&query_term="
const detailsEndpoint = "https://yts.mx/api/v2/movie_details.json?with_cast=true&movie_id="

// method to fetch data
const fetchData = (path, type = "json") => {
  return new Promise(resolve => {
    fetch(path).then(resp => resolve(resp[type]())).catch(() => resolve(null))
  })
}

// method to create movie name
const toMovieTitle = (input = "") => {
  // split into parts
  const parts = input.split(".")
  // get year index
  const yearIndex = parts.findLastIndex(part => (
    // check length and year validity
    part.length === 4 && parseInt(part) > 1750
  ))
  // return if no year
  if (yearIndex == - 1) { return null }
  // create movie name
  const name = parts.slice(0, yearIndex).join(" ")
    .toLowerCase()
    .replaceAll("  ", "")
    .replaceAll("unrated", "")
    .replaceAll("bluray", "")
    .replaceAll("extended", "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
  // get year value
  const year = parts[yearIndex]
  // return movie title
  return `${name} ${year}`
}

// method to create result title parts
const toResultTitleParts = (input = "") => (
  input.toLowerCase()
    .replaceAll("  ", "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/[^a-zA-Z0-9]/)
)

// method to find movie by search results
const findMovieFromResults = (items = [], title = "") => {
  // return if no items
  if (!items || !items.length) { return null }
  // return if only movie
  if (items.length === 1) { return items[0] }
  // split title into parts
  const parts = title.split(" ")
  // get year value
  const year = parseInt(parts.pop())
  // get results by year
  const results = items.filter(item => item.year === year)
  // return if no results
  if (!results.length) { return null }
  // map into scores
  const scores = results.map(item => {
    // create result title parts
    const titleParts = toResultTitleParts(item.title)
    // map parts into part scores
    const list = titleParts.map(part => parts.includes(part) ? 1 : -1)
    // return title score for item
    return list.reduce((total, value) => total + value, 0)
  })
  // get max score index
  const index = scores.findIndex(item => item === Math.max(...scores))
  // return max result
  return results[index]
}

// method to extract movie data
const extractMovieData = async (id, path) => {
  // return if no id
  if (id === null) { return }
  // create yts details url
  const detailsUrl = `${detailsEndpoint}${id}`
  // fetch movie details
  const movieData = await fetchData(detailsUrl)
  // return if no movie data
  if (!movieData) { return }
  // store on output path
  fs.writeFileSync(path, JSON.stringify(movieData, null, 2))
}

// method to generate vtt subtitle content
const toVTTSubtitles = text => (
  "WEBVTT\n\n" + text
    .replace(/\r+/g, "")
    .replace(/^\uFEFF/, "")
    .replace(/(\d+:\d+:\d+),(\d+)/g, "$1.$2")
)

// get sources from source path
const sources = fs.readdirSync(sourcePath, { recursive: false })

// load targets array
const targets = JSON.parse(fs.readFileSync("targets.json"))

// for each source
for (let i = 0; i < sources.length; i++) {
  // get current source
  const source = sources[i]
  // get output path
  const outputPath = `outputs/json/${source}.json`
  // continue if output exists
  if (fs.existsSync(outputPath)) { continue }
  // find for a target id
  const target = targets.find(item => item.name === source)
  // check target
  if (target) {
    // extract movie from given id
    await extractMovieData(target.id, outputPath)
  } else {
    // create movie title by file name
    const title = toMovieTitle(source)
    // create yts search url
    const searchUrl = `${searchEndpoint}${title}`
    // fetch search data
    const searchData = await fetchData(searchUrl)
    // continue if no data
    if (!searchData) { continue }
    // find movie result
    const match = findMovieFromResults(searchData.data.movies, title)
    // extract movie data if available
    if (match) {
      await extractMovieData(match.id, outputPath)
    } else {
      // append to targets
      targets.push({
        id: null,
        name: source
      })
    }
  }
}

// update targets
fs.writeFileSync("targets.json", JSON.stringify(targets, null, 2))

// get json files
const jsonFiles = fs.readdirSync("outputs/json")
// get subtitle files
const subtitleFiles = fs.readdirSync("outputs/srt")

// output array
const output = []

// for each json file
for (let i = 0; i < jsonFiles.length; i++) {
  // get source path
  const source = jsonFiles[i].replace(".json", "")
  // get current movie data
  const data = JSON.parse(fs.readFileSync(`outputs/json/${source}.json`))
  // get movie object
  const movie = data.data.movie
  // get image path
  const imagePath = `../library/covers/${source}.jpg`
  // check if image not available
  if (!fs.existsSync(imagePath)) {
    // fetch image data
    const imageData = await fetchData(movie.large_cover_image, "bytes")
    // store image if data available
    if (imageData) { fs.writeFileSync(imagePath, imageData) }
  }
  // filter subtitles
  const subtitles = subtitleFiles.filter(item => item.startsWith(source))
  // for each subtitle file
  for (let s = 0; s < subtitles.length; s++) {
    // get current file
    const file = subtitles[s]
    // get subtitle path
    const subtitlePath = `../library/subtitles/${file.replace(".srt", ".vtt")}`
    // check if subtitle not available
    if (!fs.existsSync(subtitlePath)) {
      // read srt content
      const text = fs.readFileSync(`outputs/srt/${file}`, { encoding: "utf-8" })
      // convert and write into library
      fs.writeFileSync(subtitlePath, toVTTSubtitles(text))
    }
  }
  // push data into output
  output.push({
    source,
    year: movie.year,
    title: movie.title_english,
    runtime: movie.runtime,
    rating: movie.rating,
    description: movie.description_intro,
    categories: movie.genres,
    cast: movie.cast?.map(item => item.name) ?? [],
    subtitles: subtitles.map(item => item.replace(source).split(".")[1])
  })
}

// update output file
fs.writeFileSync("../library/data.json", JSON.stringify(output, null, 2))
