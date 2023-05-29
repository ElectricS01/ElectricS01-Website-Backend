const express = require("express")
const app = express()
const port = 24555
const { Messages, Users, Sessions, Friends, Feedback } = require("./models")
const rateLimit = require("express-rate-limit")
const argon2 = require("argon2")
const cryptoRandomString = require("crypto-random-string")
const auth = require("./lib/auth")
const resolveEmbeds = require("./lib/resolveEmbeds")
const axios = require("axios")
const config = require(__dirname + "/config/uploadconfig.json")

const limiter = rateLimit({
  windowMs: 8000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests, SLOW DOWN!!!"
  }
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
  if (req.method === "POST") {
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

app.get("/api/users", auth, async (req, res) => {
  const users = await Users.findAll({
    attributes: ["id", "username", "avatar", "status", "statusMessage"]
  })
  res.json(users)
})

app.get("/api/users", auth, async (req, res) => {
  const users = await Users.findAll({
    attributes: ["id", "username", "avatar", "status", "statusMessage"]
  })
  res.json(users)
})

app.get("/api/user", auth, async (req, res) => {
  res.json({
    ...req.user.toJSON(),
    password: undefined,
    emailToken: undefined,
    updatedAt: undefined
  })
})

app.get("/api/user/:userId", auth, async (req, res) => {
  if (parseInt(req.params.userId)) {
    const user = await Users.findOne({
      where: {
        id: req.params.userId
      },
      attributes: [
        "id",
        "username",
        "avatar",
        "description",
        "banner",
        "directMessages",
        "friendRequests",
        "status",
        "statusMessage",
        "createdAt",
        "showCreated",
        "tetris",
        "tonkgame"
      ],
      include: [
        {
          model: Friends,
          as: "friend",
          required: false,
          where: {
            userId: req.user.id,
            friendId: parseInt(req.params.userId)
          }
        }
      ]
    })

    if (!user) {
      res.status(400)
      res.json({
        message: "User requested does not exist"
      })
      return
    }
    if (!user.dataValues.showCreated) {
      user.dataValues.createdAt = null
      user.dataValues.showCreated = null
    }
    res.json(user)
  } else {
    res.status(400)
    res.json({
      message: "User requested does not exist"
    })
  }
})

app.get("/api/admin", auth, async (req, res) => {
  const user = await Users.findOne({
    where: {
      id: req.user.id
    }
  })
  if (!user || !user.admin) {
    res.status(403)
    res.json({
      message: "Forbidden"
    })
    return
  }
  const feedback = await Feedback.findAll({})
  res.json(feedback)
})

app.post("/api/message", auth, async (req, res) => {
  try {
    if (req.body.messageContents.length < 1) {
      res.status(400)
      res.json({
        message: "Message has no content"
      })
      return
    }
    if (req.body.messageContents.length > 10000) {
      res.status(400)
      res.json({
        message: "Message too long"
      })
      return
    }
    const messageText = req.body.messageContents.trim()
    const replyMessage = req.body?.reply
    if (messageText) {
      const message = await Messages.create({
        messageContents: messageText,
        userName: req.user.id,
        reply: replyMessage
      })
      res.json(message)
      resolveEmbeds(req, message).catch(() => {})
    }
  } catch (e) {
    res.status(500)
    res.json({
      message: "Something went wrong" + e
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
    if (
      await Users.findOne({
        where: {
          username: req.body.username
        }
      })
    ) {
      res.status(400)
      res.json({
        message: "Username is taken"
      })
      return
    }
    if (
      await Users.findOne({
        where: {
          username: req.body.username
        }
      })
    ) {
      res.status(400)
      res.json({
        message: "Email is taken"
      })
      return
    }
    if (req.body.username) {
    }
    const user = await Users.create({
      username: req.body.username,
      password: await argon2.hash(req.body.password),
      email: req.body.email,
      emailToken: cryptoRandomString({
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
      where: {
        username: req.body.username
      }
    })
    if (!user) return res.status(401).json({ message: "Form error" })
    if (!(await argon2.verify(user.password, req.body.password))) {
      return res.status(401).json({ message: "Incorrect password" })
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
    return res.json({
      message: "Something went wrong"
    })
  }
})

app.post("/api/reset-email", async (req, res) => {
  try {
    if (req.body.email.length < 1) {
      res.status(500)
      res.json({
        message: "Form not complete"
      })
      return
    }
    const user = await Users.findOne({
      where: {
        email: req.body.email
      }
    })
    if (!user) {
      res.status(401)
      res.json({
        message: "Email does not exist"
      })
      res.status(500)
      return res.json({
        message: "Something went wrong"
      })
    }
    res.status(500)
    return res.json({
      message: "e"
    })
  } catch (e) {
    console.log(e)
    res.status(500)
    return res.json({
      message: "Something went wrong"
    })
  }
})

app.post("/api/user-prop", auth, async (req, res) => {
  const user = await Users.findOne({
    where: {
      id: req.user.id
    }
  })
  const properties = ["directMessages", "friendRequests", "showCreated"]
  if (!user || !properties.includes(req.body.prop)) {
    res.status(400)
    res.json({
      message: "No property selected"
    })
    return
  }
  await user.update({
    [req.body.prop]: req.body.val
  })
  return res.sendStatus(204)
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
      res.sendStatus(204)
    })
    .catch((e) => {
      console.log(e)
    })
})

app.post("/api/friend/:userId", auth, async (req, res) => {
  if (req.user.id === parseInt(req.params.userId)) {
    return res.status(400).json({
      message: "You can't friend yourself"
    })
  }
  const user = await Users.findOne({
    where: {
      id: req.params.userId
    }
  })
  if (!user) {
    return res.status(400).json({
      message: "This user does not exist"
    })
  }
  const friend = await Friends.findOne({
    where: {
      userId: req.user.id,
      friendId: user.id
    }
  })
  if (!friend) {
    await Friends.create({
      userId: req.user.id,
      friendId: user.id
    })
    await Friends.create({
      userId: user.id,
      friendId: req.user.id,
      status: "incoming"
    })
    res.sendStatus(204)
  } else if (!user.friendRequests && !friend.status) {
    return res.status(400).json({
      message: "This user does not accept friend request"
    })
  } else if (friend.status === "accepted" || friend.status === "pending") {
    await Friends.destroy({
      where: {
        userId: req.user.id,
        friendId: user.id
      }
    })
    await Friends.destroy({
      where: {
        userId: user.id,
        friendId: req.user.id
      }
    })
    res.sendStatus(204)
  } else if (friend.status === "incoming") {
    await Friends.update(
      { status: "accepted" },
      {
        where: {
          userId: req.user.id,
          friendId: user.id
        }
      }
    )
    await Friends.update(
      { status: "accepted" },
      {
        where: {
          userId: user.id,
          friendId: req.user.id
        }
      }
    )
    res.sendStatus(204)
  }
})

app.post("/api/feedback", auth, async (req, res) => {
  if (req.body.feedback.length < 1) {
    res.status(400)
    res.json({
      message: "Feedback has no content"
    })
    return
  }
  if (req.body.feedback.length > 500) {
    res.status(400)
    res.json({
      message: "Feedback too long"
    })
    return
  }
  const user = await Users.findOne({
    where: {
      id: req.user.id
    }
  })
  if (!user) {
    return res.status(400).json({
      message: "This user does not exist"
    })
  }
  await Feedback.create({
    feedback: req.body.feedback,
    userID: user.id
  })
  return res.sendStatus(204)
})

app.delete("/api/delete/:messageId", auth, async (req, res) => {
  const where = req.user.admin
    ? { id: req.params.messageId }
    : { id: req.params.messageId, userName: req.user.id }

  await Messages.destroy({ where })
  res.sendStatus(204)
})

app.delete("/api/delete-feedback/:feedbackId", auth, async (req, res) => {
  if (!req.user.admin) {
    res.status(403)
    res.json({
      message: "Forbidden"
    })
    return
  }
  console.log(req.params.feedbackId)
  if (!req.params.feedbackId) {
    res.status(400)
    res.json({
      message: "Feedback does not exist"
    })
    return
  }
  const feedback = await Feedback.findOne({
    where: {
      id: req.params.feedbackId
    }
  })
  if (!feedback) {
    res.status(400)
    res.json({
      message: "Feedback does not exist"
    })
    return
  }
  await feedback.destroy()
})

app.patch("/api/edit/:messageId", auth, async (req, res) => {
  const messageText = req.body.messageContents.trim()
  const message = await Messages.findOne({
    where: {
      id: req.params.messageId,
      userName: req.user.id
    }
  })
  if (!message || !messageText) {
    res.status(400)
    res.json({
      message: "Message has no content"
    })
    return
  }
  if (messageText !== message.messageContents) {
    await message.update({
      messageContents: messageText,
      edited: true
    })
  }
  return res.sendStatus(204)
})

app.patch("/api/editStatusMessage", auth, async (req, res) => {
  const statusText = req.body.statusMessage.trim()
  const user = await Users.findOne({
    where: {
      id: req.user.id
    }
  })
  if (!user || !statusText) {
    res.status(400)
    res.json({
      message: "Status has no content"
    })
    return
  }
  if (statusText.length > 50) {
    res.status(400)
    res.json({
      message: "Status too long"
    })
    return
  }
  if (statusText !== user.statusMessage) {
    await user.update({
      statusMessage: statusText
    })
  }
  res.send(user.statusMessage)
})

app.patch("/api/tetris", auth, async (req, res) => {
  const data = req.body.data.trim()
  const user = await Users.findOne({
    where: {
      id: req.user.id
    }
  })
  if (!user || !data) {
    res.status(400)
    res.json({
      message: "No content"
    })
    return
  }
  if (data.length > 500) {
    res.status(400)
    res.json({
      message: "Data too long"
    })
    return
  }
  if (data !== user.tetris) {
    await user.update({
      tetris: data
    })
  }
  return res.sendStatus(204)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
