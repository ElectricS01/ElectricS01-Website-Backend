import Reactions from "../models/reactions"
import ChatAssociations from "../models/chatAssociations"
import Chats from "../models/chats"
import Friends from "../models/friends"
import Messages from "../models/messages"
import Users from "../models/users"
import { ChatType } from "../types/chat"

export const getChatUserIds = function (users: unknown, currentUserId: number) {
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
        as: "ownerDetails",
        attributes: ["id", "username", "avatar"],
        model: Users
      },
      {
        as: "association",
        attributes: ["lastRead"],
        model: ChatAssociations,
        where: { userId }
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
        required: false
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
        where: { pinned: true }
      }
    ],
    where: {
      id: chatId
    }
  })
  if (!chat) {
    return null
  }
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
          "friendRequests",
          "encryption",
          "publicKey"
        ],
        include: [
          {
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
  chat.dataValues.users = chatAssociations.map((mapAssociation) =>
    chat.type === ChatType.Direct
      ? mapAssociation.user
      : {
          ...mapAssociation.user.get({ plain: true }),
          encryption: undefined,
          publicKey: undefined
        }
  )
  return chat
}

export const getChats = async function (userId: number) {
  const chats = await Chats.findAll({
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
        as: "ownerDetails",
        attributes: ["id", "username", "avatar"],
        model: Users
      },
      {
        as: "association",
        attributes: ["notifications"],
        model: ChatAssociations,
        where: { userId }
      }
    ]
  })
  return chats
}
