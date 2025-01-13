import sequelize from "./db"
import axios, { AxiosError, AxiosResponse } from "axios"
import argon2 from "argon2"
import { rateLimit } from "express-rate-limit"
import cryptoRandomString from "crypto-random-string"
import OTPAuth from "otpauth"
import QRCode from "qrcode"

import { Embed } from "./types/embeds"
import { RequestUser, RequestUserSession } from "./types/express"
import { AuthWebSocket } from "types/sockets"
import { WebSocket, WebSocketServer } from "ws"

import { NextFunction, Request, Response } from "express"

import auth from "./lib/auth"
import authSession from "./lib/authSession"
import resolveEmbeds from "./lib/resolveEmbeds"
import nodemailerLibrary from "./lib/mailer"

import Messages from "./models/messages"
import Scores from "./models/scores"
import Users from "./models/users"
import Sessions from "./models/sessions"
import Friends from "./models/friends"
import Feedback from "./models/feedback"
import Chats from "./models/chats"
import ChatAssociations from "./models/chatAssociations"
import Notifications from "./models/notifications"
import * as process from "node:process"

sequelize

Users.update(
  {
    gameName: null,
    gameStatus: null,
    playingSince: null,
    status: "offline"
  },
  { where: {} }
)

const express = require("express")
const app = express()
const port = 24555

const wss = new WebSocketServer({ port: port - 1 })

const emailLibrary = new nodemailerLibrary()
const postLimiter = rateLimit({
  legacyHeaders: false,
  limit: 5,
  message: {
    message: "Too many requests, Slow Down!"
  },
  standardHeaders: true,
  windowMs: 5000
})

const limiter = rateLimit({
  legacyHeaders: false,
  limit: 20,
  message: {
    message: "Too many requests, Slow Down!"
  },
  standardHeaders: true,
  windowMs: 5000
})

const getChat = async function (chatId: string, userId: number) {
  const chat = await Chats.findOne({
    include: [
      {
        attributes: ["id", "username", "avatar"],
        model: Users
      },
      {
        as: "messages",
        include: [
          {
            as: "user",
            attributes: ["id", "username", "avatar"],
            model: Users
          }
        ],
        model: Messages,
        required: false,
        where: { chatId }
      },
      {
        as: "pins",
        include: [
          {
            as: "user",
            attributes: ["id", "username", "avatar"],
            model: Users
          }
        ],
        model: Messages,
        required: false,
        where: { chatId, pinned: true }
      }
    ],
    where: {
      id: chatId
    }
  })
  if (!chat) {
    return null
  }
  const association = await ChatAssociations.findOne({
    where: {
      chatId,
      userId
    }
  })
  chat.dataValues.lastRead = association?.lastRead
  chat.dataValues.notifications = association?.notifications
  if (chat.type === 2) {
    chat.dataValues.users = await Users.findAll({
      attributes: [
        "id",
        "username",
        "avatar",
        "status",
        "statusMessage",
        "gameName",
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
  } else {
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
            "gameName",
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
    chat.dataValues.users = chatAssociations.map(
      (mapAssociation) => mapAssociation.user
    )
  }
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
        attributes: ["notifications"],
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
  const uniqueChats2 = chats2.filter(
    (chat2) => !chats1.some((chat1) => chat1.id === chat2.id)
  )
  return [...chats1, ...uniqueChats2]
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
    postLimiter(req, res, next)
  } else {
    limiter(req, res, next)
  }
})

app.use(express.json())
app.use(
  express.urlencoded({
    extended: true
  })
)

app.get("/api/user", auth, async (req: RequestUser, res: Response) => {
  const notifications = await Notifications.findAll({
    where: {
      userId: req.user.id
    }
  })
  const tetris = await Scores.findAll({
    where: {
      userId: req.user.id
    }
  })
  getChats(req.user.id).then((chatsList) => {
    res.json({
      chatsList,
      notifications,
      tetris,
      ...req.user.toJSON(),
      emailToken: undefined,
      otpSecret: undefined,
      password: undefined,
      privateKey: undefined,
      updatedAt: undefined
    })
  })
})

app.get("/api/chat/:chatId", auth, async (req: RequestUser, res: Response) => {
  await getChat(req.params.chatId, req.user.id).then(async (chat) => {
    const association = await ChatAssociations.findOne({
      where: {
        chatId: req.params.chatId,
        userId: req.user.id
      }
    })
    if (!association && chat?.type !== 2) {
      res.status(400).json({
        message: "Chat does not exist"
      })
      return
    }
    res.json(chat)
    return
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
    attributes: {
      exclude: ["emailToken", "otpSecret", "password", "updatedAt"]
    }
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

app.get("/api/friends", auth, async (req: RequestUser, res: Response) => {
  const friends = await Friends.findAll({
    include: [
      {
        as: "user",
        attributes: [
          "id",
          "username",
          "avatar",
          "status",
          "statusMessage",
          "gameName",
          "createdAt"
        ],
        model: Users
      }
    ],
    where: {
      friendId: req.user.id
    }
  })
  res.json(friends)
})

app.post("/api/message", auth, async (req: RequestUser, res: Response) => {
  try {
    const messageText = req.body.messageContents?.trim()
    if (!messageText || messageText < 1) {
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
    const lastMessage = await Messages.create({
      chatId: req.body.chatId,
      messageContents: messageText,
      reply: replyMessage,
      userId: req.user.id
    })
    lastMessage.dataValues.embeds = await resolveEmbeds(lastMessage)
    lastMessage.dataValues.user = {
      avatar: req.user.avatar,
      id: req.user.id,
      username: req.user.username
    }
    await chat.update({
      latest: Date.now()
    })
    const messages = await Messages.count({
      where: { chatId: req.body.chatId }
    })
    await association?.update({
      lastRead: messages
    })
    await ChatAssociations.increment("notifications", {
      where: { chatId: req.body.chatId }
    })
    await ChatAssociations.update(
      { notifications: 0 },
      { where: { chatId: req.body.chatId, userId: req.user.id } }
    )
    const chatAssociations = await ChatAssociations.findAll({
      where: { chatId: req.body.chatId }
    })
    wss.clients.forEach((wsClient: WebSocket) => {
      if ((wsClient as AuthWebSocket)?.user) {
        const user = chatAssociations.find(
          (findUser) => findUser.userId === (wsClient as AuthWebSocket).user?.id
        )
        if (user && user.userId !== lastMessage.userId)
          wsClient.send(JSON.stringify({ newMessage: lastMessage }))
      }
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
      !req.body.username ||
      !req.body.password ||
      !req.body.email ||
      req.body.username.length < 1 ||
      req.body.password.length < 1 ||
      req.body.email.length < 1
    ) {
      res.status(400).json({
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
      privateKey: req.body.privateKey,
      publicKey: req.body.publicKey,
      savePrivateKey: req.body.savePrivateKey,
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
    const notifications = await Notifications.findAll({
      where: {
        userId: user.id
      }
    })
    const tetris = await Scores.findAll({
      where: {
        userId: user.id
      }
    })
    getChats(user.id).then((chatsList) => {
      res.json({
        chatsList,
        notifications,
        tetris,
        token: session.token,
        ...user.toJSON(),
        emailToken: undefined,
        otpSecret: undefined,
        password: undefined,
        privateKey: undefined,
        updatedAt: undefined
      })
    })
  } catch (e) {
    console.log(e)
    res.status(500).json({
      message: "Something went wrong"
    })
  }
})

app.post("/api/login", async (req: Request, res: Response) => {
  if (
    !req.body.username ||
    !req.body.password ||
    req.body.username.length < 1 ||
    req.body.password.length < 1
  ) {
    res.status(400)
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
  if (user.otpVerified) {
    const totp = new OTPAuth.TOTP({ secret: user.otpSecret })
    if (totp.validate({ token: req.body.token, window: 1 }) === null) {
      res.status(401).json({ message: "Invalid OTP" })
      return
    }
  }
  const session = await Sessions.create({
    token: cryptoRandomString({ length: 128 }),
    userAgent: req.body.userAgent,
    userId: user.id
  })
  const notifications = await Notifications.findAll({
    where: {
      userId: user.id
    }
  })
  const tetris = await Scores.findAll({
    where: {
      userId: user.id
    }
  })
  getChats(user.id).then((chatsList) => {
    res.json({
      chatsList,
      notifications,
      tetris,
      token: session.token,
      ...user.toJSON(),
      emailToken: undefined,
      otpSecret: undefined,
      password: undefined,
      privateKey: undefined,
      updatedAt: undefined
    })
  })
})

app.post("/api/reset-password", async (req: Request, res: Response) => {
  try {
    if (!req.body.email || req.body.email.length < 1) {
      res.status(500).json({
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
      res.status(401).json({
        message: "Email does not exist"
      })
      return
    }
    res.status(500).json({
      message: "This feature is unavailable right now"
    })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({
      message: "Something went wrong"
    })
    return
  }
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
  if (!req.user.emailToken || req.user.emailVerified) {
    return res.status(400).json({
      message: "Account is already verified"
    })
  }
  if (req.user.emailToken !== req.body.token) {
    return res.status(401).json({
      message: "Token invalid"
    })
  }
  await req.user.update({
    emailToken: false,
    emailVerified: true
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

app.post("/api/enable-2fa", auth, async (req: RequestUser, res: Response) => {
  if (req.user.otpVerified) {
    res.status(400).json({ message: "2FA is already enabled" })
    return
  }
  const secret = new OTPAuth.Secret()
  await req.user.update({
    otpSecret: secret.base32
  })
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA256",
    digits: 6,
    issuer: "ElectricS01",
    label: req.user.username,
    period: 30,
    secret
  })
  const otpUri = totp.toString()
  const qrCodeDataURL = await QRCode.toDataURL(otpUri)

  res.json({ otpUri, qrCodeDataURL, secret: secret.base32 })
})

app.post("/api/verify-2fa", auth, async (req: RequestUser, res: Response) => {
  if (req.user.otpVerified || !req.user.otpSecret) {
    res.status(400).json({ message: "2FA is not enabled" })
    return
  }
  const totp = new OTPAuth.TOTP({ secret: req.user.otpSecret })
  if (totp.validate({ token: req.body.token, window: 1 }) === null) {
    res.status(401).json({ message: "Invalid OTP" })
    return
  }
  await req.user.update({ otpVerified: true })
  res.sendStatus(204)
})

app.post("/api/disable-2fa", auth, async (req: RequestUser, res: Response) => {
  if (!req.user.otpSecret || !req.user.otpVerified) {
    res.status(400).json({ message: "2FA is not enabled" })
    return
  }
  const totp = new OTPAuth.TOTP({ secret: req.user.otpSecret })
  if (totp.validate({ token: req.body.token, window: 1 }) === null) {
    res.status(401).json({ message: "Invalid OTP" })
    return
  }
  await req.user.update({ otpSecret: null, otpVerified: false })
  res.sendStatus(204)
})

app.post("/api/get-user", auth, async (req: RequestUser, res: Response) => {
  if (!parseInt(req.body.userId, 10) && !req.body.username) {
    res.status(400).json({
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
    res.json(user.id)
    return
  }
  const user = await Users.findOne({
    attributes: {
      exclude: [
        "email",
        "password",
        "emailVerified",
        "emailToken",
        "otpVerified",
        "otpSecret",
        "admin",
        "saveSwitcher",
        "switcherHistory",
        "privateKey",
        "savePrivateKey",
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
      },
      {
        as: "tetris",
        attributes: ["difficulty", "value", "gameId"],
        model: Scores,
        required: false,
        where: {
          userId: parseInt(req.body.userId, 10)
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
  const properties: string[] = [
    "directMessages",
    "friendRequests",
    "showCreated",
    "saveSwitcher",
    "avatar",
    "banner",
    "description",
    "encryption",
    "savePrivateKey"
  ]
  if (!properties.includes(req.body.property)) {
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
      req.body.property === "encryption" ||
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
      req.body.property === "savePrivateKey" ||
      req.body.property === "saveSwitcher") &&
    typeof req.body.val !== "boolean"
  ) {
    return res.status(400).json({
      message: "Invalid request"
    })
  }
  await req.user.update({
    [req.body.property]: req.body.val
  })
  if (req.body.property === "saveSwitcher") {
    await req.user.update({
      switcherHistory: []
    })
  }
  if (req.body.property === "savePrivateKey") {
    await req.user.update({
      privateKey: null
    })
  }
  return res.sendStatus(204)
})

app.post("/api/avatar", auth, (req: RequestUser, res: Response) => {
  axios
    .post(process.env.UPLOAD_LINK || "", req.body, {
      headers: {
        Authorization: process.env.UPLOAD_KEY
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
      await Notifications.create({
        otherId: req.user.id,
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
  if (!req.body.feedback || req.body.feedback.length < 1) {
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
  if (!req.body.history || req.body.history.length < 1) {
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
  await req.user.update({
    switcherHistory: req.body.history
  })
  res.sendStatus(204)
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
    attributes: ["id"],
    include: [
      {
        as: "messages",
        model: Messages,
        required: false,
        where: { chatId: req.params.id }
      },
      {
        as: "association",
        attributes: ["id", "lastRead", "notifications"],
        model: ChatAssociations,
        where: { chatId: req.params.id, userId: req.user.id }
      }
    ],
    where: {
      id: req.params.id
    }
  })
  if (!chat) {
    return res.status(400).json({
      message: "Chat does not exist"
    })
  }
  if (!chat.association) {
    return res.status(400).json({
      message: "You do not have access to this chat"
    })
  }
  await chat.association.update({
    lastRead: chat.dataValues.messages.length,
    notifications: 0
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
    const messageText = req.body.messageContents?.trim()
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
      const editedMessage = await Messages.findOne({
        include: [
          {
            as: "user",
            attributes: ["id", "username", "avatar"],
            model: Users
          }
        ],
        where: {
          id: message.id
        }
      })
      res.json(editedMessage)
    }
  }
)

app.patch(
  "/api/edit-status-message",
  auth,
  async (req: RequestUser, res: Response) => {
    const statusText = req.body.statusMessage?.trim()
    if (!statusText) {
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
    if (statusText !== req.user.statusMessage) {
      await req.user.update({
        statusMessage: statusText
      })
    }
    const sendPromises = Array.from(wss.clients).map(
      async (wsClient: WebSocket) => {
        if (
          (wsClient as AuthWebSocket)?.user &&
          (wsClient as AuthWebSocket)?.user.id !== req.user.id
        ) {
          const friend = await Friends.findOne({
            where: {
              friendId: req.user.id,
              userId: (wsClient as AuthWebSocket)?.user?.id
            }
          })
          wsClient.send(
            JSON.stringify({
              changeUser: {
                avatar: req.user.avatar,
                friend: { status: friend?.status },
                friendRequests: req.user.friendRequests,
                gameName: req.user.gameName,
                gameStatus: req.user.gameStatus,
                id: req.user.id,
                playingSince: req.user.playingSince,
                status: req.user.status,
                statusMessage: req.user.statusMessage,
                username: req.user.username
              }
            })
          )
        }
      }
    )
    await Promise.all(sendPromises)
    res.json({ statusMessage: req.user.statusMessage })
  }
)

app.patch("/api/score", auth, (req: RequestUser, res: Response) => {
  if (!req.body.gameId) {
    res.status(400).json({
      message: "No game specified"
    })
    return
  }
  if (!req.body.scores) {
    res.status(400).json({
      message: "No score value specified"
    })
    return
  }
  if (req.body.scores.length > 6) {
    res.status(400).json({
      message: "Invalid score value"
    })
    return
  }
  req.body.scores.map(async (score: { difficulty: number; value: number }) => {
    if (
      score.value === null ||
      isNaN(score.value) ||
      score.difficulty === null ||
      isNaN(score.difficulty) ||
      score.difficulty < -1 ||
      score.difficulty > 4
    ) {
      return
    }
    if (score.difficulty === -1) {
      if (score.value === 30) {
        await req.user.update({
          gameStatus: `Easy mode, ${req.body.scores[0].value} row${req.body.scores[0].value > 1 ? "s" : ""}`
        })
      } else if (score.value === 15) {
        await req.user.update({
          gameStatus: `Medium mode, ${req.body.scores[1].value} row${req.body.scores[1].value > 1 ? "s" : ""}`
        })
      } else if (score.value === 10) {
        await req.user.update({
          gameStatus: `Hard mode, ${req.body.scores[2].value} row${req.body.scores[2].value > 1 ? "s" : ""}`
        })
      } else if (score.value === 5) {
        await req.user.update({
          gameStatus: `God mode, ${req.body.scores[3].value} row${req.body.scores[3].value > 1 ? "s" : ""}`
        })
      } else if (score.value === 3) {
        await req.user.update({
          gameStatus: `Ultra Nightmare mode, ${req.body.scores[4].value} row${req.body.scores[4].value > 1 ? "s" : ""}`
        })
      }
    }
    const value = await Scores.findOne({
      where: {
        difficulty: score.difficulty || 0,
        gameId: req.body.gameId,
        userId: req.user.id
      }
    })
    if (value) {
      await value.update({ value: score.value })
    } else {
      await Scores.create({
        difficulty: score.difficulty || 0,
        gameId: req.body.gameId,
        userId: req.user.id,
        value: score.value
      })
    }
  })
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
    await Promise.all(
      req.body.users.map(async (userId: number) => {
        const checkUser = await Users.findOne({
          where: {
            id: userId
          }
        })
        if (checkUser) {
          await ChatAssociations.create({
            chatId: req.params.chat,
            userId
          })
          const sendPromises = Array.from(wss.clients).map(
            async (wsClient: WebSocket) => {
              if (
                (wsClient as AuthWebSocket)?.user &&
                (wsClient as AuthWebSocket)?.user.id !== req.user.id
              ) {
                const friend = await Friends.findOne({
                  where: {
                    friendId: req.user.id,
                    userId: (wsClient as AuthWebSocket)?.user?.id
                  }
                })
                wsClient.send(
                  JSON.stringify({
                    newUser: {
                      avatar: checkUser.avatar,
                      chatId: req.params.chat,
                      friend: { status: friend?.status },
                      friendRequests: checkUser.friendRequests,
                      gameName: checkUser.gameName,
                      gameStatus: checkUser.gameStatus,
                      id: checkUser.id,
                      playingSince: checkUser.playingSince,
                      status: checkUser.status,
                      statusMessage: checkUser.statusMessage,
                      username: checkUser.username
                    }
                  })
                )
              }
            }
          )
          await Promise.all(sendPromises)
          await Notifications.create({
            otherId: req.params.chat,
            type: 1,
            userId
          })
        }
      })
    )
    if (chat.type === 2) {
      chat.dataValues.users = await Users.findAll({
        attributes: [
          "id",
          "username",
          "avatar",
          "status",
          "statusMessage",
          "gameName",
          "friendRequests"
        ],
        include: [
          {
            as: "friend",
            attributes: ["status"],
            model: Friends,
            required: false,
            where: {
              userId: req.user.id
            }
          }
        ]
      })
    } else {
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
              "gameName",
              "friendRequests"
            ],
            include: [
              {
                as: "friend",
                attributes: ["status"],
                model: Friends,
                required: false,
                where: {
                  userId: req.user.id
                }
              }
            ],
            model: Users
          }
        ],
        where: { chatId: chat.id }
      })
      chat.dataValues.users = chatAssociations.map(
        (association) => association.user
      )
    }
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
    const chat = await Chats.findOne({
      where: {
        id: message.chatId
      }
    })
    if (!chat) {
      res.status(400).json({
        message: "Chat does not exist"
      })
      return
    }
    console.log(chat)
    if (chat.type !== 1 && chat.owner !== req.user.id) {
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
      const sendPromises = Array.from(wss.clients).map(
        async (wsClient: WebSocket) => {
          if (
            (wsClient as AuthWebSocket)?.user &&
            (wsClient as AuthWebSocket).user.id !== ws.user.id
          ) {
            const friend = await Friends.findOne({
              where: {
                friendId: ws.user.id,
                userId: (wsClient as AuthWebSocket)?.user?.id
              }
            })
            wsClient.send(
              JSON.stringify({
                changeUser: {
                  avatar: ws.user.avatar,
                  friend: { status: friend?.status },
                  friendRequests: ws.user.friendRequests,
                  gameName: ws.user.gameName,
                  gameStatus: ws.user.gameStatus,
                  id: ws.user.id,
                  playingSince: ws.user.playingSince,
                  status: ws.user.status,
                  statusMessage: ws.user.statusMessage,
                  username: ws.user.username
                }
              })
            )
          }
        }
      )
      await Promise.all(sendPromises)
    } else if (socketMessage.page !== undefined) {
      if (ws.user) {
        const user = await Users.findOne({
          where: {
            id: ws.user.id
          }
        })
        if (
          socketMessage.page === "Tetris" ||
          socketMessage.page === "Collider" ||
          socketMessage.page === "TonkGame" ||
          socketMessage.page === "The Calculator"
        ) {
          await user?.update({
            gameName: socketMessage.page,
            gameStatus: "Easy mode, 0 rows",
            playingSince: Date.now()
          })
          if (user) ws.user = user
          const sendPromises = Array.from(wss.clients).map(
            async (wsClient: WebSocket) => {
              if (
                (wsClient as AuthWebSocket)?.user &&
                (wsClient as AuthWebSocket).user.id !== ws.user.id
              ) {
                const friend = await Friends.findOne({
                  where: {
                    friendId: ws.user.id,
                    userId: (wsClient as AuthWebSocket)?.user?.id
                  }
                })
                wsClient.send(
                  JSON.stringify({
                    changeUser: {
                      avatar: ws.user.avatar,
                      friend: { status: friend?.status },
                      friendRequests: ws.user.friendRequests,
                      gameName: ws.user.gameName,
                      gameStatus: ws.user.gameStatus,
                      id: ws.user.id,
                      playingSince: ws.user.playingSince,
                      status: ws.user.status,
                      statusMessage: ws.user.statusMessage,
                      username: ws.user.username
                    }
                  })
                )
              }
            }
          )
          await Promise.all(sendPromises)
        }
      }
    }
  })
  ws.on("close", async () => {
    if (ws.user) {
      await ws.user.update({
        gameName: null,
        gameStatus: null,
        playingSince: null,
        status: "offline"
      })
      const sendPromises = Array.from(wss.clients).map(
        async (wsClient: WebSocket) => {
          if ((wsClient as AuthWebSocket)?.user) {
            const friend = await Friends.findOne({
              where: {
                friendId: ws.user.id,
                userId: (wsClient as AuthWebSocket)?.user?.id
              }
            })
            wsClient.send(
              JSON.stringify({
                changeUser: {
                  avatar: ws.user.avatar,
                  friend: { status: friend?.status },
                  friendRequests: ws.user.friendRequests,
                  gameName: ws.user.gameName,
                  gameStatus: ws.user.gameStatus,
                  id: ws.user.id,
                  playingSince: ws.user.playingSince,
                  status: ws.user.status,
                  statusMessage: ws.user.statusMessage,
                  username: ws.user.username
                }
              })
            )
          }
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
