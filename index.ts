import sequelize from "./db"
import axios, { AxiosError, AxiosResponse } from "axios"
import argon2 from "argon2"
import { rateLimit } from "express-rate-limit"
import cryptoRandomString from "crypto-random-string"

import { Embed } from "./types/embeds"
import { RequestUser, RequestUserSession } from "./types/express"
import { AuthWebSocket } from "types/sockets"
import { WebSocket, WebSocketServer } from "ws"

import { NextFunction, Request, Response } from "express"

import config from "./config/main.json"

import auth from "./lib/auth"
import authSession from "./lib/authSession"
import resolveEmbeds from "./lib/resolveEmbeds"
import nodemailerLibrary from "./lib/mailer"

import Messages from "./models/messages"
import Users from "./models/users"
import Sessions from "./models/sessions"
import Friends from "./models/friends"
import Feedback from "./models/feedback"
import Chats from "./models/chats"
import ChatAssociations from "./models/chatAssociations"

sequelize.sync()

const express = require("express")
const app = express()
const port = 24555

const wss = new WebSocketServer({ port: port - 1 })

const emailLibrary = new nodemailerLibrary()
const limiter = rateLimit({
  legacyHeaders: false,
  limit: 3,
  message: {
    message: "Too many requests, Slow Down!"
  },
  standardHeaders: true,
  windowMs: 5000
})

const getChat = async function (chatId: string, userId: number) {
  const chat = await Chats.findOne({
    where: {
      id: chatId
    }
  })
  if (!chat) {
    return null
  }
  chat.dataValues.messages = await Messages.findAll({
    include: [
      {
        as: "user",
        attributes: ["id", "username", "avatar"],
        model: Users
      }
    ],
    where: { chatId }
  })
  chat.dataValues.pins = await Messages.findAll({
    include: [
      {
        as: "user",
        attributes: ["id", "username", "avatar"],
        model: Users
      }
    ],
    where: { chatId, pinned: true }
  })
  const association = await ChatAssociations.findOne({
    where: {
      chatId,
      userId
    }
  })
  const chatAssociations = await ChatAssociations.findAll({
    include: [
      {
        as: "user",
        attributes: [
          "id",
          "username",
          "avatar",
          "status",
          "statusMessage",
          "friendRequests"
        ],
        include: [
          {
            as: "friend",
            attributes: ["status"],
            model: Friends,
            required: false,
            where: {
              userId
            }
          }
        ],
        model: Users
      }
    ],
    where: { chatId }
  })
  let users = chatAssociations.map((mapAssociation) => mapAssociation.user)
  if (users.length === 0) {
    users = await Users.findAll({
      attributes: [
        "id",
        "username",
        "avatar",
        "status",
        "statusMessage",
        "friendRequests"
      ],
      include: [
        {
          as: "friend",
          attributes: ["status"],
          model: Friends,
          required: false,
          where: {
            userId
          }
        }
      ]
    })
  }
  chat.dataValues.users = users
  chat.dataValues.lastRead = association?.lastRead
  return chat
}

const getChats = async function (userId: number) {
  const chats1 = await Chats.findAll({
    attributes: [
      "id",
      "name",
      "description",
      "icon",
      "owner",
      "requireVerification",
      "latest",
      "type",
      "allowInvite"
    ],
    include: [
      {
        attributes: [],
        model: ChatAssociations,
        where: { userId }
      },
      {
        attributes: ["id", "username", "avatar"],
        model: Users
      }
    ]
  })
  const chats2 = await Chats.findAll({
    attributes: [
      "id",
      "name",
      "description",
      "icon",
      "owner",
      "requireVerification",
      "latest",
      "type",
      "allowInvite"
    ],
    where: {
      type: 2
    }
  })
  return [...chats1, ...chats2]
}

const checkImage = async function (url: string) {
  try {
    const response = await axios.head(url)
    const contentType = response.headers["content-type"]
    return contentType.startsWith("image/")
  } catch (e) {
    console.error("Error occurred:", e)
    return false
  }
}

app.get(
  [
    "/api/media-proxy/:mid/:index/:securityToken",
    "/api/media-proxy/:mid/:index/:securityToken.:extension"
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const message = await Messages.findOne({
        where: {
          id: req.params.mid
        }
      })
      if (!message) {
        res.status(400).json({
          message: "Failed to embed"
        })
        return
      }
      const embed = message.embeds.find(
        (findEmbed: Embed) =>
          findEmbed.securityToken === req.params.securityToken
      )
      if (!embed) {
        res.status(400).json({
          message: "Failed to embed"
        })
        return
      }
      await axios
        .get(embed.embedLink, {
          headers: {
            "user-agent": "Googlebot/2.1 (+https://www.google.com/bot.html)"
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
      next(e)
    }
  }
)

app.use((req: Request, res: Response, next: NextFunction) => {
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

app.get("/api/user", auth, (req: RequestUser, res: Response) => {
  getChats(req.user.id).then((chatsList) => {
    res.json({
      chatsList,
      ...req.user.toJSON(),
      emailToken: undefined,
      password: undefined,
      updatedAt: undefined
    })
  })
})

app.get("/api/chat/:chatId", auth, async (req: RequestUser, res: Response) => {
  await getChat(req.params.chatId, req.user.id).then((chat) => {
    if (!chat) {
      return res.status(400).json({
        message: "Chat does not exist"
      })
    }
    return res.json(chat)
  })
})

app.get("/api/admin", auth, async (req: RequestUser, res: Response) => {
  if (!req.user.admin) {
    return res.status(403).json({
      message: "Forbidden"
    })
  }
  const feedback = await Feedback.findAll()
  const users = await Users.findAll({
    attributes: { exclude: ["emailToken", "password", "updatedAt"] }
  })
  return res.json({ feedback, users })
})

app.get("/api/sessions", auth, async (req: RequestUser, res: Response) => {
  const sessions = await Sessions.findAll({
    attributes: { exclude: ["token", "userId", "updatedAt"] },
    where: {
      userId: req.user.id
    }
  })
  res.json(sessions)
})

app.post("/api/message", auth, async (req: RequestUser, res: Response) => {
  try {
    const messageText = req.body.messageContents.trim()
    if (messageText < 1) {
      res.status(400).json({
        message: "Message has no content"
      })
      return
    }
    if (messageText > 10000) {
      res.status(400).json({
        message: "Message too long"
      })
      return
    }
    if (!req.body.chatId) {
      res.status(400).json({
        message: "Chat not specified"
      })
      return
    }
    const chat = await Chats.findOne({
      where: {
        id: req.body.chatId
      }
    })
    if (!chat) {
      res.status(400).json({
        message: "Chat does not exist"
      })
      return
    }
    if (chat.requireVerification && !req.user.emailVerified) {
      res.status(400).json({
        message: "User not verified"
      })
      return
    }
    const association = await ChatAssociations.findOne({
      where: {
        chatId: req.body.chatId,
        userId: req.user.id
      }
    })
    const replyMessage = req.body.reply
    const message = await Messages.create({
      chatId: req.body.chatId,
      messageContents: messageText,
      reply: replyMessage,
      userId: req.user.id
    })
    await resolveEmbeds(message)
    await chat.update({
      latest: Date.now()
    })
    const messages = await Messages.findAll({
      include: [
        {
          as: "user",
          attributes: ["id", "username", "avatar"],
          model: Users
        }
      ],
      where: { chatId: req.body.chatId }
    })
    const [lastMessage] = messages.splice(-1)
    await association?.update({
      lastRead: messages.length
    })
    const chatAssociations = await ChatAssociations.findAll({
      include: [
        {
          as: "user",
          attributes: ["id", "username", "avatar", "status", "statusMessage"],
          model: Users
        }
      ],
      where: { chatId: req.body.chatId }
    })
    let users = chatAssociations.map((mapAssociation) => mapAssociation.user)
    if (users.length === 0) {
      users = await Users.findAll({
        attributes: ["id", "username", "avatar", "status", "statusMessage"]
      })
    }
    wss.clients.forEach((wsClient: WebSocket) => {
      const user = users.find(
        (findUser) => findUser.id === (wsClient as AuthWebSocket).user?.id
      )
      if (user && user.id !== message.userId)
        wsClient.send(JSON.stringify({ newMessage: lastMessage }))
    })
    getChats(req.user.id).then((chats) => {
      res.json({ chats, lastMessage })
    })
  } catch (e) {
    console.log(e)
    res.status(500).json({
      message: "Something went wrong"
    })
    return
  }
})

app.post("/api/create-chat", auth, async (req: RequestUser, res: Response) => {
  if (!req.body.name) {
    res.status(400).json({
      message: "Chat name not specified"
    })
    return
  }
  if (typeof req.body.requireVerification !== "boolean") {
    res.status(400).json({
      message: "requireVerification not specified"
    })
    return
  }
  if (req.body.requireVerification === true && !req.user.emailVerified) {
    res.status(400).json({
      message: "You are not verified"
    })
    return
  }
  if (req.body.icon && !req.body.icon.match(/(https?:\/\/\S+)/g)) {
    res.status(400).json({
      message: "Icon is not a valid URL"
    })
    return
  }
  if (req.body.name.length > 30) {
    res.status(400).json({
      message: "Chat name too long"
    })
    return
  }
  if (req.body.description.length > 500) {
    res.status(400).json({
      message: "Chat description too long"
    })
    return
  }
  if (!req.user.admin) {
    res.status(403).json({
      message: "Forbidden"
    })
    return
  }
  const newChat = await Chats.create({
    description: req.body.description,
    icon: req.body.icon,
    latest: Date.now(),
    name: req.body.name,
    owner: req.user.id,
    requireVerification: req.body.requireVerification
  })
  await ChatAssociations.create({
    chatId: newChat.id,
    type: "Owner",
    userId: newChat.owner
  })
  getChat(newChat.id, req.user.id).then((chat) => {
    getChats(req.user.id).then((chats) => {
      res.json({ chat, chats })
    })
  })
})

app.post("/api/register", async (req: Request, res: Response) => {
  try {
    if (
      req.body.username.length < 1 ||
      req.body.password.length < 1 ||
      req.body.email.length < 1
    ) {
      res.status(500).json({
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
      res.status(400).json({
        message: "Username is taken"
      })
      return
    }
    if (
      await Users.findOne({
        where: {
          email: req.body.email
        }
      })
    ) {
      res.status(400).json({
        message: "Email is taken"
      })
      return
    }
    const user = await Users.create({
      email: req.body.email,
      emailToken: cryptoRandomString({
        length: 128
      }),
      password: await argon2.hash(req.body.password),
      username: req.body.username
    })
    emailLibrary
      .sendEmail(
        "support@electrics01.com",
        req.body.email,
        `Hi ${user.username}, Verify your email address`,
        `Hi ${user.username},\nPlease click the link below to verify your email address:\nhttps://electrics01.com/verify?token=${user.emailToken}\n\nIf you did not request this email, please ignore it.\n\nThanks,\nElectrics01 Support Team`
      )
      .catch((e: AxiosError) => {
        console.log("Error occurred while sending email:", e)
      })
    const session = await Sessions.create({
      token: cryptoRandomString({ length: 128 }),
      userAgent: req.body.userAgent,
      userId: user.id
    })
    res.json({ token: session.token })
  } catch (e) {
    console.log(e)
    res.status(500).json({
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
    if (!user) {
      res.status(401).json({ message: "User not found" })
      return
    }
    if (!(await argon2.verify(user.password, req.body.password))) {
      res.status(401).json({ message: "Incorrect password" })
      return
    }
    const session = await Sessions.create({
      token: cryptoRandomString({ length: 128 }),
      userAgent: req.body.userAgent,
      userId: user.id
    })
    res.json({
      token: session.token,
      user
    })
  } catch (e) {
    console.log(e)
    res.status(500).json({
      message: "Something went wrong"
    })
  }
})

app.post("/api/reset-password", async (req: Request, res: Response) => {
  try {
    if (req.body.email.length < 1) {
      return res.status(500).json({
        message: "Form not complete"
      })
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
    }
    return res.status(500).json({
      message: "This feature is unavailable right now"
    })
  } catch (e) {
    console.log(e)
    return res.status(500).json({
      message: "Something went wrong"
    })
  }
})

app.post("/api/get-user", auth, async (req: RequestUser, res: Response) => {
  if (!parseInt(req.body.userId, 10) && !req.body.username) {
    res.status(400)
    res.json({
      message: "User requested does not exist"
    })
    return
  }
  if (req.body.username) {
    const user = await Users.findOne({
      attributes: ["id"],
      where: { username: req.body.username }
    })
    if (!user) {
      res.status(400).json({
        message: "User requested does not exist or could not be found"
      })
      return
    }
    res.json(user)
    return
  }
  const user = await Users.findOne({
    attributes: {
      exclude: [
        "email",
        "password",
        "emailVerified",
        "emailToken",
        "admin",
        "saveSwitcher",
        "switcherHistory",
        "updatedAt"
      ]
    },
    include: [
      {
        as: "friend",
        attributes: ["status"],
        model: Friends,
        required: false,
        where: {
          friendId: parseInt(req.body.userId, 10),
          userId: req.user.id
        }
      }
    ],
    where: { id: req.body.userId }
  })
  if (!user) {
    res.status(400).json({
      message: "User requested does not exist or could not be found"
    })
    return
  }
  if (!user.dataValues.showCreated) {
    user.dataValues.createdAt = null
  }
  user.dataValues.showCreated = undefined
  res.json(user)
})

app.post("/api/user-prop", auth, async (req: RequestUser, res: Response) => {
  const user = await Users.findOne({
    where: {
      id: req.user.id
    }
  })
  const properties: string[] = [
    "directMessages",
    "friendRequests",
    "showCreated",
    "saveSwitcher",
    "avatar",
    "banner",
    "description"
  ]
  if (!user || !properties.includes(req.body.property)) {
    return res.status(400).json({
      message: "No property selected"
    })
  }
  if (
    ((req.body.property === "avatar" || req.body.property === "banner") &&
      req.body.val &&
      !(await checkImage(req.body.val))) ||
    ((req.body.property === "avatar" ||
      req.body.property === "banner" ||
      req.body.property === "directMessages" ||
      req.body.property === "description") &&
      !req.body.val)
  ) {
    return res.status(400).json({
      message: "Invalid image"
    })
  }
  if (
    (req.body.property === "friendRequests" ||
      req.body.property === "showCreated" ||
      req.body.property === "saveSwitcher") &&
    typeof req.body.val !== "boolean"
  ) {
    return res.status(400).json({
      message: "Invalid request"
    })
  }
  await user.update({
    [req.body.property]: req.body.val
  })
  if (req.body.property === "saveSwitcher") {
    await user.update({
      switcherHistory: []
    })
  }
  return res.sendStatus(204)
})

app.post("/api/avatar", auth, (req: RequestUser, res: Response) => {
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
    if (req.user.id === parseInt(req.params.userId, 10)) {
      res.status(400).json({
        message: "You can't friend yourself"
      })
      return
    }
    const user = await Users.findOne({
      where: {
        id: req.params.userId
      }
    })
    if (!user) {
      res.status(400).json({
        message: "This user does not exist"
      })
      return
    }
    const friend = await Friends.findOne({
      where: {
        friendId: user.id,
        userId: req.user.id
      }
    })
    if (!friend) {
      await Friends.create({
        friendId: user.id,
        userId: req.user.id
      })
      await Friends.create({
        friendId: req.user.id,
        status: "incoming",
        userId: user.id
      })
      res.sendStatus(204)
      return
    } else if (!user.friendRequests && !friend.status) {
      res.status(400).json({
        message: "This user does not accept friend request"
      })
      return
    } else if (friend.status === "accepted" || friend.status === "pending") {
      await Friends.destroy({
        where: {
          friendId: user.id,
          userId: req.user.id
        }
      })
      await Friends.destroy({
        where: {
          friendId: req.user.id,
          userId: user.id
        }
      })
    } else if (friend.status === "incoming") {
      await Friends.update(
        { status: "accepted" },
        {
          where: {
            friendId: user.id,
            userId: req.user.id
          }
        }
      )
      await Friends.update(
        { status: "accepted" },
        {
          where: {
            friendId: req.user.id,
            userId: user.id
          }
        }
      )
    }
    res.sendStatus(204)
  }
)

app.post(
  "/api/remove/:chatId/:userId",
  auth,
  async (req: RequestUser, res: Response) => {
    const user = await Users.findOne({
      where: {
        id: req.params.userId
      }
    })
    const currentChat = await Chats.findOne({
      where: {
        id: req.params.chatId
      }
    })
    if (!user || !currentChat) {
      res.status(400).json({
        message: "This user or chat does not exist"
      })
      return
    }
    if (currentChat.owner !== req.user.id) {
      res.status(400).json({
        message: "You are not allowed to remove this user"
      })
      return
    }
    const association = await ChatAssociations.findOne({
      where: {
        chatId: currentChat.id,
        userId: user.id
      }
    })
    if (!association) {
      res.status(400).json({
        message: "This user is not in this chat"
      })
      return
    }
    await ChatAssociations.destroy({
      where: {
        id: association.id
      }
    })
    getChat(currentChat.id, req.user.id).then((chat) => {
      getChats(req.user.id).then((chats) => {
        res.json({ chat, chats })
      })
    })
  }
)

app.post("/api/feedback", auth, async (req: RequestUser, res: Response) => {
  if (req.body.feedback.length < 1) {
    res.status(400).json({
      message: "Feedback has no content"
    })
    return
  }
  if (req.body.feedback.length > 500) {
    res.status(400).json({
      message: "Feedback too long"
    })
    return
  }
  await Feedback.create({
    feedback: req.body.feedback,
    userId: req.user.id
  })
  res.sendStatus(204)
})

app.post("/api/history", auth, async (req: RequestUser, res: Response) => {
  if (req.body.history.length < 1) {
    res.status(400).json({
      message: "History has no content"
    })
    return
  }
  if (req.body.history.length > 50) {
    res.status(400).json({
      message: "History too long"
    })
    return
  }
  const user = await Users.findOne({
    where: {
      id: req.user.id
    }
  })
  if (!user) {
    res.status(400).json({
      message: "This user does not exist"
    })
    return
  }
  await user.update({
    switcherHistory: req.body.history
  })
  res.sendStatus(204)
})

app.post(
  "/api/resend-verification",
  auth,
  async (req: RequestUser, res: Response) => {
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
    if (!user.emailToken || user.emailVerified) {
      return res.status(400).json({
        message: "Account is already verified"
      })
    }
    await user.update({
      emailToken: cryptoRandomString({
        length: 128
      })
    })
    emailLibrary
      .sendEmail(
        "support@electrics01.com",
        user.email,
        `Hi ${user.username}, Verify your email address`,
        `Hi ${user.username},\nPlease click the link below to verify your email address:\nhttps://electrics01.com/verify?token=${user.emailToken}\n\nIf you did not request this email, please ignore it.\n\nThanks,\nElectrics01 Support Team`
      )
      .catch((e: AxiosError) => {
        console.log("Error occurred while sending email:", e)
      })
    return res.sendStatus(204)
  }
)

app.post("/api/verify", auth, async (req: RequestUser, res: Response) => {
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
  if (!user.emailToken || user.emailVerified) {
    return res.status(400).json({
      message: "Account is already verified"
    })
  }
  if (user.emailToken !== req.body.token) {
    return res.status(401).json({
      message: "Token invalid"
    })
  }
  await user.update({
    emailToken: false,
    emailVerified: true
  })
  return res.sendStatus(204)
})

app.post(
  "/api/direct-message/:userId",
  auth,
  async (req: RequestUser, res: Response) => {
    if (!req.params.userId) {
      res.status(400).json({
        message: "User id is required"
      })
      return
    }
    if (req.params.userId === req.user.id.toString()) {
      res.status(400).json({
        message: "Cannot send direct message to yourself"
      })
      return
    }
    const otherUser = await Users.findOne({
      where: {
        id: req.params.userId
      }
    })
    if (!otherUser) {
      res.status(400).json({
        message: "User does not exist"
      })
      return
    }
    const currentChat =
      (await Chats.findOne({
        where: {
          name: otherUser.username,
          owner: req.user.id
        }
      })) ||
      (await Chats.findOne({
        where: {
          name: req.user.username,
          owner: otherUser.id
        }
      }))
    if (currentChat) {
      getChat(currentChat.id, req.user.id).then((chat) => {
        getChats(req.user.id).then((chats) => {
          res.json({ chat, chats })
        })
      })
    } else {
      const createChat = await Chats.create({
        icon: otherUser.avatar,
        latest: Date.now(),
        name: otherUser.username,
        owner: req.user.id,
        requireVerification: false,
        type: 1
      })
      await ChatAssociations.create({
        chatId: createChat.id,
        userId: req.user.id
      })
      await ChatAssociations.create({
        chatId: createChat.id,
        userId: req.params.userId
      })
      getChat(createChat.id, req.user.id).then((chat) => {
        getChats(req.user.id).then((chats) => {
          res.json({ chat, chats })
        })
      })
    }
  }
)

app.post("/api/read-new/:id", auth, async (req: RequestUser, res: Response) => {
  if (!req.params.id) {
    return res.status(400).json({
      message: "No chat specified"
    })
  }
  const chat = await Chats.findOne({
    where: {
      id: req.params.id
    }
  })
  if (!chat) {
    return res.status(400).json({
      message: "Chat does not exist"
    })
  }
  chat.dataValues.messages = await Messages.findAll({
    include: [
      {
        as: "user",
        attributes: ["id", "username", "avatar"],
        model: Users
      }
    ],
    where: { chatId: req.params.id }
  })
  const association = await ChatAssociations.findOne({
    where: {
      chatId: req.params.id,
      userId: req.user.id
    }
  })
  if (!association) {
    return res.status(400).json({
      message: "You do not have access to this chat"
    })
  }
  await association.update({
    lastRead: chat.dataValues.messages.length
  })
  return res.sendStatus(204)
})

app.post(
  "/api/logout",
  authSession,
  async (req: RequestUserSession, res: Response) => {
    await req.session.destroy()
    res.sendStatus(204)
  }
)

app.post("/api/logout-all", auth, async (req: RequestUser, res: Response) => {
  if (!(await argon2.verify(req.user.password, req.body.password))) {
    return res.status(400).json({
      message: "Incorrect password"
    })
  }
  await Sessions.destroy({
    where: {
      userId: req.user.id
    }
  })
  return res.sendStatus(204)
})

app.delete(
  "/api/delete/:messageId",
  auth,
  async (req: RequestUser, res: Response) => {
    const message = await Messages.findOne({
      where: {
        id: req.params.messageId
      }
    })
    if (!message) {
      res.status(400).json({
        message: "Message does not exist"
      })
      return
    }
    const where = req.user.admin
      ? { id: req.params.messageId }
      : { id: req.params.messageId, userId: req.user.id }
    await Messages.destroy({ where })
    res.sendStatus(204)
  }
)

app.delete(
  "/api/delete-chat/:chatId",
  auth,
  async (req: RequestUser, res: Response) => {
    const currentChat = await Chats.findOne({
      where: {
        id: req.params.chatId
      }
    })
    if (!currentChat) {
      res.status(400).json({
        message: "Chat does not exist"
      })
      return
    }
    if (currentChat.id === 1) {
      res.status(400).json({
        message: "Cannot delete this chat"
      })
      return
    }
    if (currentChat.owner !== req.user.id) {
      res.status(403).json({
        message: "Forbidden"
      })
      return
    }
    await Chats.destroy({
      where: {
        id: req.params.chatId
      }
    })
    await ChatAssociations.destroy({
      where: {
        chatId: req.params.chatId
      }
    })
    await Messages.destroy({
      where: {
        chatId: req.params.chatId
      }
    })
    getChat("1", req.user.id).then((chat) => {
      getChats(req.user.id).then((chats) => {
        res.json({ chat, chats })
      })
    })
  }
)

app.delete(
  "/api/delete-feedback/:feedbackId",
  auth,
  async (req: RequestUser, res: Response) => {
    if (!req.user.admin) {
      res.status(403).json({
        message: "Forbidden"
      })
      return
    }
    if (!req.params.feedbackId) {
      res.status(400).json({
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
      res.status(400).json({
        message: "Feedback does not exist"
      })
      return
    }
    await feedback.destroy()
    res.json({ message: "Feedback has been deleted" })
  }
)

app.delete(
  "/api/clear-history",
  auth,
  async (req: RequestUser, res: Response) => {
    const user = await Users.findOne({
      where: {
        id: req.user.id
      }
    })
    if (!user) {
      res.status(400).json({
        message: "This user does not exist"
      })
      return
    }
    if (!user.switcherHistory) {
      res.json({
        message: "No history found"
      })
      return
    }
    await user.update({
      switcherHistory: []
    })
    res.json({
      message: "History cleared"
    })
  }
)

app.delete(
  "/api/delete-session/:id",
  auth,
  async (req: RequestUser, res: Response) => {
    const session = await Sessions.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    })
    if (!session) {
      return res.status(400).json({
        message: "Session does not exist"
      })
    }
    await session.destroy()
    return res.json({ message: "Session has been deleted" })
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
        userId: req.user.id
      }
    })
    if (!message || !messageText) {
      res.status(400).json({
        message: "Message has no content"
      })
      return
    }
    if (messageText !== message.messageContents) {
      await message.update({
        edited: true,
        messageContents: messageText
      })
      await resolveEmbeds(message)
      const messages = await Messages.findAll({
        include: [
          {
            as: "user",
            attributes: ["id", "username", "avatar"],
            model: Users
          }
        ],
        where: { chatId: message.chatId }
      })
      res.json(messages)
    }
  }
)

app.patch(
  "/api/edit-status-message",
  auth,
  async (req: RequestUser, res: Response) => {
    const statusText = req.body.statusMessage.trim()
    const user = await Users.findOne({
      where: {
        id: req.user.id
      }
    })
    if (!user || !statusText) {
      res.status(400).json({
        message: "Status has no content"
      })
      return
    }
    if (statusText.length > 50) {
      res.status(400).json({
        message: "Status too long"
      })
      return
    }
    if (statusText !== user.statusMessage) {
      await user.update({
        statusMessage: statusText
      })
    }
    const users = await Users.findAll({
      attributes: ["id", "username", "avatar", "status", "statusMessage"]
    })
    res.json({ statusMessage: user.statusMessage, users })
  }
)

app.patch("/api/tetris", auth, async (req: RequestUser, res: Response) => {
  const data = req.body.data.trim()
  const user = await Users.findOne({
    where: {
      id: req.user.id
    }
  })
  if (!user || !data) {
    res.status(400).json({
      message: "No content"
    })
    return
  }
  if (data.length > 500) {
    res.status(400).json({
      message: "Data too long"
    })
    return
  }
  if (data !== user.tetris) {
    await user.update({
      tetris: data
    })
  }
  res.sendStatus(204)
})

app.patch(
  "/api/edit-chat/:chat",
  auth,
  async (req: RequestUser, res: Response) => {
    const chat = await Chats.findOne({
      where: {
        id: req.params.chat
      }
    })
    if (!chat) {
      res.status(400).json({
        message: "Chat does not exist"
      })
      return
    }
    if (chat.owner !== req.user.id) {
      res.status(403).json({
        message: "Forbidden"
      })
      return
    }
    if (!req.body.name) {
      res.status(400).json({
        message: "Chat name not specified"
      })
      return
    }
    if (typeof req.body.requireVerification !== "boolean") {
      res.status(400).json({
        message: "requireVerification not specified"
      })
      return
    }
    if (req.body.requireVerification === true && !req.user.emailVerified) {
      res.status(400).json({
        message: "You are not verified"
      })
      return
    }
    if (req.body.icon && !req.body.icon.match(/(https?:\/\/\S+)/g)) {
      res.status(400).json({
        message: "Icon is not a valid URL"
      })
      return
    }
    if (req.body.name.length > 30) {
      res.status(400).json({
        message: "Chat name too long"
      })
      return
    }
    if (req.body.description.length > 500) {
      res.status(400).json({
        message: "Chat description too long"
      })
      return
    }
    await chat.update({
      description: req.body.description,
      icon: req.body.icon,
      name: req.body.name,
      requireVerification: req.body.requireVerification
    })
    chat.dataValues.messages = await Messages.findAll({
      include: [
        {
          as: "user",
          attributes: ["id", "username", "avatar"],
          model: Users
        }
      ],
      where: { chatId: req.params.chat }
    })
    req.body.users.map(async (user: number) => {
      const checkUser = await Users.findOne({
        where: {
          id: user
        }
      })
      if (checkUser) {
        await ChatAssociations.create({
          chatId: req.params.chat,
          userId: user
        })
      }
    })
    const chatAssociations = await ChatAssociations.findAll({
      include: [
        {
          as: "user",
          attributes: ["id", "username", "avatar", "status", "statusMessage"],
          model: Users
        }
      ],
      where: { chatId: req.params.chat }
    })
    let users = chatAssociations.map((association) => association.user)
    if (users.length === 0) {
      users = await Users.findAll({
        attributes: ["id", "username", "avatar", "status", "statusMessage"]
      })
    }
    chat.dataValues.users = users
    getChats(req.user.id).then((chats) => {
      res.json({ chat, chats })
    })
  }
)

app.patch(
  "/api/pin/:messageId",
  auth,
  async (req: RequestUser, res: Response) => {
    if (!req.params.messageId) {
      res.status(400).json({
        message: "Message not specified"
      })
      return
    }
    const message = await Messages.findOne({
      where: {
        id: req.params.messageId
      }
    })
    if (!message) {
      res.status(400).json({
        message: "Message could not be found"
      })
      return
    }
    if (message.id !== req.user.id && !req.user.admin) {
      res.status(403).json({
        message: "Forbidden"
      })
      return
    }
    await message.update({
      pinned: !message.pinned
    })
    res.sendStatus(204)
  }
)

wss.on("connection", (ws: AuthWebSocket) => {
  console.log("Socket opened")

  ws.on("error", console.error)

  ws.on("message", async (data: string) => {
    const socketMessage = JSON.parse(data)
    if (socketMessage.token) {
      const session = await Sessions.findOne({
        include: [
          {
            as: "user",
            model: Users
          }
        ],
        where: { token: socketMessage.token }
      })
      if (!session || !session.user) {
        ws.send(JSON.stringify({ authFail: "Access denied. Invalid token." }))
        ws.close()
        return
      }
      ws.user = session.user
      ws.send(JSON.stringify({ authSuccess: "Token accepted." }))
      await session.user.update({ status: "online" })
      wss.clients.forEach((wsClient: WebSocket) => {
        if (
          (wsClient as AuthWebSocket)?.user &&
          (wsClient as AuthWebSocket).user.id !== ws.user.id
        )
          wsClient.send(JSON.stringify({ changeUser: ws.user }))
      })
    }
  })
  ws.on("close", async () => {
    if (ws.user) {
      await ws.user.update({ status: "offline" })
      const sendPromises = Array.from(wss.clients).map(
        async (wsClient: WebSocket) => {
          const friend = await Friends.findOne({
            where: {
              userId: ws.user.id
            }
          })
          return wsClient.send(
            JSON.stringify({
              changeUser: {
                avatar: ws.user.avatar,
                friend: friend?.status,
                friendRequests: ws.user.friendRequests,
                id: ws.user.id,
                status: ws.user.status,
                statusMessage: ws.user.statusMessage,
                username: ws.user.username
              }
            })
          )
        }
      )
      await Promise.all(sendPromises)
    }
    console.log("Socket closed")
    ws.close()
  })
})

app.listen(port, () => {
  console.log(`ElectricS01-Website-Backend listening on port ${port}`)
})
