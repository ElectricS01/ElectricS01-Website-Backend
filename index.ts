import "reflect-metadata"
import sequelize from "./db"
sequelize

import { Embed } from "./types/embeds"
import { RequestUser } from "./types/express"

import { Request, Response, NextFunction } from "express"
import { AxiosError, AxiosResponse } from "axios"

import auth from "./lib/auth"
import resolveEmbeds from "./lib/resolveEmbeds"
import Messages from "./models/messages"
import Users from "./models/users"
import Sessions from "./models/sessions"
import Friends from "./models/friends"

const express = require("express")
const rateLimit = require("express-rate-limit")
const argon2 = require("argon2")
const cryptoRandomString = require("crypto-random-string")
const axios = require("axios")
import config from "./config/uploadconfig.json"
import config2 from "./config/config.json"

const app = express()
const port = 24555

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
  async (req: Request, res: Response, next: NextFunction) => {
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
        (e: Embed) => e.securityToken === req.params.securityToken
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
        .then((response: AxiosResponse) => {
          res.setHeader("content-type", response.headers["content-type"])
          res.setHeader("cache-control", "public, max-age=604800")
          res.end(response.data, "binary")
        })
        .catch(() => {
          res.status(404).end()
        })
    } catch (e) {
      return next(e)
    }
  }
)

app.use(function (req: Request, res: Response, next: NextFunction) {
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

app.get("/api/messages", auth, async (req: Request, res: Response) => {
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

app.get("/api/users", auth, async (req: Request, res: Response) => {
  const users = await Users.findAll({
    attributes: ["id", "username", "avatar", "status", "statusMessage"]
  })
  res.json(users)
})

app.get("/api/user", auth, async (req: RequestUser, res: Response) => {
  res.json({
    ...req.user.toJSON(),
    password: undefined,
    emailToken: undefined,
    updatedAt: undefined
  })
})

app.get("/api/user/:userId", auth, async (req: RequestUser, res: Response) => {
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
      "statusMessage"
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
  res.json(user)
})

app.post("/api/message", auth, async (req: RequestUser, res: Response) => {
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
      resolveEmbeds(req, message).catch(() => {})
      res.json(message)
    }
  } catch {
    res.status(500)
    res.json({
      message: "Something went wrong"
    })
  }
})

app.post("/api/register", async (req: Request, res: Response) => {
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

app.post("/api/login", async (req: Request, res: Response) => {
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

app.post("/api/avatar", auth, async (req: RequestUser, res: Response) => {
  axios
    .post(config.uploadLink, req.body, {
      headers: {
        Authorization: config.apiKey
      }
    })
    .then(async (response: AxiosResponse) => {
      await Users.update(
        { avatar: response.data.attachment.attachment },
        { where: { id: req.user.id } }
      )
      res.sendStatus(204)
    })
    .catch((e: AxiosError) => {
      console.log(e)
      res.status(500).send("Internal server error")
    })
})

app.post(
  "/api/friend/:userId",
  auth,
  async (req: RequestUser, res: Response) => {
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
    if (!user.friendRequests) {
      return res.status(400).json({
        message: "This user does not accept friend request"
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
      return res.sendStatus(204)
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
      return res.sendStatus(204)
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
      return res.sendStatus(204)
    }
    return res.sendStatus(204)
  }
)

app.delete(
  "/api/delete/:messageId",
  auth,
  async (req: RequestUser, res: Response) => {
    const where = req.user.admin
      ? { id: req.params.messageId }
      : { id: req.params.messageId, userName: req.user.id }

    await Messages.destroy({ where })
    res.sendStatus(204)
  }
)

app.patch(
  "/api/edit/:messageId",
  auth,
  async (req: RequestUser, res: Response) => {
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
  }
)

app.patch(
  "/api/editStatusMessage",
  auth,
  async (req: RequestUser, res: Response) => {
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
  }
)

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
