const express = require("express")
const app = express()
const port = 24555
const { Messages } = require("./models")
const rateLimit = require("express-rate-limit")

const limiter = rateLimit({
  windowMs: 1 * 5 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false
})

app.use(function (req, res, next) {
  if (req.method === "POST" && !req.headers["X-Validation"]) {
    limiter(req, res, next)
  } else {
    next()
  }
})

app.use(express.json())
app.use(
  express.urlencoded({
    extended: true
  })
)

app.get("/api/messages", async (req, res) => {
  const messages = await Messages.findAll()
  res.json(messages)
})

app.post("/api/message", async (req, res, next) => {
  try {
    if (req.body.messageContents.length < 1 || req.body.userName.length < 1) {
      res.status(500)
      res.json({
        message: "Something went wrong"
      })
      return
    }
    const message = await Messages.create({
      messageContents: req.body.messageContents,
      userName: req.body.userName
    })
    res.json(message)
  } catch {
    res.status(500)
    res.json({
      message: "Something went wrong"
    })
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
