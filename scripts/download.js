import fs from "fs"
import path from "path"

// create downloads directory
fs.mkdirSync("downloads", { recursive: true })

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

// regular expression to find time line from srt content
const timeRegex = /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/

// method to generate vtt subtitle content
const toVTTSubtitles = (input = "") => {
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
      for (let t = i + 1; t < lines.length && !timeRegex.test(lines[t + 2]); t += 1) {
        // push each text line
        texts.push(lines[t].trim())
      }
      // push segment with time
      output.push({
        // convert time to vtt format
        time: line.replaceAll(",", "."),
        // ignore empty lines while joining
        text: texts.filter(text => text !== "").join("\n")
      })
    }
  }
  // return mapped vtt content
  return "WEBVTT\n\n" + output.map(item => (
    `${item.time}\n${item.text}`
  )).join("\n\n");
}

// video extensions
const videoExtensions = [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm"]

// get sources from source path
const sources = fs.readdirSync(sourcePath, { recursive: false }).filter(file => {
  // get file extension
  const extension = path.extname(file).toLowerCase()
  // check with any video extension
  return videoExtensions.includes(extension)
})

// load targets array
const targets = JSON.parse(fs.readFileSync("targets.json"))

// for each source
for (let i = 0; i < sources.length; i++) {
  // get current source
  const source = sources[i]
  // get output path
  const outputPath = `downloads/${source}.json`
  // check output existence
  if (fs.existsSync(outputPath)) {
    // log existence
    console.log("[JSON] [SKIP]", source)
    // continue if exists
    continue
  }
  // log download
  console.log("[JSON] [DONE]", source)
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
const jsonFiles = fs.readdirSync("downloads")

// get subtitle files
const subtitleFiles = fs.readdirSync(sourcePath, { recursive: false }).filter(file => {
  // get file extension
  const extension = path.extname(file).toLowerCase()
  // check with subtitle extension
  return extension === ".srt"
})

// output array
const output = []

// for each json file
for (let i = 0; i < jsonFiles.length; i++) {
  // get source path
  const source = jsonFiles[i].replace(".json", "")
  // get current movie data
  const data = JSON.parse(fs.readFileSync(`downloads/${source}.json`))
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
    // log success
    console.log("[IMAGE] [DONE]", source)
  } else {
    // log existence
    console.log("[IMAGE] [SKIP]", source)
  }
  // get file name
  const name = source.substring(0, source.lastIndexOf("."))
  // filter subtitles
  const subtitles = subtitleFiles.filter(item => item.startsWith(name))
  // languages array
  const languages = []
  // for each subtitle file
  for (let s = 0; s < subtitles.length; s++) {
    // get current file
    const file = subtitles[s]
    // get subtitle language
    const lang = file.replace(name, "").split(".")[1]
    // push to languages
    languages.push(lang)
    // get subtitle path
    const subtitlePath = `../library/subtitles/${source}.${lang}.vtt`
    // check if subtitle not available
    if (!fs.existsSync(subtitlePath)) {
      // read srt content
      const text = fs.readFileSync(`${sourcePath}/${file}`, { encoding: "utf-8" })
      // convert and write into library
      fs.writeFileSync(subtitlePath, toVTTSubtitles(text))
      // log success
      console.log("[TEXT] [DONE]", source)
    } else {
      // log existence
      console.log("[TEXT] [SKIP]", source)
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
    subtitles: languages
  })
}

// update output file
fs.writeFileSync("../library/data.json", JSON.stringify(output, null, 2))
