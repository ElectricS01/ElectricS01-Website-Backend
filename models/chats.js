"use strict"
const { Model } = require("sequelize")
const Users = require("./users")
const ChatAssociations = require("./chatAssociations")
module.exports = (sequelize, DataTypes) => {
  class Chats extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Chats.hasMany(models.ChatAssociations, {
        foreignKey: "chatId",
        as: "associations"
      })
      Chats.belongsTo(models.Users, {
        foreignKey: "owner",
        as: "ownerDetails"
      })
    }
  }
  Chats.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.STRING
      },
      icon: {
        type: DataTypes.STRING
      },
      owner: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: Users,
          key: "id"
        }
      },
      requireVerification: {
        type: DataTypes.BOOLEAN,
        allowNull: false
      },
      latest: {
        type: DataTypes.DATE,
        allowNull: false
      },
      type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      sequelize,
      modelName: "Chats"
    }
  )
  return Chats
}
