const express = require("express")
const app = express()
const port = 24555
const {
  Messages,
  Users,
  Sessions,
  Friends,
  Feedback,
  Chats,
  ChatAssociations
} = require("./models")
const rateLimit = require("express-rate-limit")
const argon2 = require("argon2")
const cryptoRandomString = require("crypto-random-string")
const auth = require("./lib/auth")
const resolveEmbeds = require("./lib/resolveEmbeds")
const nodemailerLibrary = require("./lib/mailer")
const axios = require("axios")
const config = require(__dirname + "/config/main.json")

const emailLibrary = new nodemailerLibrary()
const limiter = rateLimit({
  windowMs: 5000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests, SLOW DOWN!!!"
  }
})

async function getChat(chatId, userId) {
  const chat = await Chats.findOne({
    where: {
      id: chatId
    }
  })
  if (!chat) {
    return null
  }
  chat.dataValues.messages = await Messages.findAll({
    where: { chatId: chatId },
    include: [
      {
        model: Users,
        as: "user",
        attributes: ["id", "username", "avatar"]
      }
    ]
  })
  const chatAssociations = await ChatAssociations.findAll({
    where: { chatId: chatId },
    include: [
      {
        model: Users,
        as: "user",
        attributes: [
          "id",
          "username",
          "avatar",
          "status",
          "statusMessage",
          "friendRequests"
        ]
      }
    ]
  })
  let users = chatAssociations.map((association) => association.user)
  if (users.length === 0) {
    users = users = await Users.findAll({
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
          model: Friends,
          as: "friend",
          required: false,
          where: {
            userId: userId
          },
          attributes: ["status"]
        }
      ]
    })
  }
  chat.dataValues.users = users
  return chat
}

async function getChats(userId) {
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
        model: ChatAssociations,
        as: "associations",
        where: { userId: userId },
        attributes: []
      },
      {
        model: Users,
        as: "ownerDetails",
        attributes: ["id", "username", "avatar"]
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

async function checkImage(url) {
  try {
    const response = await axios.head(url)
    const contentType = response.headers["content-type"]
    return contentType.startsWith("image/")
  } catch (error) {
    // Handle request error (e.g., URL is invalid or inaccessible)
    console.error("Error occurred:", error.message)
    return false
  }
}

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

app.get("/api/messages/:chatId", auth, async (req, res) => {
  if (!req.params.chatId) {
    return res.status(400).json({
      message: "Missing chatId"
    })
  }
  const messages = await Messages.findAll({
    where: { chatId: req.params.chatId },
    include: [
      {
        model: Users,
        as: "user",
        attributes: ["id", "username", "avatar"]
      }
    ]
  })
  return res.json(messages)
})

app.get("/api/chat/:chatId", auth, async (req, res) => {
  await getChat(req.params.chatId, req.user.id).then((chat) => {
    if (chat) {
      return res.json(chat)
    } else {
      return res.status(400).json({
        message: "Chat does not exist"
      })
    }
  })
})

app.get("/api/users", auth, async (res) => {
  const users = await Users.findAll({
    attributes: ["id", "username", "avatar", "status", "statusMessage"]
  })
  res.json(users)
})

app.get("/api/chats", auth, async (req, res) => {
  getChats(req.user.id).then((chats) => {
    res.json(chats)
  })
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
  if (!parseInt(req.params.userId)) {
    res.status(400)
    res.json({
      message: "User requested does not exist"
    })
    return
  }
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
        },
        attributes: ["status"]
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
    if (!req.body.chatId) {
      res.status(400)
      res.json({
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
      res.status(400)
      res.json({
        message: "Chat does not exist"
      })
      return
    }
    if (chat.requireVerification && !req.user.emailVerified) {
      res.status(400)
      res.json({
        message: "User not verified"
      })
      return
    }
    const messageText = req.body.messageContents.trim()
    const replyMessage = req.body?.reply
    if (messageText) {
      const message = await Messages.create({
        messageContents: messageText,
        userName: req.user.id,
        reply: replyMessage,
        chatId: req.body.chatId
      })
      resolveEmbeds(req, message).catch(async () => {})
      await chat.update({
        latest: Date.now()
      })
      chat.dataValues.messages = await Messages.findAll({
        where: { chatId: req.body.chatId },
        include: [
          {
            model: Users,
            as: "user",
            attributes: ["id", "username", "avatar"]
          }
        ]
      })
      const chatAssociations = await ChatAssociations.findAll({
        where: { chatId: req.body.chatId },
        include: [
          {
            model: Users,
            as: "user",
            attributes: ["id", "username", "avatar", "status", "statusMessage"]
          }
        ]
      })
      let users = chatAssociations.map((association) => association.user)
      if (users.length === 0) {
        users = users = await Users.findAll({
          attributes: ["id", "username", "avatar", "status", "statusMessage"]
        })
      }
      chat.dataValues.users = users
      getChats(req.user.id).then((chats) => {
        const data = { chat, chats }
        res.json(data)
      })
    }
  } catch (e) {
    res.status(500)
    res.json({
      message: "Something went wrong" + e
    })
  }
})

app.post("/api/create-chat", auth, async (req, res) => {
  if (!req.body.name) {
    res.status(400)
    res.json({
      message: "Chat name not specified"
    })
    return
  }
  if (typeof req.body.requireVerification !== "boolean") {
    res.status(400)
    res.json({
      message: "requireVerification not specified"
    })
    return
  }
  if (req.body.requireVerification === true && !req.user.emailVerified) {
    res.status(400)
    res.json({
      message: "You are not verified"
    })
    return
  }
  if (req.body.icon && !req.body.icon.match(/(https?:\/\/\S+)/g)) {
    res.status(400)
    res.json({
      message: "Icon is not a valid URL"
    })
    return
  }
  if (req.body.name.length > 30) {
    res.status(400)
    res.json({
      message: "Chat name too long"
    })
    return
  }
  if (req.body.description.length > 500) {
    res.status(400)
    res.json({
      message: "Chat description too long"
    })
    return
  }
  if (!req.user.admin) {
    res.status(403)
    res.json({
      message: "Forbidden"
    })
    return
  }
  const chat = await Chats.create({
    name: req.body.name,
    description: req.body.description,
    icon: req.body.icon,
    owner: req.user.id,
    requireVerification: req.body.requireVerification,
    latest: Date.now()
  })
  await ChatAssociations.create({
    chatId: chat.id,
    userId: req.user.id,
    type: "Owner"
  })
  getChat(chat.id, req.user.id).then((chat) => {
    getChats(req.user.id).then((chats) => {
      const data = { chat, chats }
      res.json(data)
    })
  })
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
          email: req.body.email
        }
      })
    ) {
      res.status(400)
      res.json({
        message: "Email is taken"
      })
      return
    }
    const user = await Users.create({
      username: req.body.username,
      password: await argon2.hash(req.body.password),
      email: req.body.email,
      emailToken: cryptoRandomString({
        length: 128
      })
    })
    emailLibrary
      .sendEmail(
        "support@electrics01.com",
        req.body.email,
        "Hi " + user.username + ", Verify your email address",
        "Hi " +
          user.username +
          ",\nPlease click the link below to verify your email address:\nhttps://electrics01.com/verify?token=" +
          user.emailToken +
          "\n\nIf you did not request this email, please ignore it.\n\nThanks,\nElectrics01 Support Team"
      )
      .catch((error) => {
        console.log("Error occurred while sending email:", error)
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
  const properties = [
    "directMessages",
    "friendRequests",
    "showCreated",
    "avatar",
    "description",
    "banner"
  ]
  if (!user || !properties.includes(req.body.prop)) {
    res.status(400)
    res.json({
      message: "No property selected"
    })
    return
  }
  if (
    ((req.body.prop === "avatar" || req.body.prop === "banner") &&
      req.body.val &&
      !(await checkImage(req.body.val))) ||
    ((req.body.prop === "avatar" ||
      req.body.prop === "banner" ||
      req.body.prop === "description") &&
      !req.body.val)
  ) {
    return res.status(400).json({
      message: "Invalid image"
    })
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

app.post("/api/remove/:chatId/:userId", auth, async (req, res) => {
  const user = await Users.findOne({
    where: {
      id: req.params.userId
    }
  })
  const chat = await Chats.findOne({
    where: {
      id: req.params.chatId
    }
  })
  if (!user || !chat) {
    return res.status(400).json({
      message: "This user or chat does not exist"
    })
  }
  if (chat.owner !== req.user.id) {
    return res.status(400).json({
      message: "You are not allowed to remove this user"
    })
  }
  const association = await ChatAssociations.findOne({
    where: {
      chatId: chat.id,
      userId: user.id
    }
  })
  if (!association) {
    return res.status(400).json({
      message: "This user is not in this chat"
    })
  }
  await ChatAssociations.destroy({
    where: {
      id: association.id
    }
  })
  getChat(chat.id, req.user.id).then((chat) => {
    getChats(req.user.id).then((chats) => {
      const data = { chat, chats }
      res.json(data)
    })
  })
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
    userId: user.id
  })
  return res.sendStatus(204)
})

app.post("/api/resend-verification", auth, async (req, res) => {
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
      "Hi " + user.username + ", Verify your email address",
      "Hi " +
        user.username +
        ",\nPlease click the link below to verify your email address:\nhttps://electrics01.com/verify?token=" +
        user.emailToken +
        "\n\nIf you did not request this email, please ignore it.\n\nThanks,\nElectrics01 Support Team"
    )
    .catch((error) => {
      console.log("Error occurred while sending email:", error)
    })
  return res.sendStatus(204)
})

app.post("/api/verify", auth, async (req, res) => {
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
    emailVerified: true,
    emailToken: false
  })
  return res.sendStatus(204)
})

app.post("/api/direct-message/:userId", auth, async (req, res) => {
  if (!req.params.userId) {
    res.status(400)
    res.json({
      message: "User id is required"
    })
    return
  }
  if (req.params.userId === req.user.id.toString()) {
    res.status(400)
    res.json({
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
    res.status(400)
    res.json({
      message: "User does not exist"
    })
    return
  }
  const currentChat =
    (await Chats.findOne({
      where: {
        owner: req.user.id,
        name: otherUser.username
      }
    })) ||
    (await Chats.findOne({
      where: {
        owner: otherUser.id,
        name: req.user.username
      }
    }))
  if (currentChat) {
    getChat(currentChat.id, req.user.id).then((chat) => {
      getChats(req.user.id).then((chats) => {
        const data = { chat, chats }
        res.json(data)
      })
    })
  } else {
    const otherUser = await Users.findOne({
      where: {
        id: req.params.userId
      }
    })
    if (!otherUser) {
      res.status(400)
      res.json({
        message: "User does not exist"
      })
      return
    }
    const createChat = await Chats.create({
      name: otherUser.username,
      icon: otherUser.avatar,
      owner: req.user.id,
      requireVerification: false,
      latest: Date.now(),
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
        const data = { chat, chats }
        res.json(data)
      })
    })
  }
})

app.delete("/api/delete/:messageId", auth, async (req, res) => {
  const message = await Messages.findOne({
    where: {
      id: req.params.messageId
    }
  })
  if (!message) {
    res.status(400)
    res.json({
      message: "Message does not exist"
    })
    return
  }
  const where = req.user.admin
    ? { id: req.params.messageId }
    : { id: req.params.messageId, userName: req.user.id }
  await Messages.destroy({ where })
  const messages = await Messages.findAll({
    where: { chatId: message.chatId },
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

app.delete("/api/delete-chat/:chatId", auth, async (req, res) => {
  const currentChat = await Chats.findOne({
    where: {
      id: req.params.chatId
    }
  })
  if (!currentChat) {
    res.status(400)
    res.json({
      message: "Chat does not exist"
    })
    return
  }
  if (currentChat.id === 1) {
    res.status(400)
    res.json({
      message: "Cannot delete this chat"
    })
    return
  }
  if (currentChat.owner !== req.user.id) {
    res.status(403)
    res.json({
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
      const data = { chat, chats }
      res.json(data)
    })
  })
})

app.delete("/api/delete-feedback/:feedbackId", auth, async (req, res) => {
  if (!req.user.admin) {
    res.status(403)
    res.json({
      message: "Forbidden"
    })
    return
  }
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
  return res.sendStatus(204)
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
    resolveEmbeds(req, message)
      .then(async () => {
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
      .catch(async () => {})
  }
})

app.patch("/api/edit-status-message", auth, async (req, res) => {
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
  const users = await Users.findAll({
    attributes: ["id", "username", "avatar", "status", "statusMessage"]
  })
  const data = {
    users,
    statusMessage: user.statusMessage
  }
  res.json(data)
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

app.patch("/api/edit-chat/:chat", auth, async (req, res) => {
  const chat = await Chats.findOne({
    where: {
      id: req.params.chat
    }
  })
  if (!chat) {
    res.status(400)
    res.json({
      message: "Chat does not exist"
    })
    return
  }
  if (chat.owner !== req.user.id) {
    res.status(403)
    res.json({
      message: "Forbidden"
    })
    return
  }
  if (!req.body.name) {
    res.status(400)
    res.json({
      message: "Chat name not specified"
    })
    return
  }
  if (typeof req.body.requireVerification !== "boolean") {
    res.status(400)
    res.json({
      message: "requireVerification not specified"
    })
    return
  }
  if (req.body.requireVerification === true && !req.user.emailVerified) {
    res.status(400)
    res.json({
      message: "You are not verified"
    })
    return
  }
  if (req.body.icon && !req.body.icon.match(/(https?:\/\/\S+)/g)) {
    res.status(400)
    res.json({
      message: "Icon is not a valid URL"
    })
    return
  }
  if (req.body.name.length > 30) {
    res.status(400)
    res.json({
      message: "Chat name too long"
    })
    return
  }
  if (req.body.description.length > 500) {
    res.status(400)
    res.json({
      message: "Chat description too long"
    })
    return
  }
  await chat.update({
    name: req.body.name,
    description: req.body.description,
    icon: req.body.icon,
    requireVerification: req.body.requireVerification
  })
  chat.dataValues.messages = await Messages.findAll({
    where: { chatId: req.params.chat },
    include: [
      {
        model: Users,
        as: "user",
        attributes: ["id", "username", "avatar"]
      }
    ]
  })
  for (let user of req.body.users) {
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
  }
  const chatAssociations = await ChatAssociations.findAll({
    where: { chatId: req.params.chat },
    include: [
      {
        model: Users,
        as: "user",
        attributes: ["id", "username", "avatar", "status", "statusMessage"]
      }
    ]
  })
  let users = chatAssociations.map((association) => association.user)
  if (users.length === 0) {
    users = users = await Users.findAll({
      attributes: ["id", "username", "avatar", "status", "statusMessage"]
    })
  }
  chat.dataValues.users = users
  getChats(req.user.id).then((chats) => {
    const data = { chat, chats }
    res.json(data)
  })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
