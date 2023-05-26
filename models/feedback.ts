import { Table, Column, Model, DataType } from "sequelize-typescript"

@Table({
  freezeTableName: true
})
export default class Feedback extends Model {
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  userID!: string

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  feedback!: string
}
