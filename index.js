const express = require("express")
const app = express()
const port = 24555
const { Messages, Users } = require("./models")
const rateLimit = require("express-rate-limit")
const argon2 = require("argon2")
const cryptoRandomString = require("crypto-random-string")

const limiter = rateLimit({
  windowMs: 5 * 1000,
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

app.post("/api/register", async (req, res, next) => {
  try {
    if (
      req.body.username.length < 1 ||
      req.body.password.length < 1 ||
      req.body.email.length < 1
    ) {
      res.status(500)
      res.json({
        message: "Form not complete"
      })
      return
    }
    const user = await Users.create({
      username: req.body.username,
      password: await argon2.hash(req.body.password),
      email: req.body.email,
      emailToken: await cryptoRandomString({
        length: 512
      })
    })
    res.json(user)
  } catch (e) {
    console.log(e)
    res.status(500)
    res.json({
      message: "Something went wrong"
    })
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
