import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table
} from "sequelize-typescript"
import Users from "./users"
import Messages from "./messages"

@Table({ updatedAt: false })
export default class Reactions extends Model {
  @ForeignKey(() => Messages)
  @Column({
    allowNull: false
  })
  messageId!: number

  @ForeignKey(() => Users)
  @Column({
    allowNull: false
  })
  userId!: number

  @Column({
    allowNull: false,
    type: DataType.STRING
  })
  emoji!: string
}
