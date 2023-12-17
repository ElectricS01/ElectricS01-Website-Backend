import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table
} from "sequelize-typescript"
import type { Embed } from "../types/embeds"
import Users from "./users"

@Table
export default class Messages extends Model {
  @ForeignKey(() => Users)
  @Column
  userId!: number

  @Column(DataType.TEXT)
  messageContents!: string

  @Column(DataType.JSON)
  embeds!: Embed[]

  @Column
  edited!: boolean

  @Column
  reply!: number

  @Column
  chatId!: number

  @Column({
    allowNull: false,
    defaultValue: false
  })
  pinned!: boolean

  @BelongsTo(() => Users)
  user!: Users
}
