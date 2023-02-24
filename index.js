const express = require("express")
const app = express()
const port = 24555
const { Messages, Users, Sessions } = require("./models")
const rateLimit = require("express-rate-limit")
const argon2 = require("argon2")
const cryptoRandomString = require("crypto-random-string")
const auth = require("./lib/auth")
const resolveEmbeds = require("./lib/resolveEmbeds")
const axios = require("axios")
const config = require(__dirname + "/config/uploadconfig.json")

const limiter = rateLimit({
  windowMs: 5 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false
})

app.get(
  [
    "/api/mediaproxy/:mid/:index/:securityToken",
    "/api/mediaproxy/:mid/:index/:securityToken.:extension"
  ],
  async (req, res, next) => {
    try {
      const message = await Messages.findOne({
        where: {
          id: req.params.mid
        }
      })
      if (!message) {
        return res.status(400).json({
          message: "Failed to embed"
        })
      }
      const embed = message.embeds.find(
        (e) => e.securityToken === req.params.securityToken
      )
      if (!embed) {
        return res.status(400).json({
          message: "Failed to embed"
        })
      }
      await axios
        .get(embed.link, {
          headers: {
            "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)"
          },
          responseType: "arraybuffer"
        })
        .then((response) => {
          res.setHeader("content-type", response.headers["content-type"])
          res.setHeader("cache-control", "public, max-age=604800")
          res.end(response.data, "binary")
        })
        .catch(() => {
          res.status(404).end()
        })
    } catch (e) {
      next(e)
    }
  }
)

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

app.get("/api/messages", auth, async (req, res) => {
  const messages = await Messages.findAll({
    include: [
      {
        model: Users,
        as: "user",
        attributes: ["id", "username", "avatar"]
      }
    ]
  })
  res.json(messages)
})

app.get("/api/user", auth, async (req, res) => {
  res.json(req.user)
})

app.get("/api/user/:userId", auth, async (req, res) => {
  const user = await Users.findOne({
    where: {
      id: req.params.userId
    },
    attributes: [
      "username",
      "avatar",
      "description",
      "banner",
      "directMessages",
      "friendRequests",
      "status",
      "statusMessage"
    ]
  })
  res.json(user)
})

app.post("/api/message", auth, async (req, res) => {
  try {
    if (req.body.messageContents.length < 1) {
      res.status(400)
      res.json({
        message: "Message too short"
      })
      return
    }
    const message = await Messages.create({
      messageContents: req.body.messageContents,
      userName: req.user.id
    })
    res.json(message)
    resolveEmbeds(req, message).catch(() => {})
  } catch {
    res.status(500)
    res.json({
      message: "Something went wrong"
    })
  }
})

app.post("/api/register", async (req, res) => {
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
        length: 128
      })
    })
    const session = await Sessions.create({
      userId: user.id,
      token: cryptoRandomString({ length: 128 })
    })
    res.json({ token: session.token })
  } catch (e) {
    console.log(e)
    res.status(500)
    res.json({
      message: "Something went wrong"
    })
  }
})

app.post("/api/login", async (req, res) => {
  try {
    if (req.body.username.length < 1 || req.body.password.length < 1) {
      res.status(500)
      res.json({
        message: "Form not complete"
      })
      return
    }
    const user = await Users.findOne({
      username: req.body.username
    })
    if (!user) return res.status(401).json({ message: "no" })
    if (!(await argon2.verify(user.password, req.body.password))) {
      return res.status(401).json({ message: "bad" })
    }
    const session = await Sessions.create({
      userId: user.id,
      token: cryptoRandomString({ length: 128 })
    })
    return res.json({
      token: session.token,
      user
    })
  } catch (e) {
    console.log(e)
    res.status(500)
    res.json({
      message: "Something went wrong"
    })
  }
})

app.post("/api/avatar", async (req, res) => {
  axios
    .post(config.uploadLink, req.body, {
      headers: {
        Authorization: config.apiKey
      }
    })
    .then(async (resp) => {
      await Users.update({
        avatar: resp.data.attachment.attachment
      })
    })
    .catch((e) => {
      console.log(e)
    })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
