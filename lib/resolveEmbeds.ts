//Modified from https://github.com/Troplo/Colubrina/blob/main/backend/lib/resolveEmbeds.js
import Messages from "../models/messages"
import { AxiosResponse } from "axios"
import axios from "axios"
import cryptoRandomString from "crypto-random-string"
import ogs, { ErrorResult, SuccessResult } from "open-graph-scraper"
import blacklist from "./blacklist.json"
export default async function (message: Messages) {
  try {
    if (message.messageContents) {
      const regex = /(https?:\/\/\S+)/g
      let links: string[] = message.messageContents.match(regex) || []
      if (links.length > 3) {
        links = links.slice(0, 3)
      }
      const embeds = []
      if (links) {
        for (const [i, link] of links.entries()) {
          const linkURL = new URL(link)
          if ((blacklist as string[]).includes(linkURL.hostname)) {
            console.log(`Blacklisted link ${linkURL.hostname}`)
            embeds.push({
              link,
              type: "openGraph",
              openGraph: {
                ogTitle: "Blacklisted link",
                ogDescription: "This link cannot be mediaproxied at this time."
              }
            })
            continue
          }
          await ogs({
            url: link,
            headers: {
              "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)"
            }
          })
            .then((result: SuccessResult | ErrorResult) => {
              if (result?.result) {
                embeds.push({
                  openGraph: result.result,
                  link,
                  type: "openGraph"
                })
              }
            })
            .catch(async () => {
              await axios
                .get(link, {
                  headers: {
                    "user-agent":
                      "Googlebot/2.1 (+http://www.google.com/bot.html)"
                  }
                })
                .then((res: AxiosResponse) => {
                  // If content type is image
                  if (res.headers["content-type"].startsWith("image/")) {
                    const securityToken = cryptoRandomString({ length: 32 })
                    embeds.push({
                      type: "image",
                      link,
                      securityToken,
                      mediaProxyLink: `/api/media-proxy/${message.id}/${i}/${securityToken}`
                    })
                  }
                })
                .catch((e: Error) => {
                  console.log(e)
                })
            })
        }
      }
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
    return
  } catch (e) {
    console.log(e)
    return
  }
}
