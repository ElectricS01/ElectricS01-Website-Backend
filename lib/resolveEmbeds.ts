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

export const checkValidImage = async function (url: string): Promise<boolean> {
  if (!URL.canParse(url)) return false
  const linkURL = new URL(url)
  return !(await isBlacklisted(linkURL)) && (await isImage(linkURL))
}

const trimTrailingPunctuation = function (url: string) {
  let res = url
  const opens = [...url].filter((c) => c === "(").length
  let closes = [...url].filter((c) => c === ")").length

  while (res.length > 0) {
    const last = res.at(-1)!

    if (".,!?;:]".includes(last)) {
      res = res.slice(0, -1)
    } else if (last === ")" && closes > opens) {
      res = res.slice(0, -1)
      closes -= 1
    } else {
      return res
    }
  }

  return res
}

export default async function resolveEmbeds(message: Messages) {
  try {
    if (message.messageContents) {
      const regex = /https?:\/\/[^\s<>"']+/g
      let links: string[] | null = message.messageContents.match(regex)
      if (!links) return
      if (links.length > 3) links = links.slice(0, 3)
      if (links) {
        const promises = links.map(async (embedLink, i) => {
          const trimmedLink = trimTrailingPunctuation(embedLink)
          const linkURL = new URL(trimmedLink)
          if (await isBlacklisted(linkURL)) {
            return {
              embedLink: trimmedLink,
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
            embedLink: trimmedLink,
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
