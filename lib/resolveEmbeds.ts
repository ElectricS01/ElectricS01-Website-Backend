//Modified from https://github.com/Troplo/Colubrina/blob/main/backend/lib/resolveEmbeds.js
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
      const embeds = []
      for (const [i, link] of links?.entries()) {
        const linkURL = new URL(link)
        if ((blacklist as string[]).includes(linkURL.hostname)) {
          console.log(`Blacklisted link ${linkURL.hostname}`)
          embeds.push({
            link,
            openGraph: {
              ogDescription: "This link cannot be mediaproxied at this time.",
              ogTitle: "Blacklisted link"
            },
            type: "openGraph"
          })
          continue
        }
        await ogs({
          headers: {
            "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)"
          },
          url: link
        })
          .then((result: SuccessResult | ErrorResult) => {
            if (result?.result) {
              embeds.push({
                link,
                openGraph: result.result,
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
                    link,
                    mediaProxyLink: `/api/media-proxy/${message.id}/${i}/${securityToken}`,
                    securityToken,
                    type: "image"
                  })
                }
              })
              .catch((e: Error) => {
                console.log(e)
              })
          })
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
