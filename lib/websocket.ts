import { WebSocket, WebSocketServer } from "ws"

import { AuthWebSocket } from "types/sockets"

import ChatAssociations from "../models/chatAssociations"
import Friends from "../models/friends"
import Users from "../models/users"

// Sends the provided event payload to all users in a chat
export const broadcastChatEvent = async function (
  wss: WebSocketServer,
  chatId: number,
  payload: Record<string, unknown>,
  excludeUserId?: number
) {
  const chatAssociations = await ChatAssociations.findAll({
    where: { chatId }
  })

  const recipientIds = new Set(
    chatAssociations.map((association) => association.userId)
  )

  if (recipientIds.size === 0) {
    return
  }

  wss.clients.forEach((wsClient) => {
    const { user } = wsClient as AuthWebSocket

    if (!user) {
      return
    }

    if (excludeUserId !== undefined && user.id === excludeUserId) {
      return
    }

    if (!recipientIds.has(user.id)) {
      return
    }

    wsClient.send(JSON.stringify(payload))
  })
}

// Sends a changeUser or newUser event to every user (or to a chatId if provided)
export const broadcastUserEvent = async function (
  wss: WebSocketServer,
  eventName: "changeUser" | "newUser",
  user: Users,
  options?: {
    chatId?: number
    excludeUserId?: number
  }
) {
  const recipientIds =
    eventName === "newUser" &&
    options?.chatId !== undefined &&
    options.chatId !== 1
      ? new Set(
          (
            await ChatAssociations.findAll({
              attributes: ["userId"],
              where: { chatId: options.chatId }
            })
          ).map((association) => association.userId)
        )
      : null

  if (recipientIds && recipientIds.size === 0) {
    return
  }

  const sendPromises = Array.from(wss.clients).map(
    async (wsClient: WebSocket) => {
      const recipient = (wsClient as AuthWebSocket).user

      if (!recipient) {
        return
      }

      if (
        options?.excludeUserId !== undefined &&
        recipient.id === options.excludeUserId
      ) {
        return
      }

      if (recipientIds && !recipientIds.has(recipient.id)) {
        return
      }

      const friend = await Friends.findOne({
        where: {
          friendId: user.id,
          userId: recipient.id
        }
      })

      wsClient.send(
        JSON.stringify({
          [eventName]: {
            avatar: user.avatar,
            chatId: options?.chatId,
            friend: { status: friend?.status },
            friendRequests: user.friendRequests,
            gameName: user.gameName,
            gameStatus: user.gameStatus,
            id: user.id,
            playingSince: user.playingSince,
            status: user.status,
            statusMessage: user.statusMessage,
            username: user.username
          }
        })
      )
    }
  )

  await Promise.all(sendPromises)
}
