import Reactions from "../models/reactions"
import ChatAssociations from "../models/chatAssociations"
import Chats from "../models/chats"
import Friends from "../models/friends"
import Messages from "../models/messages"
import Users from "../models/users"
import { ChatType } from "../types/chat"
import EncryptedMessageKeys from "../models/encryptedMessageKeys"

const encodeMessage = function (message: Messages) {
  return {
    ...message,

    ciphertext: message.ciphertext?.toString("base64") ?? undefined,
    encryptedMessageKey: undefined,
    messageKey: message.encryptedMessageKey
      ? {
          encryptedMessageKey:
            message.encryptedMessageKey.encryptedMessageKey.toString("base64"),
          nonce: message.encryptedMessageKey.nonce.toString("base64")
        }
      : undefined,
    nonce: message.nonce?.toString("base64") ?? undefined
  }
}

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
          },
          {
            attributes: ["encryptedMessageKey", "nonce"],
            model: EncryptedMessageKeys,
            required: false,
            where: { userId }
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
          },
          {
            attributes: ["emoji", "userId"],
            model: Reactions
          },
          {
            attributes: ["encryptedMessageKey", "nonce"],
            model: EncryptedMessageKeys,
            required: false,
            where: { userId }
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

  const result = chat.get({ plain: true })

  result.users = chatAssociations.map((association) =>
    chat.type === ChatType.Direct
      ? association.user.get({ plain: true })
      : {
          ...association.user.get({ plain: true }),
          encryption: undefined,
          publicKey: undefined
        }
  )

  result.messages = result.messages.map((message: Messages) =>
    encodeMessage(message)
  )

  result.pins = result.pins.map((pin: Messages) => encodeMessage(pin))

  return result
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
