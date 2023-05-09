//Modified from https://github.com/Troplo/Colubrina/blob/main/backend/lib/resolveEmbeds.js
import { Request } from "express"
import Messages from "../models/messages"
import { AxiosResponse } from "axios"
const axios = require("axios")
const ogs = require("open-graph-scraper")
const cryptoRandomString = require("crypto-random-string")
const blacklist = require("./blacklist.json")
export default async function (req: Request, message: Messages) {
  return new Promise(async (resolve, reject) => {
    try {
      if (message.messageContents) {
        const regex = /(https?:\/\/\S+)/g
        let links: string[] = message.messageContents.match(regex) || []
        if (!links?.length) return
        if (links && links.length > 3) {
          links = links.slice(0, 3)
        }
        let embeds = []
        if (links) {
          for (let [i, link] of links.entries()) {
            const linkURL = new URL(link)
            if (blacklist.includes(linkURL.hostname)) {
              console.log("Blacklisted link " + linkURL.hostname)
              embeds.push({
                link: link,
                type: "openGraph",
                openGraph: {
                  ogTitle: "Blacklisted link",
                  ogDescription:
                    "This link cannot be mediaproxied at this time."
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
              .then(({ result }: any) => {
                if (result) {
                  embeds.push({
                    openGraph: result,
                    link: link,
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
                    // if content type is image
                    if (res.headers["content-type"].startsWith("image/")) {
                      const securityToken = cryptoRandomString({ length: 32 })
                      embeds.push({
                        type: "image",
                        link: link,
                        securityToken,
                        mediaProxyLink:
                          "/api/mediaproxy/" +
                          message.id +
                          "/" +
                          i +
                          "/" +
                          securityToken
                      })
                    }
                  })
                  .catch(() => {})
              })
          }
          await Messages.update(
            {
              embeds: embeds
            },
            {
              where: {
                id: message.id
              }
            }
          )
          resolve(embeds)
        } else {
          reject()
        }
      } else {
        reject()
      }
    } catch (err) {
      console.log(err)
    }
  })
}
