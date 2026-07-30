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
  declare token: string

  @ForeignKey(() => Users)
  @Column({ allowNull: false })
  declare userId: number

  @Column
  declare userAgent: string

  @Column({ allowNull: false })
  declare expiresAt: Date

  @BelongsTo(() => Users)
  declare user: Users
}
