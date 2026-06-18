import Reactions from "../models/reactions"
import ChatAssociations from "../models/chatAssociations"
import Chats from "../models/chats"
import Friends from "../models/friends"
import Messages from "../models/messages"
import Users from "../models/users"

export const getChatUserIds = function (
  users: unknown,
  currentUserId: number
) {
  if (!Array.isArray(users)) {
    return []
  }

  return [
    ...new Set(
      users
        .map((rawUserId: number | string) =>
          Number.parseInt(String(rawUserId), 10)
        )
        .filter(
          (userId: number) => !Number.isNaN(userId) && userId !== currentUserId
        )
    )
  ]
}

export const getChat = async function (chatId: number, userId: number) {
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
          },
          {
            attributes: ["emoji", "userId"],
            model: Reactions
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

export const getChats = async function (userId: number) {
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
