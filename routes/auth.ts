import { Request, Response, Router } from "express"
import argon2 from "argon2"
import * as OTPAuth from "otpauth"
import cryptoRandomString from "crypto-random-string"
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from "@simplewebauthn/server"

import { getChats } from "../lib/chat"
import sendVerificationEmail from "../lib/emails"
import { createSession } from "../lib/auth"

import Users from "../models/users"
import Notifications from "../models/notifications"
import Scores from "../models/scores"
import Passkeys from "../models/passkeys"
import ChatAssociations from "../models/chatAssociations"

import { FIVE_MINUTES, rpID, origin, challenges } from "../index"
import {
  validateEmail,
  validatePassword,
  validatePrivateKey,
  validatePublicKey,
  validateString,
  validateUsername
} from "../lib/validator"

const router = Router()

router.get("/passkey-challenge", async (_: Request, res: Response) => {
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred"
  })

  const challengeId = cryptoRandomString({ length: 16 })
  challenges.push({
    challenge: options.challenge,
    id: challengeId,
    timestamp: Date.now(),
    userId: 0
  })

  res.json({
    challengeId,
    options
  })
})

router.post("/login", async (req: Request, res: Response) => {
  if (!validateUsername(req, res)) return
  if (!validatePassword(req, res)) return

  const user = await Users.findOne({
    where: {
      username: req.body.username
    }
  })
  if (!user) {
    res.status(401).json({ message: "User not found" })
    return
  }
  if (!(await argon2.verify(user.password, req.body.password))) {
    res.status(401).json({ message: "Incorrect password" })
    return
  }
  if (user.otpVerified) {
    const totp = new OTPAuth.TOTP({
      algorithm: "SHA256",
      secret: user.otpSecret
    })
    if (totp.validate({ token: req.body.token, window: 1 }) === null) {
      res.status(401).json({ message: "2FA code is invalid" })
      return
    }
  }

  const session = await createSession(
    user.id,
    req.body.userAgent || req.headers["user-agent"] || "Unknown"
  )

  const notifications = await Notifications.findAll({
    where: {
      userId: user.id
    }
  })
  const tetris = await Scores.findAll({
    where: {
      userId: user.id
    }
  })
  getChats(user.id).then((chatsList) => {
    res.json({
      chatsList,
      notifications,
      tetris,
      token: session.token,
      ...user.toJSON(),
      emailToken: undefined,
      otpSecret: undefined,
      password: undefined,
      privateKey: user.savePrivateKey ? user.privateKey : undefined,
      sessionId: session.id,
      updatedAt: undefined
    })
  })
})

router.post("/register", async (req: Request, res: Response) => {
  if (!validateUsername(req, res)) return
  if (!validateEmail(req, res)) return
  if (!validatePassword(req, res)) return

  if (typeof req.body.savePrivateKey === "boolean" && req.body.savePrivateKey) {
    if (!validatePublicKey(req, res)) return
    if (!validatePrivateKey(req, res)) return
  } else {
    req.body.savePrivateKey = false
    req.body.publicKey = undefined
    req.body.privateKey = undefined
  }

  if (
    await Users.findOne({
      where: {
        username: req.body.username
      }
    })
  ) {
    res.status(400).json({
      message: "Username is taken"
    })
    return
  }
  if (
    await Users.findOne({
      where: {
        email: req.body.email
      }
    })
  ) {
    res.status(400).json({
      message: "Email is taken"
    })
    return
  }
  const user = await Users.create({
    email: req.body.email,
    emailToken: cryptoRandomString({
      length: 128
    }),
    password: await argon2.hash(req.body.password),
    privateKey: req.body.privateKey,
    publicKey: req.body.publicKey,
    savePrivateKey: req.body.savePrivateKey,
    username: req.body.username
  })

  await sendVerificationEmail(user.email, user.username, user.emailToken)

  const session = await createSession(
    user.id,
    req.body.userAgent || req.headers["user-agent"] || "Unknown"
  )

  await ChatAssociations.create({
    chatId: 1,
    userId: user.id
  })

  getChats(user.id).then((chatsList) => {
    res.json({
      chatsList,
      token: session.token,
      ...user.toJSON(),
      emailToken: undefined,
      otpSecret: undefined,
      password: undefined,
      privateKey: undefined,
      sessionId: session.id,
      updatedAt: undefined
    })
  })
})

router.post("/reset-password", async (req: Request, res: Response) => {
  if (!validateEmail(req, res)) return

  const user = await Users.findOne({
    where: {
      email: req.body.email
    }
  })
  if (!user) {
    res.status(401).json({
      message: "Email does not exist"
    })
    return
  }
  res.status(500).json({
    message: "This feature is unavailable right now"
  })
  return
})

router.post("/verify-passkey", async (req: Request, res: Response) => {
  if (!req.body.challengeId) {
    res.status(400).json({ message: "Challenge ID missing" })
    return
  }

  const challengeIndex = challenges.findIndex(
    (c) => c.id === req.body.challengeId
  )

  if (challengeIndex === -1) {
    res.status(400).json({
      message: "Challenge not found or expired"
    })
    return
  }

  const challengeData = challenges[challengeIndex]

  if (Date.now() - challengeData.timestamp > FIVE_MINUTES) {
    challenges.splice(challengeIndex, 1)
    res.status(400).json({
      message: "Challenge expired"
    })
    return
  }

  challenges.splice(challengeIndex, 1)

  const passkey = await Passkeys.findOne({
    include: [Users],
    where: {
      credentialID: req.body.id
    }
  })

  if (!passkey) {
    res.status(400).json({ message: "Passkey not found" })
    return
  }

  /* eslint-disable-next-line init-declarations */
  let verification
  try {
    verification = await verifyAuthenticationResponse({
      credential: {
        counter: Number(passkey.counter),
        id: passkey.credentialID,
        publicKey: Buffer.from(passkey.credentialPublicKey, "base64url"),
        transports: passkey.transports
          ? JSON.parse(passkey.transports)
          : undefined
      },
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      response: req.body
    })
  } catch (error) {
    console.error("Verification error:", error)
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
      message: "Verification failed"
    })
    return
  }

  if (!verification.verified) {
    res.status(400).json({ message: "Verification failed" })
    return
  }

  await passkey.update({
    counter: verification.authenticationInfo.newCounter
  })

  const session = await createSession(
    passkey.user.id,
    req.body.userAgent || req.headers["user-agent"] || "Unknown"
  )

  const notifications = await Notifications.findAll({
    where: { userId: passkey.user.id }
  })

  const tetris = await Scores.findAll({
    where: { userId: passkey.user.id }
  })

  const chatsList = await getChats(passkey.user.id)

  res.json({
    chatsList,
    notifications,
    tetris,
    verified: true,
    ...passkey.user.toJSON(),
    emailToken: undefined,
    otpSecret: undefined,
    password: undefined,
    privateKey: undefined,
    token: session.token,
    updatedAt: undefined
  })
})

export default router
