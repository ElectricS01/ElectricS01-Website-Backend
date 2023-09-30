import {
  Model,
  Table,
  Column,
  ForeignKey,
  BelongsTo
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
}