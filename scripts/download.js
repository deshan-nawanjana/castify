import fs from "fs"
import jsdom from "jsdom"
import jszip from "jszip"

// base urls
const movieSearchBase = "https://yts.mx/browse-movies/[TEXT]/all/all/0/latest/0/all"
const subtitleBase = "https://yifysubtitles.ch"

// method to download movie data
const extractMovieData = async input => {
  // get input source
  const source = input.split("#")[0]
  // get original source
  const originalSource = source.replace(".mp4", "")
  // return if source available
  if (fs.existsSync("outputs/" + originalSource + ".json")) { return }
  // extract movie name and year
  const movieName = source.split(".1080p")[0]
    .replaceAll("EXTENDED", " ")
    .replaceAll("REPACK", " ")
    .replaceAll("UNRATED", " ")
    .replaceAll("Unrated", " ")
    .replaceAll("WEBRip", " ")
    .replaceAll("BluRay", " ")
    .replaceAll(".", " ")
    .replaceAll("  ", " ")
  // get movie override url
  const movieOverrideLink = input.split("#")[1] || false
  // return if skip
  if (movieOverrideLink === "SKIP") { return }
  // fetch and parse search page
  const searchLink = movieSearchBase.replace("[TEXT]", movieName)
  const searchHtml = await fetch(searchLink).then(resp => resp.text())
  const searchPage = new jsdom.JSDOM(searchHtml).window.document
  const searchSelector = ".browse-movie-wrap a.browse-movie-link[href]"
  // get search results
  const results = Array.from(searchPage.querySelectorAll(searchSelector)).map(item => (
    item.getAttribute("href")
  ))
  // initial output object
  const output = {
    year: null,
    title: null,
    runtime: null,
    rating: null,
    source: null,
    description: null,
    categories: [],
    tags: [],
    cast: [],
    subtitles: ["en"]
  }

  // get movie page url
  const endpoint = movieOverrideLink ? movieOverrideLink : results[0]

  // return if no results
  if (!endpoint) { return [false, false] }

  // fetch and parse movie details page
  const movieHtml = await fetch(endpoint).then(resp => resp.text())
  const moviePage = new jsdom.JSDOM(movieHtml).window.document

  // set source
  output.source = originalSource

  // selector methods
  const qs = selector => moviePage.querySelector(selector)
  const qa = selector => Array.from(moviePage.querySelectorAll(selector))

  // extract movie details
  output.title = qs("h1[itemprop=name]").innerHTML || null
  output.year = qa("#movie-info h2")[0].innerHTML || null
  output.categories = qa("#movie-info h2")[1].innerHTML.split(" / ")
  output.description = qs("#movie-sub-info p").innerHTML.trim() || null
  output.cast = Array.from(qa(".actors [itemprop=name")).map(e => e.innerHTML)
  output.rating = parseFloat(qs(`[itemprop="ratingValue"]`).innerHTML) || null
  output.tags = Array.from(qa(`[style="font-size:85%; color: #BCB8BC;"] a`)).map(e => e.innerHTML)

  // calculate runtime values
  const runtime = qs(`[title=Runtime]`).nextSibling.textContent?.trim() || null
  const runH = parseInt(runtime.split(" ")[0])
  const runM = parseInt(runtime.split(" ")[2])
  // set runtime
  output.runtime = runH * 60 + runM

  // get large cover image data
  const cover = qs("[class='img-responsive']").getAttribute("src") || null
  const image = await fetch(cover.replace("medium-cover", "large-cover")).then(resp => resp.bytes())

  // get subtitles url
  const subtitleLink = qs("a[title*=Subtitles]")
  const imDbLink = qs("a[title*=IMDb]")
  const subtitle = subtitleLink ? subtitleLink.getAttribute("href")
    : subtitleBase + "/movie-imdb/tt" + imDbLink.getAttribute("href").split("/tt").pop().split("/")[0]

  // fetch and parse subtitles page
  const subtitleHtml = await fetch(subtitle).then(resp => resp.text())
  const subtitlePage = new jsdom.JSDOM(subtitleHtml).window.document

  // get subtitle results
  const subtitles = Array.from(subtitlePage.querySelector("table").querySelectorAll("tbody tr")).map(row => {
    // get text content
    const text = row.textContent
    // return result
    return {
      rating: parseInt(row.querySelector('[class*=rating]').textContent),
      lang: row.querySelector('[class*=lang]').textContent.toLowerCase(),
      url: subtitleBase + row.querySelector('a[href]').getAttribute("href"),
      text,
      flags: {
        exact: text.toLowerCase().includes(source.toLowerCase()),
        yts: text.toLowerCase().includes("yts")
      }
    }
  }).filter(item => item.lang.includes("english")).sort((a, b) => b.rating - a.rating)

  // find suitable subtitles
  const subtitleRated = subtitles[0]
  const subtitleExact = subtitles.find(item => item.flags.exact)
  const subtitleYts = subtitles.find(item => item.flags.yts)

  // fetch and parse subtitle download page
  const subtitleDownload = subtitleExact || subtitleYts || subtitleRated

  // subtitle downloaded status
  let subtitleFound = false

  try {
    if (subtitleDownload) {
      const subtitleDownloadHtml = await fetch(subtitleDownload.url).then(resp => resp.text())
      const subtitleDownloadPage = new jsdom.JSDOM(subtitleDownloadHtml).window.document

      // download and extract zip from subtitle download link
      const subtitleDownloadLink = subtitleDownloadPage.querySelector("a.download-subtitle").getAttribute("href")
      const subtitleDownloadData = await fetch(subtitleBase + subtitleDownloadLink).then(resp => resp.bytes())
      const subtitleDownloadZip = await jszip.loadAsync(subtitleDownloadData)
      const subtitleDownloadFile = Object.values(subtitleDownloadZip.files).find(x => (
        x.name.toLowerCase().endsWith("srt") || x.name.toLowerCase().endsWith("sub")
      ))
      const subtitleDownloadText = await subtitleDownloadFile.async("text")

      // convert subtitle to vtt
      const subtitleDownloadVtt = "WEBVTT\n\n" +
        subtitleDownloadText
          .replace(/\r+/g, "")
          .replace(/^\uFEFF/, "")
          .replace(/(\d+:\d+:\d+),(\d+)/g, "$1.$2")

      // save subtitle files
      fs.writeFileSync("outputs/" + originalSource + ".zip", subtitleDownloadData)
      fs.writeFileSync("outputs/" + originalSource + ".srt", subtitleDownloadText)
      fs.writeFileSync("outputs/" + originalSource + ".vtt", subtitleDownloadVtt)
      // set as downloaded
      subtitleFound = true
    } else {
      // no subtitle url found
      output.subtitles = []
    }
  } catch (err) {
    // error while downloading subtitles
    output.subtitles = []
  }

  // save output files
  fs.writeFileSync("outputs/" + originalSource + ".json", JSON.stringify(output, null, 2))
  fs.writeFileSync("outputs/" + originalSource + ".jpg", image)

  // return success
  return [true, subtitleFound]
}

// create outputs directory
if (!fs.existsSync("outputs")) { fs.mkdirSync("outputs") }

// get movies list
const movies = JSON.parse(fs.readFileSync("sources.json"))

// method to status emoji
const emoji = flag => flag ? "✔️ " : "❌"

// for each movie
for (let i = 0; i < movies.length; i++) {
  // current movie
  const movie = movies[i]
  const source = movie.split("#")[0]
  // get current index
  const index = (i + 1).toString().padStart(3, "0")
  try {
    // extract movie and get status
    const status = await extractMovieData(movies[i])
    // print status
    if (status) { console.log(index, emoji(status[0]), emoji(status[1]), "", source) }
  } catch (err) {
    // print error
    console.log(index, emoji(false), emoji(false), "", source)
  }
}

// output array
const output = []

// for each movie
for (let i = 0; i < movies.length; i++) {
  // current movie
  const movie = movies[i]
  const source = movie.split("#")[0].replace(".mp4", "")
  // get details file path
  const detailsFile = "outputs/" + source + ".json"
  // if details exists
  if (fs.existsSync(detailsFile)) {
    // push to output
    output.push(JSON.parse(fs.readFileSync(detailsFile)))
    // get cover paths
    const coverSource = "outputs/" + source + ".jpg"
    const coverTarget = "../library/covers/" + source + ".jpg"
    // copy cover image if not exists
    if (!fs.existsSync(coverTarget)) { fs.copyFileSync(coverSource, coverTarget) }
    // get subtitle paths
    const subtitleSource = "outputs/" + source + ".vtt"
    const subtitleTarget = "../library/subtitles/" + source + ".en.vtt"
    // copy subtitle file if available
    if (fs.existsSync(subtitleSource) && !fs.existsSync(subtitleTarget)) {
      fs.copyFileSync(subtitleSource, subtitleTarget)
    }
  }
}

// update library data
fs.writeFileSync("../library/data.json", JSON.stringify(output, null, 2))
