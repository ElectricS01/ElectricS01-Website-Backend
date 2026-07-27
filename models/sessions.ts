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
  @Column({ allowNull: false })
  token!: string

  @ForeignKey(() => Users)
  @Column({ allowNull: false })
  userId!: number

  @Column
  userAgent!: string

  @Column({ allowNull: false })
  expiresAt!: Date

  @BelongsTo(() => Users)
  user!: Users
}
