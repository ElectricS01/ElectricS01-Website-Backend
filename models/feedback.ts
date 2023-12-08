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
    type: DataType.INTEGER,
    allowNull: false
  })
  userId!: string

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  feedback!: string
}
