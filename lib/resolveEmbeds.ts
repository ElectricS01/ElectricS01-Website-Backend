import axios from "axios"
import cryptoRandomString from "crypto-random-string"

import Messages from "../models/messages"

import blacklist from "./blacklist.json"

export const checkImage = async function (url: string) {
  try {
    const res = await axios.head(url, {
      headers: {
        "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)"
      },
      maxRedirects: 3,
      timeout: 5000
    })
    const contentType = String(res.headers["content-type"] ?? "")
    return contentType.startsWith("image/")
  } catch (e) {
    console.error(e)
    return false
  }
}

export default async function resolveEmbeds(message: Messages) {
  try {
    if (message.messageContents) {
      const regex = /(https?:\/\/\S+)/g
      let links: string[] | null = message.messageContents.match(regex)
      if (!links) return
      if (links.length > 3) links = links.slice(0, 3)
      if (links) {
        const promises = links.map(async (embedLink, i) => {
          const linkURL = new URL(embedLink)
          if ((blacklist as string[]).includes(linkURL.hostname)) {
            console.log(`Blacklisted link ${linkURL.hostname}`)
            return {
              embedLink,
              openGraph: {
                ogDescription: "This link cannot be mediaproxied at this time.",
                ogTitle: "Blacklisted link"
              },
              type: "openGraph"
            }
          }
          if (await checkImage(embedLink)) {
            const securityToken = cryptoRandomString({ length: 32 })
            return {
              embedLink,
              mediaProxyLink: `/api/media-proxy/${message.id}/${i}/${securityToken}`,
              securityToken,
              type: "image"
            }
          }
          return undefined
        })
        const embeds = await Promise.all(promises)
        await Messages.update(
          {
            embeds
          },
          {
            where: {
              id: message.id
            }
          }
        )
        return embeds
      }
    }
    return
  } catch (e) {
    console.log(e)
    return
  }
}
