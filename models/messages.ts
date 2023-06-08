import {
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
  Column,
  Table
} from "sequelize-typescript"
import Users from "./users"
import { Embed } from "../types/embeds"

@Table
export default class Messages extends Model {
  @ForeignKey(() => Users)
  @Column(DataType.STRING)
  userName!: string

  @Column(DataType.STRING)
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
