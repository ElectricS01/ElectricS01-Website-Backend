const { Model } = require("sequelize")
const { Users, Chats } = require("../models")

module.exports = (sequelize, DataTypes) => {
  class ChatAssociations extends Model {
    static associate(models) {
      ChatAssociations.belongsTo(models.Users, {
        foreignKey: "userId",
        as: "user"
      })
      ChatAssociations.belongsTo(models.Chats, {
        foreignKey: "chatId",
        as: "chat"
      })
    }
  }

  ChatAssociations.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: Users,
          key: "id"
        }
      },
      chatId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: Chats,
          key: "id"
        }
      }
    },
    {
      sequelize,
      modelName: "ChatAssociations"
    }
  )

  return ChatAssociations
}
