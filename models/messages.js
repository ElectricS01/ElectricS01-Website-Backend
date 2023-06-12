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
      userName: { type: DataTypes.STRING },
      messageContents: { type: DataTypes.TEXT },
      embeds: { type: DataTypes.JSON },
      edited: { type: DataTypes.BOOLEAN },
      reply: { type: DataTypes.INTEGER },
      chatId: { type: DataTypes.INTEGER },
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
