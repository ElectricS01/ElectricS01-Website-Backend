import {
  BelongsTo,
  Column,
  ForeignKey,
  Model,
  Table
} from "sequelize-typescript"
import Users from "../models/users"

@Table
export default class Sessions extends Model {
  @Column
  token!: string

  @ForeignKey(() => Users)
  @Column
  userId!: number

  @BelongsTo(() => Users)
  user!: Users

  @Column
  expiredAt!: Date

  @Column
  userAgent!: string
}
