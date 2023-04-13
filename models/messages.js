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
      Messages.belongsTo(models.Users, {
        as: "user",
        foreignKey: "userName"
      })
    }
  }
  Messages.init(
    {
      userName: DataTypes.STRING,
      messageContents: DataTypes.STRING,
      embeds: DataTypes.JSON,
      edited: DataTypes.BOOLEAN,
      reply: DataTypes.INTEGER,
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
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
