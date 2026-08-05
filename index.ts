import sequelize from "./db"
import axios, { AxiosError, AxiosResponse } from "axios"
import { rateLimit } from "express-rate-limit"
import cryptoRandomString from "crypto-random-string"
import * as OTPAuth from "otpauth"
import QRCode from "qrcode"
import { WebSocketServer } from "ws"
import multer from "multer"
import {
  generateRegistrationOptions,
  verifyRegistrationResponse
} from "@simplewebauthn/server"
import { isoUint8Array } from "@simplewebauthn/server/helpers"
import emojiRegex from "emoji-regex"
import { UniqueConstraintError } from "sequelize"

import { Embed } from "./types/embeds"
import { RequestUser, RequestUserFile } from "./types/express"
import { AuthWebSocket } from "./types/sockets"
import { Challenge } from "./types/challange"

import { NextFunction, Request, Response } from "express"

import auth from "./lib/auth"
import resolveEmbeds, { checkValidImage } from "./lib/resolveEmbeds"
import { getChat, getChatUserIds, getChats } from "./lib/chat"
import { broadcastChatEvent, broadcastUserEvent } from "./lib/websocket"
import sendVerificationEmail from "./lib/emails"
import verifyPassword, {
  validatePrivateKey,
  validatePublicKey,
  validateUsername
} from "./lib/validator"

import authRoutes from "./routes/auth"

import Messages from "./models/messages"
import Scores from "./models/scores"
import Users from "./models/users"
import Sessions from "./models/sessions"
import Friends from "./models/friends"
import Feedback from "./models/feedback"
import Chats from "./models/chats"
import ChatAssociations from "./models/chatAssociations"
import Notifications from "./models/notifications"
import Uploads from "./models/uploads"
import Passkeys from "./models/passkeys"
import Reactions from "./models/reactions"

import * as process from "node:process"
import path from "node:path"
import { ChatType } from "./types/chat"

sequelize

const express = require("express")

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => {
    cb(
      null,
      cryptoRandomString({ length: 12 }) + path.extname(file.originalname)
    )
  }
})
const upload = multer({ storage })

const app = express()
const port = 24555

const wss = new WebSocketServer({ port: port - 1 })

export const challenges: Challenge[] = []
const rpName = "ElectricS01"
export const rpID = process.env.TS_NODE_DEV ? "localhost" : "electrics01.com"
export const origin = process.env.TS_NODE_DEV
  ? "http://localhost:8080"
  : "https://electrics01.com"

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

export const FIVE_MINUTES = 5 * 60 * 1000

setInterval(() => {
  const cutoff = Date.now() - FIVE_MINUTES
  const kept = challenges.filter((c) => c.timestamp >= cutoff)

  challenges.splice(0, challenges.length, ...kept)
}, FIVE_MINUTES)

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
          res.setHeader(
            "content-type",
            String(response.headers["content-type"])
          )
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
app.use("/api/i", express.static("uploads"))
app.use(
  express.urlencoded({
    extended: true
  })
)
app.use("/api", authRoutes)

app.use(auth)

app.post("/api/logout", async (req: RequestUser, res: Response) => {
  await req.session.destroy()
  res.sendStatus(204)
})

app.get("/api/user", async (req: RequestUser, res: Response) => {
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
      sessionId: req.session.id,
      updatedAt: undefined
    })
  })
})

app.get("/api/chat/:chatId", async (req: RequestUser, res: Response) => {
  const association = await ChatAssociations.findOne({
    where: {
      chatId: req.params.chatId,
      userId: req.user.id
    }
  })

  if (!association) {
    res.status(403).json({
      message: "You do not have access to this chat"
    })
    return
  }

  await getChat(association.chatId, req.user.id).then((chat) => {
    res.json(chat)
    return
  })
})

app.get("/api/chat-users/:chatId", async (req: RequestUser, res: Response) => {
  const association = await ChatAssociations.findOne({
    where: {
      chatId: req.params.chatId,
      userId: req.user.id
    }
  })

  if (association === null) {
    res.status(400).json({
      message: "You do not have access to this chat"
    })
    return
  }

  const chatAssociations = await ChatAssociations.findAll({
    include: [
      {
        as: "user",
        attributes: ["id", "username"],
        model: Users
      }
    ],
    where: { chatId: association.chatId }
  })

  const users = chatAssociations.map((mapAssociation) => ({
    id: mapAssociation.user.id,
    username: mapAssociation.user.username
  }))

  res.json(users)
  return
})

app.get("/api/chats", (req: RequestUser, res: Response) => {
  getChats(req.user.id).then((chats) => {
    res.json(chats)
  })
})

app.get("/api/admin", async (req: RequestUser, res: Response) => {
  if (!req.user.admin) {
    return res.status(403).json({
      message: "Forbidden"
    })
  }
  const feedback = await Feedback.findAll()
  const users = await Users.findAll({
    attributes: {
      exclude: [
        "emailToken",
        "otpSecret",
        "password",
        "updatedAt",
        "switcherHistory",
        "privateKey"
      ]
    }
  })
  return res.json({ feedback, users })
})

app.get("/api/sessions", async (req: RequestUser, res: Response) => {
  const sessions = await Sessions.findAll({
    attributes: { exclude: ["token", "userId", "updatedAt"] },
    where: {
      userId: req.user.id
    }
  })
  res.json(sessions)
})

app.get("/api/passkeys", async (req: RequestUser, res: Response) => {
  const passkeys = await Passkeys.findAll({
    attributes: [
      "id",
      "name",
      "credentialDeviceType",
      "credentialBackedUp",
      "createdAt"
    ],
    where: { userId: req.user.id }
  })

  res.json(passkeys)
})

app.get("/api/friends", async (req: RequestUser, res: Response) => {
  const friends = await Friends.findAll({
    include: [
      {
        as: "user2",
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
      userId: req.user.id
    }
  })
  res.json(friends)
})

app.post("/api/message", async (req: RequestUser, res: Response) => {
  try {
    const messageText = req.body.messageContents?.trim()
    if (!messageText || messageText.length < 1) {
      res.status(400).json({
        message: "Message has no content"
      })
      return
    }
    if (messageText.length > 10000) {
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
      include: [
        {
          model: ChatAssociations,
          required: false,
          where: {
            userId: req.user.id
          }
        }
      ],
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

    if (!chat.association) {
      res.status(403).json({
        message: "You are not a member of this chat"
      })
      return
    }

    if (chat.requireVerification && !req.user.emailVerified) {
      res.status(400).json({
        message: "User not verified"
      })
      return
    }
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
    await ChatAssociations.increment("notifications", {
      where: { chatId: req.body.chatId }
    })
    await ChatAssociations.update(
      {
        lastRead: lastMessage.id,
        notifications: 0
      },
      {
        where: {
          id: chat.association.id
        }
      }
    )
    await broadcastChatEvent(
      wss,
      chat.id,
      { newMessage: lastMessage },
      lastMessage.userId
    )
    lastMessage.dataValues.reactions = []
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

app.post("/api/react", async (req: RequestUser, res: Response) => {
  if (!req.body.messageId || !req.body.emoji) {
    res.status(400).json({
      message: "Missing required fields"
    })
    return
  }

  const message = await Messages.findOne({
    where: {
      id: req.body.messageId
    }
  })

  if (!message) {
    res.status(400).json({ message: "Invalid message" })
    return
  }

  const chat = await Chats.findOne({
    include: [
      {
        as: "association",
        model: ChatAssociations,
        required: false,
        where: {
          userId: req.user.id
        }
      }
    ],
    where: {
      id: message.chatId
    }
  })

  if (!chat || (chat.type !== 2 && !chat.association)) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  if (chat.requireVerification && !req.user.emailVerified) {
    res.status(400).json({
      message: "User not verified"
    })
    return
  }

  if (typeof req.body.emoji !== "string") {
    res.status(400).json({ message: "Invalid emoji" })
    return
  }

  const cleanEmoji = req.body.emoji.trim()
  const matches = cleanEmoji.match(emojiRegex())

  if (!matches || matches.length !== 1 || matches[0] !== cleanEmoji) {
    res.status(400).json({ message: "Invalid emoji" })
    return
  }

  const existing = await Reactions.findOne({
    where: {
      emoji: cleanEmoji,
      messageId: req.body.messageId,
      userId: req.user.id
    }
  })

  if (existing) {
    res.sendStatus(204)
    return
  }

  try {
    const reaction = await Reactions.create({
      emoji: cleanEmoji,
      messageId: req.body.messageId,
      userId: req.user.id
    })

    await broadcastChatEvent(
      wss,
      message.chatId,
      {
        newReaction: {
          messageId: req.body.messageId,
          reaction
        }
      },
      req.user.id
    )
  } catch (error) {
    if (!(error instanceof UniqueConstraintError)) {
      throw error
    }
  }

  res.sendStatus(204)
})

app.post("/api/unreact", async (req: RequestUser, res: Response) => {
  if (!req.body.messageId || !req.body.emoji) {
    res.status(400).json({
      message: "Missing required fields"
    })
    return
  }

  const message = await Messages.findOne({
    where: {
      id: req.body.messageId
    }
  })

  if (!message) {
    res.status(400).json({ message: "Invalid message" })
    return
  }

  const chat = await Chats.findOne({
    include: [
      {
        as: "association",
        model: ChatAssociations,
        required: false,
        where: {
          userId: req.user.id
        }
      }
    ],
    where: {
      id: message.chatId
    }
  })

  if (!chat || (chat.type !== 2 && !chat.association)) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  if (chat.requireVerification && !req.user.emailVerified) {
    res.status(400).json({
      message: "User not verified"
    })
    return
  }

  if (typeof req.body.emoji !== "string") {
    res.status(400).json({ message: "Invalid emoji" })
    return
  }

  const cleanEmoji = req.body.emoji.trim()
  const matches = cleanEmoji.match(emojiRegex())

  if (!matches || matches.length !== 1 || matches[0] !== cleanEmoji) {
    res.status(400).json({ message: "Invalid emoji" })
    return
  }

  const existing = await Reactions.findOne({
    where: {
      emoji: cleanEmoji,
      messageId: req.body.messageId,
      userId: req.user.id
    }
  })

  if (!existing) {
    res.sendStatus(204)
    return
  }

  await existing.destroy()

  await broadcastChatEvent(
    wss,
    message.chatId,
    {
      deleteReaction: {
        messageId: req.body.messageId,
        reactionId: existing.id
      }
    },
    req.user.id
  )

  res.sendStatus(204)
})

app.post("/api/create-chat", async (req: RequestUser, res: Response) => {
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
  const addedUserIds = (
    await Promise.all(
      getChatUserIds(req.body.users, req.user.id).map(async (userId) => {
        const user = await Users.findOne({
          where: {
            id: userId
          }
        })

        if (!user) {
          return null
        }

        await ChatAssociations.create({
          chatId: newChat.id,
          userId
        })
        await Notifications.create({
          otherId: newChat.id,
          type: 1,
          userId
        })
        return userId
      })
    )
  ).filter((userId): userId is number => userId !== null)
  if (addedUserIds.length > 0) {
    await broadcastChatEvent(
      wss,
      newChat.id,
      {
        newChat: {
          description: newChat.description,
          icon: newChat.icon,
          id: newChat.id,
          latest: newChat.latest,
          name: newChat.name,
          owner: newChat.owner,
          requireVerification: newChat.requireVerification,
          type: newChat.type
        }
      },
      req.user.id
    )
  }
  getChat(newChat.id, req.user.id).then((chat) => {
    getChats(req.user.id).then((chats) => {
      res.json({ chat, chats })
    })
  })
})

app.post(
  "/api/resend-verification",
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
    await sendVerificationEmail(user.email, user.username, user.emailToken)

    return res.sendStatus(204)
  }
)

app.post("/api/verify", async (req: RequestUser, res: Response) => {
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

app.post("/api/logout-all", async (req: RequestUser, res: Response) => {
  if (!(await verifyPassword(req, res))) return

  await Sessions.destroy({
    where: {
      userId: req.user.id
    }
  })

  return res.sendStatus(204)
})

app.post("/api/enable-2fa", async (req: RequestUser, res: Response) => {
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

app.post("/api/verify-2fa", async (req: RequestUser, res: Response) => {
  if (req.user.otpVerified || !req.user.otpSecret) {
    res.status(400).json({ message: "2FA is not enabled" })
    return
  }
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA256",
    secret: req.user.otpSecret
  })
  if (totp.validate({ token: req.body.token, window: 1 }) === null) {
    res.status(401).json({ message: "2FA code is invalid" })
    return
  }
  await req.user.update({ otpVerified: true })
  res.sendStatus(204)
})

app.post("/api/disable-2fa", async (req: RequestUser, res: Response) => {
  if (!req.user.otpSecret || !req.user.otpVerified) {
    res.status(400).json({ message: "2FA is not enabled" })
    return
  }
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA256",
    secret: req.user.otpSecret
  })
  if (totp.validate({ token: req.body.token, window: 1 }) === null) {
    res.status(401).json({ message: "2FA code is invalid" })
    return
  }
  await req.user.update({ otpSecret: null, otpVerified: false })
  res.sendStatus(204)
})

app.post("/api/add-passkey", async (req: RequestUser, res: Response) => {
  const userPasskeys = await Passkeys.findAll({
    where: { userId: req.user.id }
  })

  const options = await generateRegistrationOptions({
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred"
    },
    excludeCredentials: userPasskeys.map((passkey) => ({
      id: passkey.credentialID,
      transports: passkey.transports
        ? JSON.parse(passkey.transports)
        : undefined,
      type: "public-key"
    })),
    rpID,
    rpName,
    userID: isoUint8Array.fromUTF8String(req.user.id),
    userName: req.user.username
  })

  const challengeId = cryptoRandomString({ length: 16 })

  challenges.push({
    challenge: options.challenge,
    id: challengeId,
    timestamp: Date.now(),
    userId: req.user.id
  })

  res.json({
    challengeId,
    options
  })
})

app.post("/api/confirm-passkey", async (req: RequestUser, res: Response) => {
  const passkeyName = req.body.passkeyName?.trim()

  if (!passkeyName) {
    res.status(400).json({
      message: "Passkey name is missing"
    })
    return
  }

  if (passkeyName.length > 50) {
    res.status(400).json({
      message: "Passkey name too long"
    })
    return
  }

  if (!req.body.challengeId) {
    res.status(400).json({
      message: "Challenge ID missing"
    })
    return
  }

  const challengeIndex = challenges.findIndex(
    (c) => c.id === req.body.challengeId && c.userId === req.user.id
  )

  if (challengeIndex === -1) {
    res.status(400).json({
      message: "Challenge not found or expired"
    })
    return
  }

  const challengeData = challenges[challengeIndex]

  if (Date.now() - challengeData.timestamp > FIVE_MINUTES) {
    challenges.splice(challengeIndex, 1)
    res.status(400).json({
      message: "Challenge expired"
    })
    return
  }

  /* eslint-disable-next-line init-declarations */
  let verification
  try {
    verification = await verifyRegistrationResponse({
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      response: req.body
    })
  } catch (error) {
    console.error("Verification error:", error)
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
      message: "Verification failed"
    })
    return
  }

  if (!verification.verified || !verification.registrationInfo) {
    res.status(400).json({ message: "Verification failed" })
    return
  }

  await Passkeys.create({
    counter: verification.registrationInfo.credential.counter,
    credentialBackedUp: verification.registrationInfo.credentialBackedUp,
    credentialDeviceType: verification.registrationInfo.credentialDeviceType,
    credentialID: verification.registrationInfo.credential.id,
    credentialPublicKey: Buffer.from(
      verification.registrationInfo.credential.publicKey
    ).toString("base64url"),
    name: passkeyName,
    transports: req.body.response.transports
      ? JSON.stringify(req.body.response.transports)
      : null,
    userId: req.user.id
  })

  challenges.splice(challengeIndex, 1)

  res.sendStatus(204)
})

app.post("/api/get-user", async (req: RequestUser, res: Response) => {
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

const imageProperties: string[] = ["avatar", "banner"]
const booleanProperties: string[] = [
  "friendRequests",
  "showCreated",
  "saveSwitcher",
  "savePrivateKey"
]
const dmOptions: string[] = ["no one", "friends", "everyone"]
const encryptionOptions: string[] = ["never", "off", "on", "always"]
const properties: string[] = [
  "avatar",
  "banner",
  "friendRequests",
  "showCreated",
  "saveSwitcher",
  "savePrivateKey",
  "description",
  "directMessages",
  "encryption"
]

app.post("/api/user-prop", async (req: RequestUser, res: Response) => {
  if (!properties.includes(req.body.property)) {
    res.status(400).json({
      message: "No property selected"
    })
    return
  }

  const value =
    typeof req.body.val === "string" ? req.body.val.trim() : req.body.val

  if (
    (typeof value === "string" && value.length === 0) ||
    (typeof value !== "string" && typeof value !== "boolean")
  ) {
    res.status(400).json({
      message: "Value is required"
    })
    return
  }

  if (
    imageProperties.includes(req.body.property) &&
    (typeof value !== "string" || !(await checkValidImage(value)))
  ) {
    res.status(400).json({
      message: "Invalid image"
    })
    return
  }

  if (
    booleanProperties.includes(req.body.property) &&
    typeof value !== "boolean"
  ) {
    res.status(400).json({
      message: "Invalid option"
    })
    return
  }

  if (
    req.body.property === "directMessages" &&
    (typeof value !== "string" || !dmOptions.includes(value))
  ) {
    res.status(400).json({
      message: "Invalid option"
    })
    return
  }

  if (
    req.body.property === "encryption" &&
    (typeof value !== "string" || !encryptionOptions.includes(value))
  ) {
    res.status(400).json({
      message: "Invalid option"
    })
    return
  }

  if (
    req.body.property === "description" &&
    (typeof value !== "string" || value.length > 1000)
  ) {
    res.status(400).json({
      message: "Invalid description"
    })
    return
  }

  await req.user.update({
    [req.body.property]: value
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
  res.json({
    value
  })
})

app.post("/api/avatar", (req: RequestUser, res: Response) => {
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

app.post("/api/friend/:userId", async (req: RequestUser, res: Response) => {
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

  if (!user.friendRequests && !friend) {
    res.status(400).json({
      message: "This user does not accept friend request"
    })
    return
  } else if (!friend) {
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
    res.json({ status: "pending" })
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
    res.sendStatus(204)
    return
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
    res.json({ status: "accepted" })
    return
  }
  res.status(400).json({
    message: "Invalid friend request status"
  })
})

app.post(
  "/api/remove/:chatId/:userId",
  async (req: RequestUser, res: Response) => {
    if (!req.params.userId) {
      res.status(400).json({
        message: "User id is required"
      })
      return
    }
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
    if (currentChat.type !== ChatType.Group) {
      res.status(400).json({
        message: "You cannot remove a user from this type of chat"
      })
      return
    }
    if (currentChat.owner === req.user.id && req.user.id === user.id) {
      res.status(400).json({
        message: "You cannot leave your own chat"
      })
      return
    }
    if (currentChat.owner !== req.user.id && req.user.id !== user.id) {
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
    const nextChat = req.user.id === user.id ? 1 : currentChat.id
    getChat(nextChat, req.user.id).then((chat) => {
      getChats(req.user.id).then((chats) => {
        res.json({ chat, chats })
      })
    })
  }
)

app.post("/api/feedback", async (req: RequestUser, res: Response) => {
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

app.post("/api/history", async (req: RequestUser, res: Response) => {
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
      include: [
        {
          attributes: ["status"],
          model: Friends,
          required: false,
          where: {
            userId: req.user.id
          }
        }
      ],
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

    if (
      !currentChat &&
      (otherUser.directMessages === "no one" ||
        (otherUser.directMessages === "friends" &&
          otherUser.friend?.status !== "accepted"))
    ) {
      res.status(400).json({
        message: "Cannot send direct message to this user"
      })
      return
    }

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

app.post("/api/read-new/:id", async (req: RequestUser, res: Response) => {
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
        limit: 1,
        model: Messages,
        order: [["id", "DESC"]]
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
  if (!chat.messages || chat.messages.length === 0) {
    return res.status(400).json({
      message: "No messages in this chat"
    })
  }
  await chat.association.update({
    lastRead: chat.messages[0].id,
    notifications: 0
  })
  return res.sendStatus(204)
})

app.post(
  "/api/upload",
  upload.single("attachment"),
  async (req: RequestUserFile, res: Response) => {
    if (req.user.id !== 1) {
      return res.status(400).json({
        message: "You don't have access to images"
      })
    }

    if (!req.file) {
      return res.status(400).json({
        message: "No files uploaded"
      })
    }

    await Uploads.create({
      fileName: req.file.filename,
      name: req.file.originalname,
      size: req.file.size,
      userId: req.user.id
    })

    return res.status(201).json({
      message: req.file.filename
    })
  }
)

app.post("/api/delete-passkey/:id", async (req: RequestUser, res: Response) => {
  if (!(await verifyPassword(req, res))) return

  const passkey = await Passkeys.findOne({
    where: {
      id: req.params.id,
      userId: req.user.id
    }
  })

  if (!passkey) {
    res.status(401).json({ message: "Passkey not found" })
    return
  }

  await passkey.destroy()

  res.sendStatus(204)
})

app.delete(
  "/api/delete/:messageId",
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

    if (message.userId !== req.user.id && !req.user.admin) {
      res.status(403).json({
        message: "Forbidden"
      })
      return
    }

    await message.destroy()

    await broadcastChatEvent(
      wss,
      message.chatId,
      {
        deleteMessage: {
          id: message.id
        }
      },
      req.user.id
    )

    res.sendStatus(204)
  }
)

app.delete(
  "/api/delete-chat/:chatId",
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
    if (currentChat.type === 2) {
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
    getChat(1, req.user.id).then((chat) => {
      getChats(req.user.id).then((chats) => {
        res.json({ chat, chats })
      })
    })
  }
)

app.delete(
  "/api/delete-feedback/:feedbackId",
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

app.delete("/api/clear-history", async (req: RequestUser, res: Response) => {
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
})

app.delete(
  "/api/delete-session/:id",
  async (req: RequestUser, res: Response) => {
    if (!(await verifyPassword(req, res))) return

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

app.patch("/api/edit-passkey/:id", async (req: RequestUser, res: Response) => {
  const passkeyName = req.body.passkeyName?.trim()

  if (!passkeyName) {
    res.status(400).json({ message: "Passkey name is missing" })
    return
  }

  if (passkeyName.length > 50) {
    res.status(400).json({ message: "Passkey name too long" })
    return
  }

  const passkey = await Passkeys.findOne({
    where: {
      id: req.params.id,
      userId: req.user.id
    }
  })

  if (!passkey) {
    res.status(401).json({ message: "Passkey not found" })
    return
  }

  await passkey.update({ name: passkeyName })

  res.json(passkeyName)
})

app.patch("/api/edit/:messageId", async (req: RequestUser, res: Response) => {
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

  if (messageText === message.messageContents) {
    res.status(304).json({ message: "No changes made" })
    return
  }

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
      },
      {
        attributes: ["emoji", "userId"],
        model: Reactions
      }
    ],
    where: {
      id: message.id
    }
  })

  await broadcastChatEvent(
    wss,
    message.chatId,
    { editMessage: editedMessage },
    req.user.id
  )

  res.json(editedMessage)
})

app.patch(
  "/api/edit-status-message",
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
    await broadcastUserEvent(wss, "changeUser", req.user, {
      excludeUserId: req.user.id
    })
    res.json({ statusMessage: req.user.statusMessage })
  }
)

app.patch("/api/score", (req: RequestUser, res: Response) => {
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

app.patch("/api/edit-chat/:chat", async (req: RequestUser, res: Response) => {
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
  await broadcastChatEvent(
    wss,
    chat.id,
    {
      editChat: {
        description: chat.description,
        icon: chat.icon,
        id: chat.id,
        latest: chat.latest,
        name: chat.name,
        owner: chat.owner,
        requireVerification: chat.requireVerification,
        type: chat.type
      }
    },
    req.user.id
  )
  chat.dataValues.messages = await Messages.findAll({
    include: [
      {
        as: "user",
        attributes: ["id", "username", "avatar"],
        model: Users
      },
      {
        attributes: ["emoji", "userId"],
        model: Reactions
      }
    ],
    where: { chatId: chat.id }
  })
  const parsedUserIds = getChatUserIds(req.body.users, req.user.id)
  const existingAssociations = await ChatAssociations.findAll({
    attributes: ["userId"],
    where: {
      chatId: chat.id,
      userId: parsedUserIds
    }
  })
  const existingUserIds = new Set(
    existingAssociations.map((association) => Number(association.userId))
  )
  await Promise.all(
    parsedUserIds.map(async (userId) => {
      if (existingUserIds.has(userId)) {
        return
      }
      const checkUser = await Users.findOne({
        where: {
          id: userId
        }
      })
      if (checkUser) {
        await ChatAssociations.create({
          chatId: chat.id,
          userId
        })
        await broadcastUserEvent(wss, "newUser", checkUser, {
          chatId: chat.id,
          excludeUserId: req.user.id
        })
        await Notifications.create({
          otherId: chat.id,
          type: 1,
          userId
        })
      }
    })
  )
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
  getChats(req.user.id).then((chats) => {
    res.json({ chat, chats })
  })
})

app.patch("/api/pin/:messageId", async (req: RequestUser, res: Response) => {
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
})

app.patch("/api/edit-username", async (req: RequestUser, res: Response) => {
  if (!validateUsername(req, res)) return
  if (req.body.username === req.user.username) {
    res.status(400).json({
      message: "Username is unchanged"
    })
    return
  }
  if (!(await verifyPassword(req, res))) return

  try {
    await req.user.update({ username: req.body.username })
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      res.status(400).json({
        message: "Username already taken"
      })
      return
    }
    throw err
  }

  res.json({
    username: req.body.username
  })
})

app.patch("/api/edit-key-pair", async (req: RequestUser, res: Response) => {
  if (!validatePublicKey(req, res)) return
  if (req.user.savePrivateKey) {
    if (!validatePrivateKey(req, res)) return
  }
  if (!(await verifyPassword(req, res))) return

  if (req.user.savePrivateKey) {
    await req.user.update({
      privateKey: req.body.privateKey,
      publicKey: req.body.publicKey
    })

    res.json({
      privateKey: req.body.privateKey,
      publicKey: req.body.publicKey
    })
  } else {
    await req.user.update({
      publicKey: req.body.publicKey
    })

    res.json({
      publicKey: req.body.publicKey
    })
  }
})

wss.on("connection", (ws: AuthWebSocket) => {
  console.log("Socket opened")

  ws.isAlive = true

  ws.on("error", console.error)

  ws.on("pong", () => {
    ws.isAlive = true
  })

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
        ws.close(3000, "Invalid token")
        return
      }

      if (session.expiresAt && session.expiresAt < new Date()) {
        await session.destroy()
        ws.send(JSON.stringify({ authFail: "Access denied. Token expired." }))
        ws.close(3000, "Token expired")
        return
      }

      ws.user = session.user
      ws.send(JSON.stringify({ authSuccess: "Token accepted." }))
      await session.user.update({ status: "online" })
      await broadcastUserEvent(wss, "changeUser", ws.user, {
        excludeUserId: ws.user.id
      })
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
          await broadcastUserEvent(wss, "changeUser", ws.user, {
            excludeUserId: ws.user.id
          })
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
      await broadcastUserEvent(wss, "changeUser", ws.user, {
        excludeUserId: ws.user.id
      })
    }
    console.log("Socket closed")
    ws.close()
  })
})

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const socket = ws as AuthWebSocket

    if (socket.isAlive === false) {
      socket.terminate()
      return
    }

    socket.isAlive = false
    socket.ping()
  })
}, 30000)

wss.on("close", () => {
  clearInterval(interval)
})

app.listen(port, async () => {
  await Users.update(
    {
      gameName: null,
      gameStatus: null,
      playingSince: null,
      status: "offline"
    },
    { where: {} }
  )

  console.log(`ElectricS01-Website-Backend listening on port ${port}`)
})
