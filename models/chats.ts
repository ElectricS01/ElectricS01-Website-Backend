import {
  Model,
  DataType,
  Column,
  Table,
  ForeignKey
} from "sequelize-typescript"
import Users from "./users"

@Table
export default class Chats extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  name!: string

  @Column(DataType.STRING)
  description!: string

  @Column(DataType.STRING)
  icon!: string

  @ForeignKey(() => Users)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  owner!: number

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false
  })
  requireVerification!: boolean

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  latest!: boolean
}
