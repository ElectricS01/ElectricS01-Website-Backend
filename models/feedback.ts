import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table
} from "sequelize-typescript"
import Users from "./users"

@Table({
  freezeTableName: true
})
export default class Feedback extends Model {
  @ForeignKey(() => Users)
  @Column({
    allowNull: false,
    type: DataType.INTEGER
  })
  userId!: string

  @Column({
    allowNull: false,
    type: DataType.STRING
  })
  feedback!: string
}
