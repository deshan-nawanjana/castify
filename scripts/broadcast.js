import express from "express"
import { internalIpV4 } from "internal-ip"

// server port
const PORT = 8000

// create express app
const app = express()

// serve static library home
app.use(express.static("../"))

// serve static movies directory
app.use("/library/movies", express.static(process.argv[2]))

// get internal ip address
internalIpV4().then(ip => {
  // start server
  app.listen(PORT, () => {
    console.log(`Server Started: http://${ip}:${PORT}`)
  })
})
