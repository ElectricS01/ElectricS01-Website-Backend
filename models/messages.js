import dayjs from 'dayjs';
"use strict"
const { Model } = require("sequelize")
module.exports = (sequelize, DataTypes) => {
  class Messages extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Messages.init(
    {
      userName: DataTypes.STRING,
      messageContents: DataTypes.STRING,
      createdAt: {
        allowNull: false,
        type: dayjs(this.date).format('HH:mm:ss DD/MM/YYYY')
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    },
    {
      sequelize,
      modelName: "Messages"
    }
  )
  return Messages
}
