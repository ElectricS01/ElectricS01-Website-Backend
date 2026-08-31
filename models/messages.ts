import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasOne,
  HasMany,
  Model,
  Table
} from "sequelize-typescript"
import type { Embed } from "../types/embeds"
import Users from "./users"
import Chats from "./chats"
import Reactions from "./reactions"
import EncryptedMessageKeys from "./encryptedMessageKeys"

@Table
export default class Messages extends Model {
  @ForeignKey(() => Users)
  @Column({ allowNull: false })
  declare userId: number

  @Column({
    type: DataType.TEXT
  })
  declare messageContents: string

  @Column(DataType.JSON)
  declare embeds: Embed[]

  @Column
  declare edited: boolean

  @Column
  declare reply: number

  @ForeignKey(() => Chats)
  @Column
  declare chatId: number

  @Column({
    allowNull: false,
    defaultValue: false
  })
  declare pinned: boolean

  @Column({
    allowNull: true,
    type: DataType.BLOB
  })
  declare ciphertext: Buffer | null

  @Column({
    allowNull: true,
    type: DataType.BLOB
  })
  declare nonce: Buffer | null

  @BelongsTo(() => Users)
  declare user: Users

  @HasOne(() => EncryptedMessageKeys, {
    as: "encryptedMessageKey",
    foreignKey: "messageId"
  })
  declare encryptedMessageKey: EncryptedMessageKeys

  @HasMany(() => Reactions)
  declare reactions: Reactions[]
}
