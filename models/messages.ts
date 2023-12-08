import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table
} from "sequelize-typescript"
import { Embed } from "../types/embeds"
import Users from "./users"

@Table
export default class Messages extends Model {
  @ForeignKey(() => Users)
  @Column(DataType.STRING)
  userId!: string

  @Column(DataType.TEXT)
  messageContents!: string

  @Column(DataType.JSON)
  embeds!: Embed[]

  @Column(DataType.BOOLEAN)
  edited!: boolean

  @Column(DataType.INTEGER)
  reply!: number

  @Column(DataType.INTEGER)
  chatId!: number

  @BelongsTo(() => Users)
  user!: Users
}
