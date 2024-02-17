import axios, { AxiosResponse } from "axios"
import cryptoRandomString from "crypto-random-string"
import ogs, { ErrorResult, SuccessResult } from "open-graph-scraper"

import Messages from "../models/messages"

import blacklist from "./blacklist.json"
export default async function resolveEmbeds(message: Messages) {
  try {
    if (message.messageContents) {
      const regex = /(https?:\/\/\S+)/g
      let links: string[] | null = message.messageContents.match(regex)
      if (!links) return
      if (links.length > 3) links = links.slice(0, 3)
      if (links) {
        const promises = links.map(async (embedLink, i) => {
          let embed: object = {}
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
          await ogs({
            fetchOptions: {
              headers: {
                "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)"
              }
            },
            url: embedLink
          })
            .then((result: SuccessResult | ErrorResult) => {
              if (result?.result) {
                embed = {
                  embedLink,
                  openGraph: result.result,
                  type: "openGraph"
                }
              }
            })
            .catch(async () => {
              await axios
                .get(embedLink, {
                  headers: {
                    "user-agent":
                      "Googlebot/2.1 (+http://www.google.com/bot.html)"
                  }
                })
                .then((res: AxiosResponse) => {
                  // If content type is image
                  if (res.headers["content-type"].startsWith("image/")) {
                    const securityToken = cryptoRandomString({ length: 32 })
                    embed = {
                      embedLink,
                      mediaProxyLink: `/api/media-proxy/${message.id}/${i}/${securityToken}`,
                      securityToken,
                      type: "image"
                    }
                  }
                })
                .catch((e: Error) => {
                  console.log(e)
                })
            })
          return embed
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
