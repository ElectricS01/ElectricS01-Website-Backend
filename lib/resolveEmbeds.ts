import axios from "axios"
import cryptoRandomString from "crypto-random-string"
import net from "node:net"
import { lookup } from "node:dns/promises"
import ipaddr from "ipaddr.js"

import Messages from "../models/messages"

import blacklist from "./blacklist.json"

const isBlacklisted = async function (url: URL) {
  try {
    if (
      net.isIP(url.hostname) !== 0 ||
      (blacklist as string[]).includes(url.hostname)
    )
      return true

    const addresses = await lookup(url.hostname, {
      all: true,
      verbatim: true
    })

    for (const { address } of addresses) {
      const ip = ipaddr.parse(address)

      if (ip.range() !== "unicast") {
        return true
      }
    }

    return false
  } catch (e) {
    console.error(e)
    return true
  }
}

const isImage = async function (url: URL) {
  try {
    if (net.isIP(url.hostname) !== 0) {
      return false
    }

    if ((blacklist as string[]).includes(url.hostname)) {
      return false
    }

    const res = await axios.head(url.toString(), {
      headers: {
        "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)"
      },
      maxRedirects: 3,
      timeout: 5000
    })
    const contentType = String(res.headers["content-type"])
    return contentType.startsWith("image/")
  } catch (e) {
    console.error(e)
    return false
  }
}

export const checkImage = async function (url: string) {
  const linkURL = new URL(url)
  return isBlacklisted(linkURL) || (await isImage(linkURL))
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
          if (await isBlacklisted(linkURL)) {
            return {
              embedLink,
              openGraph: {
                ogDescription: "This link cannot be mediaproxied at this time.",
                ogTitle: "Blacklisted link"
              },
              type: "openGraph"
            }
          }

          if (!(await isImage(linkURL))) {
            return undefined
          }

          const securityToken = cryptoRandomString({ length: 32 })
          return {
            embedLink,
            mediaProxyLink: `/api/media-proxy/${message.id}/${i}/${securityToken}`,
            securityToken,
            type: "image"
          }
        })
        const embeds = (await Promise.all(promises)).filter(Boolean)
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
