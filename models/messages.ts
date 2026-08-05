import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table
} from "sequelize-typescript"
import type { Embed } from "../types/embeds"
import Users from "./users"
import Chats from "./chats"
import Reactions from "./reactions"

@Table
export default class Messages extends Model {
  @ForeignKey(() => Users)
  @Column({ allowNull: false })
  declare userId: number

  @Column({
    allowNull: false,
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

  @BelongsTo(() => Users)
  declare user: Users

  @HasMany(() => Reactions)
  declare reactions: Reactions[]
}
